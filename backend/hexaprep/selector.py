import random
import warnings
from collections import defaultdict
from dataclasses import dataclass

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from .mastery import SIGMA0, expected_correct
from .models import Asignatura, Bloque, Concepto, Dominio, Intento, Opcion, Pregunta, Subtema, Tema

TARGET = 0.75
PLACEMENT_SIZE = 15
FAIL_GAP = 2  # respuestas intermedias antes de reintroducir un concepto fallado (siempre dentro de 5)
SEEN_PENALTY = 0.15


class PlacementWarning(UserWarning):
    pass


@dataclass
class Filtro:
    asignatura_id: str
    tema_id: str | None = None
    subtema_id: str | None = None
    solo_fallos: bool = False


@dataclass
class OpcionOut:
    letra: str  # letra original de la opción; la posición en pantalla la da el orden de la lista
    texto: str


@dataclass
class QuestionOut:
    pregunta_id: str
    concepto_id: str
    subtema_id: str
    enunciado: str
    opciones: list[OpcionOut]
    orden: list[str]
    dificultad: int
    ayuda_larga: str | None
    fuente_id: str | None
    fuente_pagina: int | None
    fuente_cara: int | None
    tema: str = ""
    subtema: str = ""
    tipo: str = "test"


def _candidates(filtro: Filtro) -> Select:
    q = (select(Pregunta, Concepto.subtema_id)
         .join(Concepto, Concepto.id == Pregunta.concepto_id)
         .join(Subtema, Subtema.id == Concepto.subtema_id)
         .join(Tema, Tema.id == Subtema.tema_id)
         .join(Bloque, Bloque.id == Tema.bloque_id)
         .where(Bloque.asignatura_id == filtro.asignatura_id, Pregunta.es_actual.is_(True),
                Pregunta.activa.is_(True), Pregunta.excluida.is_(False), Pregunta.deleted_at.is_(None),
                Concepto.deleted_at.is_(None)))
    if filtro.tema_id:
        q = q.where(Tema.id == filtro.tema_id)
    if filtro.subtema_id:
        q = q.where(Subtema.id == filtro.subtema_id)
    return q


def _to_out(session: Session, p: Pregunta, subtema_id: str, rng: random.Random) -> QuestionOut:
    sub = session.get(Subtema, subtema_id)
    textos = {o.posicion: o.texto for o in session.scalars(select(Opcion).where(Opcion.pregunta_id == p.id))}
    if p.tipo == "problema":
        textos = {}  # la solución no sale del servidor hasta que se responde
    orden = sorted(textos)
    rng.shuffle(orden)
    return QuestionOut(
        pregunta_id=p.id, concepto_id=p.concepto_id, subtema_id=subtema_id, enunciado=p.enunciado,
        opciones=[OpcionOut(l, textos[l]) for l in orden], orden=orden, dificultad=p.dificultad_base,
        ayuda_larga=p.ayuda_larga, fuente_id=p.fuente_id, fuente_pagina=p.fuente_pagina, fuente_cara=p.fuente_cara,
        tema=session.get(Tema, sub.tema_id).nombre, subtema=sub.nombre, tipo=p.tipo)


def _seen_counts(session: Session) -> dict[str, int]:
    """Veces que se respondió cada pregunta (por clave, de cualquier versión)."""
    rows = session.execute(select(Pregunta.clave, func.count()).join(Intento, Intento.pregunta_id == Pregunta.id)
                           .group_by(Pregunta.clave)).all()
    return dict(rows)


