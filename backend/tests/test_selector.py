import random

import pytest
from sqlalchemy import select

from conftest import make_bank
from hexaprep.events import start_session, submit_answer
from hexaprep.importer import import_bank
from hexaprep.models import Asignatura, Concepto, Pregunta, Subtema
from hexaprep import selector
from hexaprep.selector import Filtro, next_question

ORDEN = ["a", "b", "c", "d"]


@pytest.fixture(autouse=True)
def sin_sorteo(monkeypatch):
    """Los tests de orden fijan la variedad a 1 (elige la mejor); el sorteo tiene su propio test."""
    monkeypatch.setattr(selector, "TOP_K", 1)


def setup(session, bank, items):
    import_bank(session, make_bank(bank, items))
    asig = session.scalar(select(Asignatura.id))
    return asig, start_session(session, "practica", {})


def answer(session, sid, q, correct=True):
    # la letra correcta del banco es 'a'; 'b' es incorrecta
    submit_answer(session, sid, q.pregunta_id, ORDEN, "a" if correct else "b", None, {})


def clave(session, q):
    return session.get(Pregunta, q.pregunta_id).clave


def test_starts_hard_because_the_student_already_has_prior_knowledge(session, bank):
    asig, sid = setup(session, bank, [(f"q{d}", f"c{d}", "s", d) for d in range(1, 6)])
    q = next_question(session, sid, Filtro(asig))
    assert clave(session, q) == "q4"  # sin datos se supone un dominio previo: d4 acerca al 60 %, d3 sería demasiado fácil


def test_next_question_follows_the_measured_level_once_there_is_data(session, bank):
    items = [(f"q{i}", "c", "s", 5) for i in range(3)] + [(f"e{i}", "c", "s", 1) for i in range(3)]
    asig, sid = setup(session, bank, items)
    for _ in range(3):  # tres fallos en el mismo concepto: el nivel medido manda sobre el supuesto
        p = session.scalar(select(Pregunta).where(Pregunta.clave.like("q%"), ~Pregunta.id.in_(
            select(__import__("hexaprep.models", fromlist=["Intento"]).Intento.pregunta_id))))
        submit_answer(session, sid, p.id, ORDEN, "b", None, {})
    sid2 = start_session(session, "practica", {})
    assert clave(session, next_question(session, sid2, Filtro(asig))).startswith("e")


def test_never_repeats_question_in_session(session, bank):
    asig, sid = setup(session, bank, [(f"q{i}", f"c{i % 3}", "s", 3) for i in range(6)])
    seen = []
    while (q := next_question(session, sid, Filtro(asig))) is not None:
        seen.append(q.pregunta_id)
        answer(session, sid, q)
    assert len(seen) == 6 and len(set(seen)) == 6


def test_failed_concept_returns_with_different_question_within_5_picks(session, bank):
    items = [(f"A{i}", "A", "s", 3) for i in range(3)] + [(f"B{i}", f"B{i}", "s", 3) for i in range(8)]
    asig, sid = setup(session, bank, items)
    first = session.scalar(select(Pregunta).where(Pregunta.clave == "A0"))
    submit_answer(session, sid, first.id, ORDEN, "b", None, {})  # fallo en A
    picks = []
    for _ in range(5):
        q = next_question(session, sid, Filtro(asig))
        picks.append(clave(session, q))
        answer(session, sid, q)
    assert any(c in {"A1", "A2"} for c in picks), picks


def test_options_reshuffled_each_time(session, bank):
    asig, sid = setup(session, bank, [("q1", "c1", "s", 3)])
    orders = {tuple(next_question(session, sid, Filtro(asig)).orden) for _ in range(20)}
    assert len(orders) > 1
    q = next_question(session, sid, Filtro(asig), rng=random.Random(1))
    assert sorted(q.orden) == ORDEN and [o.letra for o in q.opciones] == q.orden
    assert not hasattr(q, "correcta") and all(not hasattr(o, "correcta") for o in q.opciones)


def test_concept_without_questions_is_skipped(session, bank):
    asig, sid = setup(session, bank, [("q1", "c1", "s", 3), ("q2", "c2", "s", 3)])
    session.add(Concepto(subtema_id=session.scalar(select(Subtema.id)), nombre="vacío"))
    excl = session.scalar(select(Pregunta).where(Pregunta.clave == "q2"))
    excl.excluida = True
    session.commit()
    assert clave(session, next_question(session, sid, Filtro(asig))) == "q1"


def test_subtema_filter_returns_only_that_subtema_without_limit(session, bank):
    items = [(f"a{i}", f"ca{i % 4}", "S1", 1 + i % 5) for i in range(20)] + [(f"b{i}", f"cb{i}", "S2", 3) for i in range(5)]
    asig, sid = setup(session, bank, items)
    s1 = session.scalar(select(Subtema.id).where(Subtema.nombre == "S1"))
    got = []
    while (q := next_question(session, sid, Filtro(asig, subtema_id=s1))) is not None:
        got.append(clave(session, q))
        answer(session, sid, q)
    assert len(got) == 20 and all(c.startswith("a") for c in got)


def test_solo_fallos_only_offers_failed_concepts(session, bank):
    asig, sid = setup(session, bank, [("f1", "F", "s", 3), ("f2", "F", "s", 3), ("o1", "O", "s", 3)])
    submit_answer(session, sid, session.scalar(select(Pregunta.id).where(Pregunta.clave == "f1")), ORDEN, "b", None, {})
    sid2 = start_session(session, "repaso_fallos", {})
    q = next_question(session, sid2, Filtro(asig, solo_fallos=True))
    assert clave(session, q) == "f2"  # prefiere la no vista antes
    answer(session, sid2, q)
    q = next_question(session, sid2, Filtro(asig, solo_fallos=True))
    assert clave(session, q) == "f1"
    answer(session, sid2, q)
    assert next_question(session, sid2, Filtro(asig, solo_fallos=True)) is None  # "O" nunca sale


def test_failed_concept_keeps_spacing_after_a_second_failure(session, bank):
    items = [(f"A{i}", "A", "s", 3) for i in range(5)] + [(f"B{i}", f"B{i}", "s", 3) for i in range(6)]
    asig, sid = setup(session, bank, items)
    ids = {c: session.scalar(select(Pregunta.id).where(Pregunta.clave == c)) for c in ("A0", "A1", "B0", "B1")}
    for c, letra in (("A0", "b"), ("B0", "a"), ("B1", "a"), ("A1", "b")):
        submit_answer(session, sid, ids[c], ORDEN, letra, None, {})
    q = next_question(session, sid, Filtro(asig))
    assert not clave(session, q).startswith("A")  # el último fallo fue hace 0 respuestas


def test_question_out_names_its_tema_and_subtema(session, bank):
    asig, sid = setup(session, bank, [("q1", "c1", "Mi subtema", 3)])
    q = next_question(session, sid, Filtro(asig))
    assert (q.tema, q.subtema) == ("T1 Decisiones", "Mi subtema")
