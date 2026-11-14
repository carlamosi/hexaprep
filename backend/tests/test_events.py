import subprocess
import sys
from datetime import datetime

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from hexaprep.db import get_engine
from hexaprep.events import record_event, resume_session, start_session, submit_answer
from hexaprep.importer import import_bank
from hexaprep.models import Evento, Intento, Opcion, Pregunta

NOW = datetime(2026, 11, 14, 10, 0, 0)
ORDEN = ["c", "a", "d", "b"]


@pytest.fixture
def ctx(session, bank):
    import_bank(session, bank)
    preguntas = session.scalars(select(Pregunta).order_by(Pregunta.clave)).all()
    sid = start_session(session, "practica", {})
    return sid, preguntas


def wrong_letter(session, p):
    return session.scalar(select(Opcion).where(Opcion.pregunta_id == p.id, Opcion.correcta.is_(False)).order_by(Opcion.posicion)).posicion


def test_answer_committed_before_return(ctx, session, db_path):
    sid, (p1, _) = ctx
    res = submit_answer(session, sid, p1.id, ORDEN, "a", None, {})
    assert res.correcta is True and res.opcion_correcta == "a" and res.trampa is None
    other = Session(get_engine(db_path))  # otra conexión: solo ve lo ya confirmado
    assert len(other.scalars(select(Intento)).all()) == 1
    assert other.scalars(select(Evento).where(Evento.tipo == "respuesta_enviada")).all()
    other.close()


KILL_SCRIPT = """
import os, sys
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from hexaprep.db import get_engine
from hexaprep.events import record_event, submit_answer
db, sid, p1, p2 = sys.argv[1:5]
s = Session(get_engine(Path(db)))
record_event(s, sid, "pregunta_mostrada", p1, {}, datetime(2026, 11, 14, 10, 0, 0))
submit_answer(s, sid, p1, ["a", "b", "c", "d"], "a", "seguro", {})
record_event(s, sid, "pregunta_mostrada", p2, {}, datetime(2026, 11, 14, 10, 0, 5))
os._exit(0)
"""


def test_answer_survives_process_kill(ctx, session, db_path):
    sid, (p1, p2) = ctx
    id1, id2 = p1.id, p2.id
    session.close()
    subprocess.run([sys.executable, "-c", KILL_SCRIPT, str(db_path), sid, id1, id2], check=True)
    with Session(get_engine(db_path)) as s:
        assert len(s.scalars(select(Intento)).all()) == 1
        assert s.scalars(select(Evento).where(Evento.tipo == "respuesta_enviada")).all()
        state = resume_session(s, sid)
    assert state.respondidas == [id1]
    assert state.pendiente == id2


def test_resume_with_nothing_pending(ctx, session):
    sid, (p1, _) = ctx
    submit_answer(session, sid, p1.id, ORDEN, "a", None, {})
    state = resume_session(session, sid)
    assert state.respondidas == [p1.id] and state.pendiente is None


def test_intento_records_trap_chosen(ctx, session):
    sid, (p1, _) = ctx
    mala = wrong_letter(session, p1)
    trampa = session.scalar(select(Opcion.tipo_trampa).where(Opcion.pregunta_id == p1.id, Opcion.posicion == mala))
    res = submit_answer(session, sid, p1.id, ORDEN, mala, "dudo", {"t_primer_clic": 4.2, "t_envio": 5.0})
    assert res.correcta is False and res.trampa == trampa
    i = session.scalar(select(Intento))
    assert (i.correcta, i.trampa_elegida, i.opcion_final, i.confianza) == (False, trampa, mala, "dudo")
    assert i.orden_opciones == ORDEN and i.t_primer_clic == 4.2 and i.posicion_sesion == 1
    assert i.n_intento_previo == 0 and i.intervalo_desde_anterior is None and i.dificultad == p1.dificultad_base


def test_derived_context_for_second_attempt_on_same_concept(ctx, session):
    sid, (p1, _) = ctx
    submit_answer(session, sid, p1.id, ORDEN, "a", None, {})
    sid2 = start_session(session, "practica", {})
    submit_answer(session, sid2, p1.id, ORDEN, "a", None, {})
    second = session.scalars(select(Intento).order_by(Intento.created_at)).all()[1]
    assert second.n_intento_previo == 1 and second.intervalo_desde_anterior >= 0


def test_option_changes_counted(ctx, session):
    sid, (p1, _) = ctx
    for letra in ["b", "b", "c"]:
        record_event(session, sid, "opcion_seleccionada", p1.id, {"opcion": letra}, NOW)
    submit_answer(session, sid, p1.id, ORDEN, "c", None, {})
    i = session.scalar(select(Intento))
    assert (i.opcion_inicial, i.opcion_final, i.n_cambios) == ("b", "c", 1)


def test_confidence_is_optional(ctx, session):
    sid, (p1, p2) = ctx
    submit_answer(session, sid, p1.id, ORDEN, "a", None, {})
    submit_answer(session, sid, p2.id, ORDEN, "a", "adivino", {})
    assert sorted(i.confianza or "" for i in session.scalars(select(Intento))) == ["", "adivino"]
    with pytest.raises(ValueError):
        submit_answer(session, sid, "no-existe", ORDEN, "a", None, {})


def test_rejects_double_answer_and_bad_input(ctx, session):
    sid, (p1, _) = ctx
    submit_answer(session, sid, p1.id, ORDEN, "a", None, {})
    with pytest.raises(ValueError):
        submit_answer(session, sid, p1.id, ORDEN, "b", None, {})
    with pytest.raises(ValueError):
        submit_answer(session, start_session(session, "practica", {}), p1.id, ["a", "a", "b", "c"], "a", None, {})
    with pytest.raises(ValueError):
        record_event(session, sid, "tipo_raro", None, {}, NOW)
    assert len(session.scalars(select(Intento)).all()) == 1


def test_derived_failure_does_not_lose_the_answer(ctx, session, db_path, monkeypatch):
    from hexaprep import scheduling

    sid, (p1, _) = ctx
    monkeypatch.setattr(scheduling, "apply_attempt", lambda *a: (_ for _ in ()).throw(RuntimeError("boom")))
    res = submit_answer(session, sid, p1.id, ORDEN, "a", None, {})
    assert res.correcta and not session.in_transaction()
    other = Session(get_engine(db_path))
    assert len(other.scalars(select(Intento)).all()) == 1
    other.close()
