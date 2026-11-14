import json

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select

from conftest import make_bank
from hexaprep.bank import load_bank, validate_bank
from hexaprep.events import start_session, submit_answer
from hexaprep.importer import import_bank
from hexaprep.models import Asignatura, Dominio, Evento, Intento, Opcion, Pregunta, ReporteCalidad
from hexaprep.quality import edit_question, export_bank, report_question
from hexaprep.selector import Filtro, next_question

ORDEN = ["a", "b", "c", "d"]


def pid(session, clave, version=None):
    q = select(Pregunta.id).where(Pregunta.clave == clave)
    return session.scalar(q.where(Pregunta.version == version) if version else q.where(Pregunta.es_actual.is_(True)))


def count(session, model):
    return session.scalar(select(func.count()).select_from(model))


@pytest.fixture
def seeded(session, bank):
    b = make_bank(bank, [("q1", "A", "s", 3), ("q2", "A", "s", 3), ("q3", "B", "s", 3)])
    import_bank(session, b)
    sid = start_session(session, "practica", {})
    submit_answer(session, sid, pid(session, "q1"), ORDEN, "b", "seguro", {})  # fallo
    return b, sid


def test_reported_question_excluded_from_mastery_and_selector(session, seeded):
    b, sid = seeded
    dom = session.scalar(select(Dominio).where(Dominio.n_intentos > 0))
    assert dom.theta < 0 and dom.fsrs_state is not None
    report_question(session, pid(session, "q1"), "enunciado ambiguo")
    session.refresh(dom)
    assert (dom.theta, dom.n_intentos, dom.fsrs_state, dom.proximo_repaso) == (0.0, 0, None, None)
    asig = session.scalar(select(Asignatura.id))
    sid2 = start_session(session, "practica", {})
    seen = set()
    while (q := next_question(session, sid2, Filtro(asig))) is not None:
        seen.add(session.get(Pregunta, q.pregunta_id).clave)
        submit_answer(session, sid2, q.pregunta_id, ORDEN, "a", None, {})
    assert seen == {"q2", "q3"}


def test_report_keeps_all_events(session, seeded):
    _, sid = seeded
    before = (count(session, Evento), count(session, Intento))
    report_question(session, pid(session, "q1"), "dudosa", sesion_id=sid)
    assert count(session, Evento) == before[0] + 1  # solo el evento pregunta_reportada
    assert count(session, Intento) == before[1]
    assert count(session, ReporteCalidad) == 1
    assert session.scalar(select(Evento.tipo).order_by(Evento.id.desc())) == "pregunta_reportada"


def test_edit_creates_new_version_and_keeps_history(session, seeded):
    v1 = pid(session, "q1")
    nueva = edit_question(session, v1, {"enunciado": "Enunciado corregido", "dificultad": 4})
    assert nueva == 2
    rows = session.scalars(select(Pregunta).where(Pregunta.clave == "q1").order_by(Pregunta.version)).all()
    assert [(r.version, r.es_actual) for r in rows] == [(1, False), (2, True)]
    assert rows[1].enunciado == "Enunciado corregido" and rows[1].dificultad_base == 4 and rows[1].origen == "manual"
    assert session.scalar(select(func.count()).select_from(Opcion).where(Opcion.pregunta_id == rows[1].id)) == 4
    intento = session.scalar(select(Intento))
    assert intento.pregunta_id == v1 and count(session, Intento) == 1


def test_edit_options_and_correct_letter(session, seeded):
    nueva_opciones = [{"texto": "X"}, {"texto": "Y", "trampa": "t1"}, {"texto": "Z", "trampa": "t2"},
                      {"texto": "W", "trampa": "t3"}]
    edit_question(session, pid(session, "q2"), {"opciones": nueva_opciones, "correcta": "a"})
    cur = pid(session, "q2")
    ops = session.scalars(select(Opcion).where(Opcion.pregunta_id == cur).order_by(Opcion.posicion)).all()
    assert [o.texto for o in ops] == ["X", "Y", "Z", "W"] and [o.correcta for o in ops] == [True, False, False, False]


def test_invalid_edit_is_rejected_and_changes_nothing(session, seeded):
    before = count(session, Pregunta)
    with pytest.raises(ValidationError):
        edit_question(session, pid(session, "q2"), {"enunciado": "con guion — largo"})
    assert count(session, Pregunta) == before


def test_editing_a_reported_question_can_reinstate_it(session, seeded):
    report_question(session, pid(session, "q1"), "dudosa")
    edit_question(session, pid(session, "q1"), {"enunciado": "Ahora bien formulado"})
    assert session.scalar(select(Pregunta.excluida).where(Pregunta.clave == "q1", Pregunta.es_actual.is_(True)))
    edit_question(session, pid(session, "q1"), {"excluida": False})
    assert not any(session.scalars(select(Pregunta.excluida).where(Pregunta.clave == "q1")))
    assert session.scalar(select(Dominio.n_intentos).where(Dominio.n_intentos > 0)) == 1


def test_export_roundtrip_matches_import(session, seeded, tmp_path):
    b, _ = seeded
    edit_question(session, pid(session, "q2"), {"enunciado": "Editado en la app"})
    out = tmp_path / "export.json"
    export_bank(session, session.scalar(select(Asignatura.id)), out)
    assert validate_bank(out) == []
    data = json.loads(out.read_text(encoding="utf-8"))
    assert len(data["preguntas"]) == 3
    report = import_bank(session, load_bank(out))
    assert (report.created, report.updated, report.unchanged) == (0, 0, 3)
