"""Repetición espaciada FSRS (un estado por concepto) y sugerencias de qué repasar."""
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal

from fsrs import Card, Rating, Scheduler
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .mastery import expected_correct, sigmoid, update
from .models import Concepto, Dominio, Intento, Pregunta

# Sin pasos de aprendizaje: las sesiones son libres, el primer intervalo ya es de días.
_SCHEDULER = Scheduler(learning_steps=(), relearning_steps=(), enable_fuzzing=False)
SECONDS_PER_QUESTION = 60.0


def _aware(dt: datetime) -> datetime:
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)


def _naive(dt: datetime) -> datetime:
    return dt.astimezone(UTC).replace(tzinfo=None) if dt.tzinfo else dt


def rate(correcta: bool, confianza: str | None) -> Rating:
    if not correcta:
        return Rating.Again
    return Rating.Hard if confianza in ("dudo", "adivino") else Rating.Good


def schedule(card_state: dict | None, rating: Rating, now: datetime) -> dict:
    card = Card.from_dict(card_state) if card_state else Card()
    card, _ = _SCHEDULER.review_card(card, rating, _aware(now))
    return card.to_dict()


def _retrievability(state: dict | None, now: datetime) -> float | None:
    if not state:
        return None
    return _SCHEDULER.get_card_retrievability(Card.from_dict(state), _aware(now))


def _store(dom: Dominio, state: dict | None) -> None:
    dom.fsrs_state = state
    dom.proximo_repaso = _naive(datetime.fromisoformat(state["due"])) if state else None


def apply_attempt(session: Session, intento: Intento) -> None:
    """Llamado por submit_answer dentro de su transacción."""
    if session.get(Pregunta, intento.pregunta_id).excluida:
        return
    dom = session.scalar(select(Dominio).where(Dominio.concepto_id == intento.concepto_id))
    _store(dom, schedule(dom.fsrs_state, rate(intento.correcta, intento.confianza), intento.created_at))
    session.flush()


def rebuild(session: Session, concepto_id: str) -> None:
    """Reconstruye el estado FSRS de un concepto repitiendo sus intentos no excluidos."""
    dom = session.scalar(select(Dominio).where(Dominio.concepto_id == concepto_id))
    rows = session.scalars(
        select(Intento).join(Pregunta, Pregunta.id == Intento.pregunta_id)
        .where(Intento.concepto_id == concepto_id, Pregunta.excluida.is_(False), Intento.deleted_at.is_(None))
        .order_by(Intento.id)).all()
    state = None
    for i in rows:
        state = schedule(state, rate(i.correcta, i.confianza), i.created_at)
    _store(dom, state)
    session.flush()


@dataclass
class Suggestion:
    tipo: Literal["concepto", "placement"]
    concepto_id: str | None
    concepto: str | None
    subtema_id: str | None
    motivo: str
    ganancia_por_minuto: float
    riesgo_olvido: float
    score: float


def _gain_per_minute(dom: Dominio, dificultad: float, segundos: float) -> float:
    """Aumento esperado del porcentaje de dominio por minuto al acertar una pregunta del nivel adecuado."""
    p = expected_correct(dom.theta, round(dificultad))
    theta_up, _ = update(dom.theta, dom.sigma, round(dificultad), True)
    return p * 100 * (sigmoid(theta_up) - sigmoid(dom.theta)) * 60.0 / segundos


def suggestions(session: Session, now: datetime, n: int = 5) -> list[Suggestion]:
    doms = session.scalars(select(Dominio).where(Dominio.n_intentos > 0)).all()
    if not doms:
        return [Suggestion("placement", None, None, None, "Haz el test de nivel para empezar", 0.0, 0.0, 0.0)]
    dom_by_concept = {d.concepto_id: d for d in doms}
    avg_secs = {c: s for c, s in session.execute(
        select(Intento.concepto_id, func.avg(Intento.t_envio))
        .where(Intento.t_envio.is_not(None)).group_by(Intento.concepto_id)).all() if s}
    dificultad = dict(session.execute(
        select(Pregunta.concepto_id, func.avg(Pregunta.dificultad_base))
        .where(Pregunta.es_actual.is_(True), Pregunta.activa.is_(True), Pregunta.excluida.is_(False))
        .group_by(Pregunta.concepto_id)).all())
    nombres = {c.id: c for c in session.scalars(select(Concepto).where(Concepto.id.in_(dom_by_concept)))}

    rows = []
    for cid, dom in dom_by_concept.items():
        if cid not in dificultad:  # sin preguntas activas
            continue
        gain = _gain_per_minute(dom, dificultad[cid], avg_secs.get(cid, SECONDS_PER_QUESTION))
        retr = _retrievability(dom.fsrs_state, now)
        riesgo = 0.0 if retr is None else 1 - retr
        rows.append((dom, gain, riesgo))
    if not rows:
        return []
    max_gain = max(g for _, g, _ in rows) or 1.0
    out = []
    for dom, gain, riesgo in rows:
        score = 0.5 * gain / max_gain + 0.5 * riesgo
        if riesgo >= 0.3:
            motivo = "Hace tiempo que no lo repasas y se te puede olvidar"
        elif dom.sigma > 0.9:
            motivo = "Aún tienes pocos datos de este concepto"
        elif dom.theta < 0:
            motivo = "Lo dominas poco y mejorarlo rinde mucho"
        else:
            motivo = "Es donde más subirá tu dominio por minuto"
        c = nombres[dom.concepto_id]
        out.append(Suggestion("concepto", c.id, c.nombre, c.subtema_id, motivo, gain, riesgo, score))
    out.sort(key=lambda s: s.score, reverse=True)
    return out[:n]
