"""Dominio por concepto: actualización bayesiana aproximada (Laplace) sobre un modelo logístico 1PL.

theta es la habilidad (0 = punto medio), sigma su incertidumbre. La dificultad 3 es neutra y cada
punto de dificultad desplaza el umbral 0.8 unidades.
"""
import math
from datetime import date, datetime
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    Asignatura, Bloque, Concepto, Dominio, DominioSnapshot, Intento, Pregunta, Subtema, Tema,
)

SIGMA0 = 1.5
SIGMA_MIN = 0.3
STEP = 0.5  # amortigua cada actualización para que una sola pregunta no dispare el porcentaje
DIFF_SCALE = 0.8


def sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))


# Acierto sin saber, por debajo del azar puro (0,25 y 0,5): quien contesta casi nunca adivina a ciegas, descarta
# opciones con lo que sabe, y un descuento total desanima sin que haga falta. Un problema numérico o una respuesta
# escrita casi nunca se aciertan por casualidad. Sin tipo (o con otro) no se supone azar.
ACIERTO_AZAR = {"test": 0.15, "vf": 0.3}


def expected_correct(theta: float, dificultad: int, tipo: str | None = None) -> float:
    g = ACIERTO_AZAR.get(tipo, 0.0)
    return g + (1 - g) * sigmoid(theta - (dificultad - 3) * DIFF_SCALE)


# Evidencia distribuida (D5): repetir un concepto en minutos no es evidencia independiente (el reaprendizaje sucesivo fija
# menos que el espaciado, Rawson y Dunlosky). Cada repetición del concepto en la misma sesión pesa REPETICION veces la
# anterior (1; 0,6; 0,36...) y el reintento de la corrección activa (acierta el 84 % porque acaba de ver la respuesta) pesa
# PESO_REINTENTO. Efecto medido: ver «D5» en docs/ESTADO.md.
REPETICION = 0.6
PESO_REINTENTO = 0.3
# «Consolidado» exige aciertos en al menos 3 días distintos: antes, el progreso de un concepto se topa en esta fracción.
TOPE_POR_DIAS = {0: 0.0, 1: 0.5, 2: 0.75}


def peso_intento(previos_en_sesion: int, reintento: bool) -> float:
    return PESO_REINTENTO if reintento else REPETICION ** previos_en_sesion


def update(theta: float, sigma: float, dificultad: int, correcta: bool, tipo: str | None = None,
           peso: float = 1.0) -> tuple[float, float]:
    """Un paso del modelo logístico con azar (3PL con acierto mínimo g): un acierto en test o V/F enseña menos."""
    g = ACIERTO_AZAR.get(tipo, 0.0)
    q = sigmoid(theta - (dificultad - 3) * DIFF_SCALE)
    p = g + (1 - g) * q
    pq = max(p * (1 - p), 1e-9)
    dp = (1 - g) * q * (1 - q)
    var = 1 / (1 / sigma**2 + peso * dp * dp / pq)
    return theta + STEP * var * peso * ((1.0 if correcta else 0.0) - p) * dp / pq, max(SIGMA_MIN, math.sqrt(var))


def percent(theta: float) -> int:
    """Probabilidad de acertar una pregunta neutra (no es progreso: eso es `percent_concepto` y `percent_of`)."""
    return round(100 * sigmoid(theta))


N_PLENO = 5  # respuestas de dificultad neutra con las que un concepto cuenta con toda su evidencia


def evidencia(sigma: float) -> float:
    """Cuánta evidencia hay (0 a 1), leída de la incertidumbre: cada respuesta neutra suma 0,25 a 1/sigma²."""
    return min(1.0, max(0.0, (1 / sigma**2 - 1 / SIGMA0**2) / (0.25 * N_PLENO)))


def competencia(theta: float) -> float:
    """0 si no se acierta más de lo esperado en una pregunta neutra; tiende a 1 si se acierta con solidez."""
    return max(0.0, 2 * sigmoid(theta) - 1)


def progreso(theta: float, sigma: float, dias_acierto: int | None = None) -> float:
    """Progreso real de un concepto (0 a 1): competencia por evidencia. Con pocas respuestas casi no cuenta.
    Con `dias_acierto` (días distintos con aciertos) se aplica el tope de «consolidado»; sin él, no."""
    p = competencia(theta) * evidencia(sigma)
    return p if dias_acierto is None else min(p, TOPE_POR_DIAS.get(dias_acierto, 1.0))


def percent_concepto(theta: float, sigma: float, dias_acierto: int | None = None) -> int:
    return round(100 * progreso(theta, sigma, dias_acierto))


def percent_de(session: Session, dom: Dominio) -> int:
    """Porcentaje mostrado de un concepto, con el tope de «consolidado»."""
    return percent_concepto(dom.theta, dom.sigma, dias_acierto(session, [dom.concepto_id]).get(dom.concepto_id, 0))


def dias_acierto(session: Session, concepto_ids: list[str], excluir_sesion: str | None = None) -> dict[str, int]:
    """Días distintos con algún acierto por concepto (sin intentos de preguntas excluidas)."""
    fechas: dict[str, set] = {}
    for cid, creado in session.execute(
            select(Intento.concepto_id, Intento.created_at).join(Pregunta, Pregunta.id == Intento.pregunta_id)
            .where(Intento.concepto_id.in_(concepto_ids), Intento.correcta.is_(True), Intento.deleted_at.is_(None),
                   Pregunta.excluida.is_(False), Intento.sesion_id != (excluir_sesion or ""))):
        fechas.setdefault(cid, set()).add(creado.date())
    return {c: len(f) for c, f in fechas.items()}


