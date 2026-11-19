import json
import logging
import math
import random
import re
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import mastery, scheduling
from . import tiempo
from .escritura import corregir
from .bank import MAX_VALORES
from .importer import leer_solucion
from .models import Evento, Intento, Opcion, Pregunta, Sesion, utcnow

logger = logging.getLogger(__name__)
MODOS = {"practica", "repaso_subtema", "repaso_fallos"}
TIPOS = {
    "pregunta_mostrada", "opcion_seleccionada", "confianza", "respuesta_enviada", "explicacion_abierta",
    "explicacion_cerrada", "pregunta_reportada", "pausa", "reanudacion", "marcada_correcta", "pregunta_saltada",
    "ayuda_abierta", "contexto", "carga", "copia", "sesion_terminada",
}
# los únicos que puede enviar el navegador por su cuenta (el resto los registra el servidor)
TIPOS_CLIENTE = {"explicacion_cerrada", "explicacion_abierta", "ayuda_abierta", "contexto", "reanudacion", "carga", "copia"}
OBJETIVOS = (0.7,)  # D8: un solo objetivo (el sorteo 0,6/0,75/0,85 se retiró; el lote 1 no estaba desplegado)
MAX_PAYLOAD = 1000  # caracteres del JSON de un evento de cliente
TOLERANCIA_PROBLEMA = 0.01  # error relativo que cuenta como acierto en un problema
CONFIANZAS = {"seguro", "dudo", "adivino"}
LETRAS = ["a", "b", "c", "d"]
VERSION_APP = "0.1.0"


class UnknownSession(ValueError):
    pass


class AlreadyAnswered(ValueError):
    pass


@dataclass
class AnswerResult:
    correcta: bool
    opcion_correcta: str
    trampa: str | None
    solucion: float | list[float] | None = None  # solo problemas
    campos: list[dict] | None = None  # solo escritas: el resultado de cada campo


@dataclass
class SessionState:
    sesion_id: str
    modo: str
    filtro: dict
    respondidas: list[str] = field(default_factory=list)
    pendiente: str | None = None  # pregunta mostrada y aún sin responder


def _naive_utc(dt: datetime) -> datetime:
    return dt.astimezone(UTC).replace(tzinfo=None) if dt.tzinfo else dt


def _commit(session: Session) -> None:
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise


def _require_session(session: Session, sesion_id: str) -> Sesion:
    ses = session.get(Sesion, sesion_id)
    if ses is None:
        raise UnknownSession(f"sesión desconocida: {sesion_id}")
    return ses


def start_session(session: Session, modo: str, filtro: dict) -> str:
    if modo not in MODOS:
        raise ValueError(f"modo no válido: {modo}")
    filtro = {"objetivo": random.choice(OBJETIVOS), **filtro}  # experimento: acierto buscado, sorteado por sesión
    ses = Sesion(modo=modo, filtro=filtro, version_app=VERSION_APP, zona_horaria=time.tzname[0])
    session.add(ses)
    _commit(session)
    return ses.id


def record_event(session: Session, sesion_id: str, tipo: str, pregunta_id: str | None, payload: dict,
                 t_cliente: datetime) -> str:
    if tipo not in TIPOS:
        raise ValueError(f"tipo de evento no válido: {tipo}")
    _require_session(session, sesion_id)
    ev = Evento(sesion_id=sesion_id, tipo=tipo, pregunta_id=pregunta_id, payload=payload,
                t_cliente=_naive_utc(t_cliente))
    session.add(ev)
    _commit(session)
    return ev.id


def record_client_event(session: Session, sesion_id: str, tipo: str, pregunta_id: str | None, payload: dict) -> None:
    """Evento enviado por el navegador (señales de uso). `explicacion_cerrada` rellena el tiempo en la explicación."""
    if tipo not in TIPOS_CLIENTE:
        raise ValueError(f"tipo de evento no válido: {tipo}")
    if len(json.dumps(payload)) > MAX_PAYLOAD:
        raise ValueError("payload demasiado grande")
    if tipo == "explicacion_cerrada" and pregunta_id is not None and isinstance(payload.get("t"), (int, float)):
        i = session.scalar(select(Intento).where(Intento.sesion_id == sesion_id, Intento.pregunta_id == pregunta_id)
                           .order_by(Intento.id.desc()))
        if i is not None:
            i.t_explicacion = float(payload["t"])
    record_event(session, sesion_id, tipo, pregunta_id, payload, tiempo.ahora())


