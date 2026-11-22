from datetime import datetime

from sqlalchemy import func, select

from conftest import bank_with, make_bank
from hexaprep.importer import import_bank
from hexaprep.models import Concepto, Evento, Importacion, Intento, Opcion, Pregunta, Sesion, Subtema


def n(session, model, *where):
    return session.scalar(select(func.count()).select_from(model).where(*where))


def test_import_twice_creates_nothing_new(session, bank):
    first = import_bank(session, bank)
    assert (first.created, first.updated, first.unchanged) == (len(bank.preguntas), 0, 0)
    second = import_bank(session, bank)
    assert (second.created, second.updated, second.unchanged) == (0, 0, len(bank.preguntas))
    assert n(session, Pregunta) == len(bank.preguntas)
    assert n(session, Opcion) == 4 * len(bank.preguntas)
    assert n(session, Importacion) == 2


def test_edited_question_bumps_version(session, bank):
    import_bank(session, bank)
    clave = bank.preguntas[0].id
    report = import_bank(session, bank_with(bank, enunciado="Enunciado corregido"))
    assert (report.created, report.updated, report.unchanged) == (0, 1, len(bank.preguntas) - 1)
    rows = session.scalars(select(Pregunta).where(Pregunta.clave == clave).order_by(Pregunta.version)).all()
    assert [(r.version, r.es_actual) for r in rows] == [(1, False), (2, True)]
    assert rows[1].enunciado == "Enunciado corregido"


def test_reimport_keeps_attempt_history(session, bank):
    import_bank(session, bank)
    clave = bank.preguntas[0].id
    v1 = session.scalar(select(Pregunta).where(Pregunta.clave == clave))
    ses = Sesion(modo="practica", filtro={})
    session.add(ses)
    session.flush()
    ev = Evento(sesion_id=ses.id, tipo="respuesta", pregunta_id=v1.id, payload={}, t_cliente=datetime(2026, 1, 1))
    session.add(ev)
    session.flush()
    session.add(Intento(
        evento_id=ev.id, sesion_id=ses.id, pregunta_id=v1.id, concepto_id=v1.concepto_id,
        opcion_inicial="a", opcion_final="a", orden_opciones=["a", "b", "c", "d"], correcta=True,
        hora_dia=10, dia_semana=1, posicion_sesion=1, dificultad=3,
    ))
    session.commit()
    import_bank(session, bank_with(bank, enunciado="Otro enunciado"))
    intento = session.scalar(select(Intento))
    assert session.get(Pregunta, intento.pregunta_id).clave == clave
    assert n(session, Intento) == 1


def test_unknown_concept_is_created_under_subtema(session, bank):
    import_bank(session, bank)
    before = n(session, Concepto)
    import_bank(session, bank_with(bank, concepto="Concepto totalmente nuevo"))
    assert n(session, Concepto) == before + 1
    c = session.scalar(select(Concepto).where(Concepto.nombre == "Concepto totalmente nuevo"))
    assert session.get(Subtema, c.subtema_id).nombre == bank.preguntas[0].subtema


def test_reimporting_the_original_bank_does_not_revert_an_edit_made_in_the_app(session, bank):
    from hexaprep.quality import edit_question

    import_bank(session, bank)
    clave = bank.preguntas[0].id
    pid = session.scalar(select(Pregunta.id).where(Pregunta.clave == clave))
    edit_question(session, pid, {"enunciado": "Corregido en la app"})
    report = import_bank(session, bank)  # el banco original vuelve a importarse (run.ps1 lo hace en cada arranque)
    assert (report.created, report.updated) == (0, 0)
    cur = session.scalar(select(Pregunta).where(Pregunta.clave == clave, Pregunta.es_actual.is_(True)))
    assert (cur.version, cur.enunciado) == (2, "Corregido en la app")


def test_edited_bank_without_source_keeps_the_booklet_link(session, bank):
    import_bank(session, bank)
    clave = bank.preguntas[0].id
    before = session.scalar(select(Pregunta.fuente_id).where(Pregunta.clave == clave))
    assert before is not None
    edited = bank_with(bank, enunciado="Versión nueva del enunciado")
    edited = edited.model_copy(update={"fuente": None})  # como un banco exportado de una asignatura con varias fuentes
    import_bank(session, edited)
    cur = session.scalar(select(Pregunta).where(Pregunta.clave == clave, Pregunta.es_actual.is_(True)))
    assert cur.version == 2 and cur.fuente_id == before


def test_moving_the_only_question_of_a_concept_hides_the_emptied_concept(session, bank):
    base = make_bank(bank, [("x1", "C1", "S1", 1), ("x2", "C2", "S1", 1)])
    import_bank(session, base)
    antiguo = session.scalar(select(Concepto).where(Concepto.nombre == "C1"))
    otro = session.scalar(select(Concepto).where(Concepto.nombre == "C2"))
    import_bank(session, bank_with(base, subtema="S2"))
    session.refresh(antiguo)
    session.refresh(otro)
    assert antiguo.deleted_at is not None and otro.deleted_at is None
    nuevo = session.scalar(select(Concepto).where(Concepto.nombre == "C1", Concepto.deleted_at.is_(None)))
    assert session.get(Subtema, nuevo.subtema_id).nombre == "S2"


def test_reordenar_subtemas_fija_el_orden_sin_tocar_preguntas(session, bank):
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tools"))
    from reordenar_subtemas import aplicar
    base = make_bank(bank, [("y1", "C1", "A", 1), ("y2", "C2", "B", 1), ("y3", "C3", "C", 1)])
    import_bank(session, base)
    t = session.scalar(select(Subtema.tema_id).limit(1))
    from hexaprep.models import Tema
    nombre = session.get(Tema, t).nombre
    asig = session.scalar(select(__import__("hexaprep.models", fromlist=["Asignatura"]).Asignatura.nombre))
    assert aplicar(session, {(asig, nombre): ["C", "A"]}) >= 1
    orden = [s.nombre for s in session.scalars(select(Subtema).where(Subtema.tema_id == t).order_by(Subtema.orden))]
    assert orden[:2] == ["C", "A"] and n(session, Pregunta, Pregunta.es_actual.is_(True)) == 3