def next_question(session: Session, sesion_id: str, filtro: Filtro, rng: random.Random | None = None
                  ) -> QuestionOut | None:
    rng = rng or random.Random()
    answered = session.execute(
        select(Intento.pregunta_id, Intento.correcta, Intento.concepto_id).where(Intento.sesion_id == sesion_id)
        .order_by(Intento.id)).all()
    answered_ids = {a[0] for a in answered}
    cands = [(p, sub) for p, sub in session.execute(_candidates(filtro)).all() if p.id not in answered_ids]
    # una pregunta ya respondida en esta sesión, en otra versión, tampoco se repite
    answered_claves = set(session.scalars(select(Pregunta.clave).where(Pregunta.id.in_(answered_ids)))) \
        if answered_ids else set()
    cands = [(p, s) for p, s in cands if p.clave not in answered_claves]

    if filtro.solo_fallos:
        failed = set(session.scalars(select(Intento.concepto_id).where(Intento.correcta.is_(False))))
        cands = [(p, s) for p, s in cands if p.concepto_id in failed]
    if not cands:
        return None

    # conceptos fallados en esta sesión que ya toca reintroducir con otra pregunta
    last_fail: dict[str, int] = {}
    for idx, (_, correcta, concepto_id) in enumerate(answered):
        if correcta:
            last_fail.pop(concepto_id, None)
        else:
            last_fail[concepto_id] = idx
    due = [c for c, idx in last_fail.items() if len(answered) - 1 - idx >= FAIL_GAP]
    due_cands = [(p, s) for p, s in cands if p.concepto_id in due]
    pool = due_cands or cands

    dominios = {d.concepto_id: d for d in session.scalars(select(Dominio))}
    seen = _seen_counts(session)
    last_concept = answered[-1][2] if answered else None
    last_subtema = None
    if answered:
        last_subtema = session.scalar(select(Concepto.subtema_id).where(Concepto.id == last_concept))

    def score(item: tuple[Pregunta, str]) -> float:
        p, sub = item
        theta = dominios[p.concepto_id].theta if p.concepto_id in dominios else 0.0
        s = abs(expected_correct(theta, p.dificultad_base) - TARGET)
        s += SEEN_PENALTY * min(seen.get(p.clave, 0), 3)
        if p.concepto_id == last_concept:
            s += 0.05
        if not filtro.subtema_id and sub == last_subtema:
            s += 0.03
        return s + rng.random() * 0.001

    p, sub = min(pool, key=score)
    return _to_out(session, p, sub, rng)


def placement_test(session: Session, asignatura_id: str, rng: random.Random | None = None) -> list[QuestionOut]:
    rng = rng or random.Random()
    cands = session.execute(_candidates(Filtro(asignatura_id))).all()
    by_concept: dict[str, list[tuple[Pregunta, str]]] = defaultdict(list)
    for p, sub in cands:
        by_concept[p.concepto_id].append((p, sub))
    if len(cands) < PLACEMENT_SIZE:
        warnings.warn(f"Solo hay {len(cands)} preguntas disponibles (se piden {PLACEMENT_SIZE})", PlacementWarning,
                      stacklevel=2)

    # un concepto por turno, repartiendo por subtemas; dificultad media primero
    by_subtema: dict[str, list[list[tuple[Pregunta, str]]]] = defaultdict(list)
    for items in by_concept.values():
        rng.shuffle(items)
        items.sort(key=lambda it: abs(it[0].dificultad_base - 3))
        by_subtema[items[0][1]].append(items)
    queues = list(by_subtema.values())
    for q in queues:
        rng.shuffle(q)
    rng.shuffle(queues)
    chosen: list[tuple[Pregunta, str]] = []
    leftovers: list[tuple[Pregunta, str]] = []
    while any(queues) and len(chosen) < PLACEMENT_SIZE:
        for q in queues:
            if q and len(chosen) < PLACEMENT_SIZE:
                items = q.pop()
                chosen.append(items[0])
                leftovers.extend(items[1:])
    rng.shuffle(leftovers)
    chosen += leftovers[: PLACEMENT_SIZE - len(chosen)]
    rng.shuffle(chosen)
    return [_to_out(session, p, sub, rng) for p, sub in chosen]


def question_out(session: Session, pregunta_id: str, rng: random.Random | None = None) -> QuestionOut:
    """La pregunta con las opciones barajadas de nuevo (para el test de nivel, que fija la lista de antemano)."""
    p = session.get(Pregunta, pregunta_id)
    sub = session.scalar(select(Concepto.subtema_id).where(Concepto.id == p.concepto_id))
    return _to_out(session, p, sub, rng or random.Random())