def error_relativo(valores: list[float], esperado: list[float], ordenada: bool) -> list[float] | None:
    """Error relativo firmado de cada valor (con solución 0, el error absoluto); None si no hay la misma cantidad."""
    if len(valores) != len(esperado):
        return None
    a, b = (valores, esperado) if ordenada else (sorted(valores), sorted(esperado))
    return [round((x - y) / abs(y) if y else x - y, 4) for x, y in zip(a, b)]


def _selection_path(session: Session, sesion_id: str, pregunta_id: str, elegida: str) -> list[str]:
    """Secuencia de opciones marcadas (sin repeticiones seguidas), acabando en la elegida."""
    marcadas = [e.payload.get("opcion") for e in session.scalars(
        select(Evento).where(Evento.sesion_id == sesion_id, Evento.pregunta_id == pregunta_id,
                             Evento.tipo == "opcion_seleccionada").order_by(Evento.id))]
    path: list[str] = []
    for letra in [*marcadas, elegida]:
        if letra in LETRAS and (not path or path[-1] != letra):
            path.append(letra)
    return path


_SUPERINDICES = str.maketrans("\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u207b", "0123456789-")
_SUPER = re.compile("10([\u2070\u00b9\u00b2\u00b3\u2074-\u2079\u207b]+)")
_POTENCIA = re.compile(r"(.*?)\s*(?:[\u00b7\u00d7x*]\s*)?10\s*\^\s*\(?\s*([+-]?\d+)\s*\)?", re.I)


def _notacion_cientifica(t: str) -> str:
    """2,24·10^22, 2,24x10^22, 2,24*10^22 y 2,24·10²² pasan a 2,24e22 (10^22 sola es 1e22)."""
    t = _SUPER.sub(lambda m: "10^" + m.group(1).translate(_SUPERINDICES), t)
    m = _POTENCIA.fullmatch(t)
    if not m:
        return t
    return f"{m.group(1).strip() or '1'}e{m.group(2)}"


def parse_numero(texto: str) -> float:
    """Un número escrito por la alumna: coma decimal, espacios, exponente (6,022e23 o 6,022·10^23), fracción (3/4) y signo menos Unicode."""
    t = _notacion_cientifica(texto.strip().replace("\u2212", "-")).replace(" ", "").replace(",", ".")
    try:
        num, barra, den = t.partition("/")
        v = float(num) / float(den) if barra else float(num)
    except (ValueError, ZeroDivisionError):
        raise ValueError(f"respuesta no numérica: {texto!r}") from None
    if not math.isfinite(v):
        raise ValueError(f"respuesta no numérica: {texto!r}")
    return v


def parse_respuesta(texto: str) -> list[float]:
    """Uno o varios números separados por «;» o por « y » (1; 4, o 1 y 4)."""
    partes = [p for p in re.split(r";|\sy\s", texto.strip()) if p.strip()]
    if not 1 <= len(partes) <= MAX_VALORES:
        raise ValueError(f"respuesta no válida: {texto!r}")
    return [parse_numero(p) for p in partes]


def coincide(valores: list[float], esperado: list[float], ordenada: bool) -> bool:
    """¿Coinciden los valores con la solución (margen del 1 %)? Sin orden se comparan ordenados."""
    if len(valores) != len(esperado):
        return False
    a, b = (valores, esperado) if ordenada else (sorted(valores), sorted(esperado))
    return all(math.isclose(x, y, rel_tol=TOLERANCIA_PROBLEMA, abs_tol=1e-9) for x, y in zip(a, b))


