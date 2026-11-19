"""Ocultar lo que aún no se ha dado (pregunta, concepto o tema), reversible; feedback y respuestas alternativas."""
import pytest
from sqlalchemy import select

from conftest import make_bank
from hexaprep import mastery
from hexaprep.events import start_session
from hexaprep.importer import import_bank
from hexaprep.models import Asignatura, Evento, Pregunta
from hexaprep.quality import (anotar_alternativa, anotar_facil, listar_alternativas, listar_ocultos, mostrar_oculto,
                              ocultar)
from hexaprep.selector import Filtro, next_question


def pid(session, clave):
    return session.scalar(select(Pregunta.id).where(Pregunta.clave == clave, Pregunta.es_actual.is_(True)))


@pytest.fixture
def banco(session, bank):
    import_bank(session, make_bank(bank, [("q1", "A", "s", 3), ("q2", "A", "s", 3), ("q3", "B", "s", 3)]))
    return session.scalar(select(Asignatura.id))


def excluidas(session):
    return sorted(session.scalars(select(Pregunta.clave).where(Pregunta.excluida.is_(True))))


def test_ocultar_una_pregunta_solo_oculta_esa(session, banco):
    r = ocultar(session, pid(session, "q1"), "pregunta")
    assert excluidas(session) == ["q1"], f"ocultas: {excluidas(session)}"
    assert r["alcance"] == "pregunta" and r["claves"] == ["q1"]


def test_ocultar_un_concepto_oculta_todas_sus_preguntas_y_no_cuenta_en_el_porcentaje(session, banco):
    ids_antes = len(mastery._concept_ids(session, "asignatura", banco))
    ocultar(session, pid(session, "q1"), "concepto")
    assert excluidas(session) == ["q1", "q2"], excluidas(session)
    assert len(mastery._concept_ids(session, "asignatura", banco)) == ids_antes - 1, "el concepto oculto no debe contar en el %"


def test_ocultar_un_tema_entero_y_devolverlo(session, banco):
    r = ocultar(session, pid(session, "q3"), "tema")
    assert len(excluidas(session)) == 3, f"el tema contiene las 3: {excluidas(session)}"
    assert [o["id"] for o in listar_ocultos(session)] == [r["id"]]
    mostrar_oculto(session, r["id"])
    assert excluidas(session) == [] and listar_ocultos(session) == []


def test_devolver_no_reactiva_lo_que_ya_estaba_reportado_y_el_selector_no_sirve_lo_oculto(session, banco):
    from hexaprep.quality import report_question
    report_question(session, pid(session, "q1"), "mal")
    r = ocultar(session, pid(session, "q2"), "concepto")
    assert r["claves"] == ["q2"], "q1 ya estaba excluida: no es de este ocultar"
    sid = start_session(session, "practica", {})
    visto = next_question(session, sid, Filtro(banco))
    assert visto is not None and visto.pregunta_id == pid(session, "q3"), f"solo q3 debe servirse: {visto}"
    mostrar_oculto(session, r["id"])
    assert excluidas(session) == ["q1"]


def test_facil_se_anota_sin_ocultar_y_la_alternativa_se_guarda_sin_cambiar_nada(session, banco):
    sid = start_session(session, "practica", {})
    anotar_facil(session, pid(session, "q1"), sid)
    ev = session.scalar(select(Evento).where(Evento.tipo == "pregunta_reportada"))
    assert ev.payload == {"motivo": "facil"} and excluidas(session) == []
    anotar_alternativa(session, pid(session, "q1"), "  mi respuesta  ")
    assert [a["texto"] for a in listar_alternativas(session)] == ["mi respuesta"]
    with pytest.raises(ValueError):
        anotar_alternativa(session, pid(session, "q1"), "   ")
