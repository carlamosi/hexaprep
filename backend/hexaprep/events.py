import logging
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import mastery, scheduling
from .models import Evento, Intento, Opcion, Pregunta, Sesion, utcnow

logger = logging.getLogger(__name__)
MODOS = {"nivel", "practica", "repaso_subtema", "repaso_fallos"}
TIPOS = {
    "pregunta_mostrada", "opcion_seleccionada", "confianza", "respuesta_enviada", "explicacion_abierta",
    "explicacion_cerrada", "pregunta_reportada", "pausa", "reanudacion",
}
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


def submit_answer(session: Session, sesion_id: str, pregunta_id: str, orden_opciones: list[str], elegida: str,
                  confianza: str | None, tiempos: dict) -> AnswerResult:
    _require_session(session, sesion_id)
    pregunta = session.get(Pregunta, pregunta_id)
    if pregunta is None:
        raise ValueError(f"pregunta desconocida: {pregunta_id}")
    if elegida not in LETRAS or sorted(orden_opciones) != LETRAS:
        raise ValueError("opción elegida u orden de opciones no válidos")
    if confianza is not None and confianza not in CONFIANZAS:
        raise ValueError(f"confianza no válida: {confianza}")
    if session.scalar(select(Intento.id).where(Intento.sesion_id == sesion_id, Intento.pregunta_id == pregunta_id)):
        raise AlreadyAnswered("pregunta ya respondida en esta sesión")

    opciones = {o.posicion: o for o in session.scalars(select(Opcion).where(Opcion.pregunta_id == pregunta_id))}
    correcta_letra = next(l for l, o in opciones.items() if o.correcta)
    es_correcta = elegida == correcta_letra
    trampa = None if es_correcta else opciones[elegida].tipo_trampa

    path = _selection_path(session, sesion_id, pregunta_id, elegida)
    previos = session.scalars(
        select(Intento).where(Intento.concepto_id == pregunta.concepto_id).order_by(Intento.id.desc())).all()
    ahora, ahora_utc = datetime.now(), utcnow()

    ev = Evento(sesion_id=sesion_id, tipo="respuesta_enviada", pregunta_id=pregunta_id, t_cliente=ahora_utc,
                payload={"elegida": elegida, "orden_opciones": orden_opciones, "confianza": confianza,
                         "tiempos": tiempos, "correcta": es_correcta})
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
    return AnswerResult(correcta=es_correcta, opcion_correcta=correcta_letra, trampa=trampa)


def resume_session(session: Session, sesion_id: str) -> SessionState:
    ses = _require_session(session, sesion_id)
    respondidas = list(session.scalars(
        select(Intento.pregunta_id).where(Intento.sesion_id == sesion_id).order_by(Intento.id)))
    ultima = session.scalar(select(Evento.pregunta_id).where(
        Evento.sesion_id == sesion_id, Evento.tipo == "pregunta_mostrada").order_by(Evento.id.desc()).limit(1))
    pendiente = ultima if ultima and ultima not in respondidas else None
    return SessionState(sesion_id=sesion_id, modo=ses.modo, filtro=ses.filtro, respondidas=respondidas,
                        pendiente=pendiente)