def submit_answer(session: Session, sesion_id: str, pregunta_id: str, orden_opciones: list[str], elegida: str,
                  confianza: str | None, tiempos: dict, respuesta: str | None = None,
                  respuestas: list[str] | None = None) -> AnswerResult:
    _require_session(session, sesion_id)
    pregunta = session.get(Pregunta, pregunta_id)
    if pregunta is None:
        raise ValueError(f"pregunta desconocida: {pregunta_id}")
    problema = pregunta.tipo == "problema"
    escrita = pregunta.tipo == "escrita"
    if escrita:
        if respuestas is None:
            raise ValueError("una pregunta escrita se responde con texto")
        elegida, orden_opciones = "a", []
    elif problema:
        if respuesta is None:
            raise ValueError("un problema se responde con un número")
        valores = parse_respuesta(respuesta)
        elegida, orden_opciones = "a", []
    else:
        letras = LETRAS[:2] if pregunta.tipo == "vf" else LETRAS
        if elegida not in letras or sorted(orden_opciones) != letras:
            raise ValueError("opción elegida u orden de opciones no válidos")
    if confianza is not None and confianza not in CONFIANZAS:
        raise ValueError(f"confianza no válida: {confianza}")
    previos_sesion = session.scalars(select(Intento.correcta).where(
        Intento.sesion_id == sesion_id, Intento.pregunta_id == pregunta_id).order_by(Intento.id)).all()
    # una escrita fallada puede repetirse una vez en la misma sesión (corrección activa); cualquier otra, no
    if previos_sesion and (previos_sesion[-1] or len(previos_sesion) >= 2 or not escrita):
        raise AlreadyAnswered("pregunta ya respondida en esta sesión")

    opciones = {o.posicion: o for o in session.scalars(select(Opcion).where(Opcion.pregunta_id == pregunta_id))}
    correcta_letra = next(l for l, o in opciones.items() if o.correcta)
    solucion, ordenada = leer_solucion(opciones["a"].texto) if problema else (None, False)
    detalle = None
    if escrita:
        es_correcta, detalle = corregir(json.loads(opciones["a"].texto), respuestas, pregunta.enunciado)
    elif problema:
        es_correcta = coincide(valores, solucion if isinstance(solucion, list) else [solucion], ordenada)
    else:
        es_correcta = elegida == correcta_letra
    trampa = None if es_correcta or problema or escrita else opciones[elegida].tipo_trampa

    path = ["a"] if problema or escrita else _selection_path(session, sesion_id, pregunta_id, elegida)
    previos = session.scalars(
        select(Intento).where(Intento.concepto_id == pregunta.concepto_id).order_by(Intento.id.desc())).all()
    ahora, ahora_utc = tiempo.ahora(), utcnow()

    ev = Evento(sesion_id=sesion_id, tipo="respuesta_enviada", pregunta_id=pregunta_id, t_cliente=ahora_utc,
                payload={"elegida": elegida, "orden_opciones": orden_opciones, "confianza": confianza,
                         "tiempos": tiempos, "correcta": es_correcta,
                         **({"respuesta": respuesta,
                             "error_rel": error_relativo(valores, solucion if isinstance(solucion, list) else [solucion],
                                                         ordenada)} if problema else {}),
                         **({"respuestas": respuestas,
                             "detalle": [{"etiqueta": d["etiqueta"], "correcto": d["correcto"], "nota": d["nota"]}
                                         for d in detalle]} if escrita else {})})
    session.add(ev)
    session.flush()
    intento = Intento(
        evento_id=ev.id, sesion_id=sesion_id, pregunta_id=pregunta_id, concepto_id=pregunta.concepto_id,
        opcion_inicial=path[0], opcion_final=elegida, n_cambios=len(path) - 1, orden_opciones=orden_opciones,
        trampa_elegida=trampa, correcta=es_correcta, confianza=confianza,
        t_primer_clic=tiempos.get("t_primer_clic"), t_envio=tiempos.get("t_envio"),
        t_explicacion=tiempos.get("t_explicacion"), hora_dia=ahora.hour, dia_semana=ahora.weekday(),
        posicion_sesion=session.scalar(select(func.count()).select_from(Intento).where(
            Intento.sesion_id == sesion_id)) + 1,
        n_intento_previo=len(previos),
        intervalo_desde_anterior=(ahora_utc - previos[0].created_at).total_seconds() if previos else None,
        dificultad=pregunta.dificultad_base,
    )
    session.add(intento)
    session.flush()
    intento_id = intento.id
    _commit(session)  # la respuesta queda guardada antes de calcular nada derivado
    try:
        mastery.apply_attempt(session, intento)
        scheduling.apply_attempt(session, intento)
        session.commit()
    except Exception:
        session.rollback()  # dominio y FSRS son reconstruibles (mastery.rebuild, scheduling.rebuild)
        logger.exception("no se pudo actualizar el dominio tras la respuesta %s", intento_id)
    return AnswerResult(correcta=es_correcta, opcion_correcta=correcta_letra, trampa=trampa, solucion=solucion,
                        campos=detalle)