def _dominio(session: Session, concepto_id: str) -> Dominio:
    dom = session.scalar(select(Dominio).where(Dominio.concepto_id == concepto_id))
    if dom is None:
        dom = Dominio(concepto_id=concepto_id, theta=0.0, sigma=SIGMA0, n_intentos=0, racha=0, tendencia=0.0)
        session.add(dom)
        session.flush()
    return dom


def reconstruir(session: Session, concepto_id: str, excluir_sesion: str | None = None,
                hasta: datetime | None = None) -> tuple[float, float, int, int, float]:
    """Dominio de un concepto repitiendo sus intentos (sin los de preguntas excluidas), sin escribir nada:
    (theta, sigma, n_intentos, racha, tendencia). Con `hasta` solo cuentan los intentos anteriores a ese instante."""
    rows = session.execute(
        select(Intento.correcta, Intento.dificultad, Pregunta.tipo, Intento.sesion_id, Intento.pregunta_id)
        .join(Pregunta, Pregunta.id == Intento.pregunta_id)
        .where(Intento.concepto_id == concepto_id, Pregunta.excluida.is_(False), Intento.deleted_at.is_(None),
               Intento.sesion_id != (excluir_sesion or ""), Intento.created_at < (hasta or datetime.max))
        .order_by(Intento.id)).all()
    theta, sigma, racha, history = 0.0, SIGMA0, 0, [0.0]
    en_sesion: dict[str, int] = {}
    vistas: set[tuple[str, str]] = set()
    for correcta, dificultad, tipo, sesion, pregunta in rows:
        reintento = (sesion, pregunta) in vistas
        vistas.add((sesion, pregunta))
        peso = peso_intento(en_sesion.get(sesion, 0), reintento)
        en_sesion[sesion] = en_sesion.get(sesion, 0) + 1
        theta, sigma = update(theta, sigma, dificultad, correcta, tipo, peso)
        racha = racha + 1 if correcta else 0
        history.append(theta)
    return theta, sigma, len(rows), racha, theta - history[max(0, len(history) - 6)]


def rebuild(session: Session, concepto_id: str) -> Dominio:
    """Reconstruye el dominio de un concepto repitiendo sus intentos (sin los de preguntas excluidas)."""
    dom = _dominio(session, concepto_id)
    dom.theta, dom.sigma, dom.n_intentos, dom.racha, dom.tendencia = reconstruir(session, concepto_id)
    session.flush()
    return dom


def apply_attempt(session: Session, intento: Intento) -> None:
    """Llamado por submit_answer dentro de su transacción: actualiza el dominio y anota antes/después."""
    dom = _dominio(session, intento.concepto_id)
    intento.dominio_antes = dom.theta
    rebuild(session, intento.concepto_id)
    intento.dominio_despues = dom.theta


def _concept_ids(session: Session, nivel: Literal["subtema", "tema", "asignatura"], id: str) -> list[str]:
    q = select(Concepto.id).join(Subtema, Subtema.id == Concepto.subtema_id)
    if nivel == "subtema":
        q = q.where(Subtema.id == id)
    elif nivel == "tema":
        q = q.where(Subtema.tema_id == id)
    else:
        q = (q.join(Tema, Tema.id == Subtema.tema_id).join(Bloque, Bloque.id == Tema.bloque_id)
             .join(Asignatura, Asignatura.id == Bloque.asignatura_id).where(Asignatura.id == id))
    # un concepto con todas sus preguntas fuera (reportadas u ocultas) no cuenta en el porcentaje
    todas_fuera = (select(Pregunta.id).where(Pregunta.concepto_id == Concepto.id, Pregunta.es_actual.is_(True),
                                              Pregunta.excluida.is_(True)).exists()
                   & ~select(Pregunta.id).where(Pregunta.concepto_id == Concepto.id, Pregunta.es_actual.is_(True),
                                                Pregunta.excluida.is_(False)).exists())
    return list(session.scalars(q.where(Concepto.deleted_at.is_(None), ~todas_fuera)))


def aggregate(session: Session, nivel: Literal["subtema", "tema", "asignatura"], id: str) -> float:
    """theta medio de los conceptos con intentos (los demás no cuentan). 0.0 si ninguno tiene intentos."""
    ids = _concept_ids(session, nivel, id)
    thetas = list(session.scalars(select(Dominio.theta).where(Dominio.concepto_id.in_(ids), Dominio.n_intentos > 0)))
    return sum(thetas) / len(thetas) if thetas else 0.0


def percent_of(session: Session, nivel: Literal["subtema", "tema", "asignatura"], id: str) -> int:
    """Porcentaje mostrado: progreso medio sobre TODOS los conceptos del nivel (los no tocados cuentan 0)."""
    ids = _concept_ids(session, nivel, id)
    filas = session.execute(select(Dominio.concepto_id, Dominio.theta, Dominio.sigma).where(
        Dominio.concepto_id.in_(ids), Dominio.n_intentos > 0)).all()
    dias = dias_acierto(session, [f[0] for f in filas])
    return round(100 * sum(progreso(t, s, dias.get(c, 0)) for c, t, s in filas) / len(ids)) if ids else 0


def snapshot_daily(session: Session, fecha: date) -> None:
    iso = fecha.isoformat()
    for dom in session.scalars(select(Dominio).where(Dominio.n_intentos > 0)):
        snap = session.scalar(select(DominioSnapshot).where(
            DominioSnapshot.concepto_id == dom.concepto_id, DominioSnapshot.fecha == iso))
        if snap is None:
            session.add(DominioSnapshot(concepto_id=dom.concepto_id, fecha=iso, theta=dom.theta, sigma=dom.sigma))
        else:
            snap.theta, snap.sigma = dom.theta, dom.sigma
    session.commit()
