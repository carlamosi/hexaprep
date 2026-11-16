"""Dominio por concepto: actualización bayesiana aproximada (Laplace) sobre un modelo logístico 1PL.

theta es la habilidad (0 = punto medio), sigma su incertidumbre. La dificultad 3 es neutra y cada
punto de dificultad desplaza el umbral 0.8 unidades.
"""
import math
from datetime import date
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


def update(theta: float, sigma: float, dificultad: int, correcta: bool, tipo: str | None = None) -> tuple[float, float]:
    """Un paso del modelo logístico con azar (3PL con acierto mínimo g): un acierto en test o V/F enseña menos."""
    g = ACIERTO_AZAR.get(tipo, 0.0)
    q = sigmoid(theta - (dificultad - 3) * DIFF_SCALE)
    p = g + (1 - g) * q
    pq = max(p * (1 - p), 1e-9)
    dp = (1 - g) * q * (1 - q)
    var = 1 / (1 / sigma**2 + dp * dp / pq)
    return theta + STEP * var * ((1.0 if correcta else 0.0) - p) * dp / pq, max(SIGMA_MIN, math.sqrt(var))


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


def progreso(theta: float, sigma: float) -> float:
    """Progreso real de un concepto (0 a 1): competencia por evidencia. Con pocas respuestas casi no cuenta."""
    return competencia(theta) * evidencia(sigma)


def percent_concepto(theta: float, sigma: float) -> int:
    return round(100 * progreso(theta, sigma))


def _dominio(session: Session, concepto_id: str) -> Dominio:
    dom = session.scalar(select(Dominio).where(Dominio.concepto_id == concepto_id))
    if dom is None:
        dom = Dominio(concepto_id=concepto_id, theta=0.0, sigma=SIGMA0, n_intentos=0, racha=0, tendencia=0.0)
        session.add(dom)
        session.flush()
    return dom


def rebuild(session: Session, concepto_id: str) -> Dominio:
    """Reconstruye el dominio de un concepto repitiendo sus intentos (sin los de preguntas excluidas)."""
    dom = _dominio(session, concepto_id)
    rows = session.execute(
        select(Intento.correcta, Intento.dificultad, Pregunta.tipo).join(Pregunta, Pregunta.id == Intento.pregunta_id)
        .where(Intento.concepto_id == concepto_id, Pregunta.excluida.is_(False), Intento.deleted_at.is_(None))
        .order_by(Intento.id)).all()
    theta, sigma, racha, history = 0.0, SIGMA0, 0, [0.0]
    for correcta, dificultad, tipo in rows:
        theta, sigma = update(theta, sigma, dificultad, correcta, tipo)
        racha = racha + 1 if correcta else 0
        history.append(theta)
    dom.theta, dom.sigma, dom.n_intentos, dom.racha = theta, sigma, len(rows), racha
    dom.tendencia = theta - history[max(0, len(history) - 6)]
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
    return list(session.scalars(q.where(Concepto.deleted_at.is_(None))))


def aggregate(session: Session, nivel: Literal["subtema", "tema", "asignatura"], id: str) -> float:
    """theta medio de los conceptos con intentos (los demás no cuentan). 0.0 si ninguno tiene intentos."""
    ids = _concept_ids(session, nivel, id)
    thetas = list(session.scalars(select(Dominio.theta).where(Dominio.concepto_id.in_(ids), Dominio.n_intentos > 0)))
    return sum(thetas) / len(thetas) if thetas else 0.0


def percent_of(session: Session, nivel: Literal["subtema", "tema", "asignatura"], id: str) -> int:
    """Porcentaje mostrado: progreso medio sobre TODOS los conceptos del nivel (los no tocados cuentan 0)."""
    ids = _concept_ids(session, nivel, id)
    filas = session.execute(select(Dominio.theta, Dominio.sigma).where(
        Dominio.concepto_id.in_(ids), Dominio.n_intentos > 0)).all()
    return round(100 * sum(progreso(t, s) for t, s in filas) / len(ids)) if ids else 0


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
