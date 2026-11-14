import json
from datetime import date

import pytest
from sqlalchemy import select

from hexaprep.bank import BankFile
from hexaprep.events import start_session, submit_answer
from hexaprep.importer import import_bank
from hexaprep.mastery import aggregate, expected_correct, percent, rebuild, snapshot_daily, update
from hexaprep.models import Asignatura, Concepto, Dominio, DominioSnapshot, Intento, Pregunta, Subtema

ORDEN = ["a", "b", "c", "d"]


def test_correct_raises_theta_wrong_lowers():
    assert update(0.0, 1.5, 3, True)[0] > 0.0
    assert update(0.0, 1.5, 3, False)[0] < 0.0


def test_hard_correct_raises_more_than_easy_correct():
    assert update(0.0, 1.5, 5, True)[0] > update(0.0, 1.5, 1, True)[0]


def test_uncertainty_shrinks_with_attempts():
    theta, sigma = 0.0, 1.5
    sigmas = []
    for i in range(6):
        theta, sigma = update(theta, sigma, 3, i % 2 == 0)
        sigmas.append(sigma)
    assert sigmas == sorted(sigmas, reverse=True) and sigmas[-1] < 1.5


def test_percent_of_zero_theta_is_50():
    assert percent(0.0) == 50
    assert expected_correct(0.0, 3) == pytest.approx(0.5)
    assert expected_correct(0.0, 5) < expected_correct(0.0, 1)


def three_question_bank(bank) -> BankFile:
    """Tres preguntas del mismo concepto con dificultades 2, 3 y 5."""
    data = json.loads(bank.model_dump_json())
    base = data["preguntas"][0]
    data["preguntas"] = [{**base, "id": f"x-{i}", "dificultad": d} for i, d in enumerate([2, 3, 5])]
    return BankFile.model_validate(data)


def test_excluded_questions_do_not_count(session, bank):
    import_bank(session, three_question_bank(bank))
    p = {x.clave: x for x in session.scalars(select(Pregunta))}
    sid = start_session(session, "practica", {})
    submit_answer(session, sid, p["x-0"].id, ORDEN, "a", None, {})  # acierto fácil
    submit_answer(session, sid, p["x-1"].id, ORDEN, "b", None, {})  # fallo
    expected = update(*update(0.0, 1.5, 2, True), 3, False)
    dom = session.scalar(select(Dominio))
    assert (dom.theta, dom.sigma) == pytest.approx(expected)

    p["x-1"].excluida = True
    session.commit()
    rebuild(session, dom.concepto_id)
    session.refresh(dom)
    assert (dom.theta, dom.sigma, dom.n_intentos) == pytest.approx((*update(0.0, 1.5, 2, True), 1))


def test_answer_updates_mastery_and_records_before_after(session, bank):
    import_bank(session, three_question_bank(bank))
    q = session.scalars(select(Pregunta)).first()
    submit_answer(session, start_session(session, "practica", {}), q.id, ORDEN, "a", None, {})
    i = session.scalar(select(Intento))
    dom = session.scalar(select(Dominio))
    assert i.dominio_antes == 0.0 and i.dominio_despues == pytest.approx(dom.theta) and dom.n_intentos == 1


def test_aggregate_averages_only_concepts_with_attempts(session, bank):
    import_bank(session, bank)  # dos conceptos distintos en el mismo subtema
    q1 = session.scalars(select(Pregunta).order_by(Pregunta.clave)).first()
    submit_answer(session, start_session(session, "practica", {}), q1.id, ORDEN, "a", None, {})
    theta = session.scalar(select(Dominio.theta))
    subtema = session.scalar(select(Subtema))
    asig = session.scalar(select(Asignatura))
    assert aggregate(session, "subtema", subtema.id) == pytest.approx(theta)
    assert aggregate(session, "asignatura", asig.id) == pytest.approx(theta)


def test_aggregate_without_attempts_is_zero_theta(session, bank):
    import_bank(session, bank)
    assert aggregate(session, "asignatura", session.scalar(select(Asignatura.id))) == 0.0


def test_snapshot_daily_is_idempotent(session, bank):
    import_bank(session, bank)
    q = session.scalars(select(Pregunta)).first()
    submit_answer(session, start_session(session, "practica", {}), q.id, ORDEN, "a", None, {})
    snapshot_daily(session, date(2026, 11, 14))
    snapshot_daily(session, date(2026, 11, 14))
    rows = session.scalars(select(DominioSnapshot)).all()
    assert len(rows) == 1 and rows[0].fecha == "2026-11-14"