def skip_question(session: Session, sesion_id: str, pregunta_id: str) -> None:
    """La alumna salta la pregunta: no es un intento ni cuenta en el dominio; el selector la vuelve a servir más tarde."""
    if session.get(Pregunta, pregunta_id) is None:
        raise ValueError(f"pregunta desconocida: {pregunta_id}")
    if session.scalar(select(Intento.id).where(Intento.sesion_id == sesion_id, Intento.pregunta_id == pregunta_id)):
        raise AlreadyAnswered("pregunta ya respondida en esta sesión")
    record_event(session, sesion_id, "pregunta_saltada", pregunta_id, {}, tiempo.ahora())


def finish_session(session: Session, sesion_id: str) -> dict:
    """Cierra la sesión (al pulsar Terminar o al cerrar la pestaña): guarda `fin` y, la primera vez, un evento con las
    respondidas y las abandonadas (mostradas sin respuesta ni salto). Repetirlo solo actualiza `fin`."""
    ses = _require_session(session, sesion_id)
    eventos = session.execute(select(Evento.tipo, Evento.pregunta_id).where(
        Evento.sesion_id == sesion_id, Evento.tipo.in_(["pregunta_mostrada", "respuesta_enviada", "pregunta_saltada"]))
        .order_by(Evento.id)).all()
    pendientes: set[str] = set()
    respondidas = 0
    for tipo, pid in eventos:
        if tipo == "pregunta_mostrada":
            pendientes.add(pid)
        else:
            pendientes.discard(pid)
            respondidas += tipo == "respuesta_enviada"
    resultado = {"respondidas": respondidas, "abandonadas": len(pendientes)}
    ses.fin = utcnow()
    if session.scalar(select(Evento.id).where(Evento.sesion_id == sesion_id, Evento.tipo == "sesion_terminada")) is None:
        session.add(Evento(sesion_id=sesion_id, tipo="sesion_terminada", pregunta_id=None, t_cliente=ses.fin, payload=resultado))
    _commit(session)
    return resultado


def mark_correct(session: Session, sesion_id: str, pregunta_id: str) -> None:
    """«Lo he hecho bien»: da por acertado un problema que el margen automático rechazó, y recalcula el dominio."""
    pregunta = session.get(Pregunta, pregunta_id)
    if pregunta is None or pregunta.tipo != "problema":
        raise ValueError("solo se puede marcar como correcto un problema")
    intento = session.scalar(select(Intento).where(Intento.sesion_id == sesion_id, Intento.pregunta_id == pregunta_id))
    if intento is None:
        raise ValueError("el problema no se ha respondido en esta sesión")
    if intento.correcta:
        return
    intento.correcta = True
    session.flush()
    record_event(session, sesion_id, "marcada_correcta", pregunta_id, {}, tiempo.ahora())
    mastery.rebuild(session, intento.concepto_id)
    scheduling.rebuild(session, intento.concepto_id)
    _commit(session)


def resume_session(session: Session, sesion_id: str) -> SessionState:
    ses = _require_session(session, sesion_id)
    respondidas = list(session.scalars(
        select(Intento.pregunta_id).where(Intento.sesion_id == sesion_id).order_by(Intento.id)))
    ultima = session.scalar(select(Evento.pregunta_id).where(
        Evento.sesion_id == sesion_id, Evento.tipo == "pregunta_mostrada").order_by(Evento.id.desc()).limit(1))
    pendiente = ultima if ultima and ultima not in respondidas else None
    return SessionState(sesion_id=sesion_id, modo=ses.modo, filtro=ses.filtro, respondidas=respondidas,
                        pendiente=pendiente)
