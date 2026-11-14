import random
from collections import Counter

import pytest
from sqlalchemy import select

from conftest import make_bank
from hexaprep.events import start_session, submit_answer
from hexaprep.importer import import_bank
from hexaprep.models import Asignatura, Concepto, Pregunta, Subtema
from hexaprep.selector import Filtro, PlacementWarning, next_question, placement_test

ORDEN = ["a", "b", "c", "d"]


def setup(session, bank, items):
    import_bank(session, make_bank(bank, items))
    asig = session.scalar(select(Asignatura.id))
    return asig, start_session(session, "practica", {})


def answer(session, sid, q, correct=True):
    # la letra correcta del banco es 'a'; 'b' es incorrecta
    submit_answer(session, sid, q.pregunta_id, ORDEN, "a" if correct else "b", None, {})


def clave(session, q):
    return session.get(Pregunta, q.pregunta_id).clave


def test_picks_question_closest_to_75_percent(session, bank):
    asig, sid = setup(session, bank, [(f"q{d}", f"c{d}", "s", d) for d in range(1, 6)])
    q = next_question(session, sid, Filtro(asig))
    assert clave(session, q) == "q2"  # theta 0: d2 da 69 %, d1 da 83 %, el objetivo es 75 %


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


def test_placement_has_15_spread_across_concepts(session, bank):
    items = [(f"q{i}", f"c{i}", f"s{i % 4}", 1 + i % 5) for i in range(20)]
    asig, _ = setup(session, bank, items)
    qs = placement_test(session, asig)
    assert len(qs) == 15 and len({q.concepto_id for q in qs}) == 15
    per_subtema = Counter(q.subtema_id for q in qs)
    assert len(per_subtema) == 4 and min(per_subtema.values()) >= 3


def test_placement_with_fewer_than_15_returns_all_and_warns(session, bank):
    asig, _ = setup(session, bank, [(f"q{i}", f"c{i}", "s", 3) for i in range(4)])
    with pytest.warns(PlacementWarning):
        qs = placement_test(session, asig)
    assert len(qs) == 4


def test_concept_without_questions_is_skipped(session, bank):
    asig, sid = setup(session, bank, [("q1", "c1", "s", 3), ("q2", "c2", "s", 3)])
    session.add(Concepto(subtema_id=session.scalar(select(Subtema.id)), nombre="vacío"))
    excl = session.scalar(select(Pregunta).where(Pregunta.clave == "q2"))
    excl.excluida = True
    session.commit()
    assert clave(session, next_question(session, sid, Filtro(asig))) == "q1"
    with pytest.warns(PlacementWarning):
        assert len(placement_test(session, asig)) == 1


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
