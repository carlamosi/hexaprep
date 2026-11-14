from datetime import datetime, timedelta

from fsrs import Rating
from sqlalchemy import select

from conftest import make_bank
from hexaprep.events import start_session, submit_answer
from hexaprep.importer import import_bank
from hexaprep.models import Concepto, Dominio, Pregunta, utcnow
from hexaprep.scheduling import rate, rebuild, schedule, suggestions

T0 = datetime(2026, 1, 1, 9, 0)
ORDEN = ["a", "b", "c", "d"]


def test_rate_mapping():
    assert rate(False, "seguro") == Rating.Again and rate(False, None) == Rating.Again
    assert rate(True, "seguro") == Rating.Good and rate(True, None) == Rating.Good
    assert rate(True, "dudo") == Rating.Hard and rate(True, "adivino") == Rating.Hard


def due(state):
    return datetime.fromisoformat(state["due"]).replace(tzinfo=None)


def test_again_shortens_interval():
    s1 = schedule(None, Rating.Good, T0)
    s2 = schedule(s1, Rating.Good, due(s1))
    s3 = schedule(s2, Rating.Again, due(s2))
    assert due(s3) - due(s2) < due(s2) - due(s1)


def test_good_lengthens_interval():
    s1 = schedule(None, Rating.Good, T0)
    s2 = schedule(s1, Rating.Good, due(s1))
    assert due(s2) - due(s1) > due(s1) - T0


def seeded(session, bank):
    """Dos conceptos con el mismo dominio; A repasado ayer, B hace 30 días."""
    import_bank(session, make_bank(bank, [("qa", "A", "s", 3), ("qb", "B", "s", 3)]))
    sid = start_session(session, "practica", {})
    for clave in ("qa", "qb"):
        submit_answer(session, sid, session.scalar(select(Pregunta.id).where(Pregunta.clave == clave)), ORDEN, "a", None, {})
    now = utcnow()
    doms = {session.get(Concepto, d.concepto_id).nombre: d for d in session.scalars(select(Dominio))}
    doms["A"].fsrs_state = schedule(None, Rating.Good, now - timedelta(days=1))
    doms["B"].fsrs_state = schedule(None, Rating.Good, now - timedelta(days=30))
    session.commit()
    return now


def test_suggestions_ordered_by_gain_and_forgetting(session, bank):
    now = seeded(session, bank)
    out = suggestions(session, now)
    assert [s.concepto for s in out] == ["B", "A"]
    assert out[0].riesgo_olvido > out[1].riesgo_olvido and out[0].motivo and out[0].tipo == "concepto"
    assert len(suggestions(session, now, n=1)) == 1


def test_suggestions_with_empty_history_return_placement_hint(session, bank):
    import_bank(session, bank)
    out = suggestions(session, utcnow())
    assert len(out) == 1 and out[0].tipo == "placement" and out[0].concepto_id is None


def test_answer_sets_fsrs_state_and_next_review(session, bank):
    import_bank(session, make_bank(bank, [("qa", "A", "s", 3)]))
    submit_answer(session, start_session(session, "practica", {}), session.scalar(select(Pregunta.id)), ORDEN, "a",
                  "seguro", {})
    dom = session.scalar(select(Dominio))
    assert dom.fsrs_state and dom.proximo_repaso > utcnow()


def test_rebuild_matches_incremental(session, bank):
    import_bank(session, make_bank(bank, [("q1", "A", "s", 3), ("q2", "A", "s", 4)]))
    sid = start_session(session, "practica", {})
    for clave, letra in (("q1", "a"), ("q2", "b")):
        submit_answer(session, sid, session.scalar(select(Pregunta.id).where(Pregunta.clave == clave)), ORDEN, letra,
                      None, {})
    dom = session.scalar(select(Dominio))

    def snap():
        return {k: v for k, v in dom.fsrs_state.items() if k != "card_id"}, dom.proximo_repaso

    before = snap()
    rebuild(session, dom.concepto_id)
    session.refresh(dom)
    assert snap() == before
