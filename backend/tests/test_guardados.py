"""Guardados: la ayuda del concepto y la explicación de un ejemplo, por perfil, con el texto tal como estaba al guardar."""
import pytest
from sqlalchemy import select

from conftest import make_bank
from hexaprep.guardados import guardar, listar_guardados, quitar_guardado
from hexaprep.importer import import_bank
from hexaprep.models import Asignatura, Explicacion, Pregunta


def pid(session, clave):
    return session.scalar(select(Pregunta.id).where(Pregunta.clave == clave, Pregunta.es_actual.is_(True)))


@pytest.fixture
def banco(session, bank):
    import_bank(session, make_bank(bank, [("q1", "Coste de oportunidad", "s", 3), ("q2", "Coste de oportunidad", "s", 3)]))
    return session.scalar(select(Asignatura.id))


def test_guardar_la_ayuda_guarda_el_texto_del_concepto_con_su_ruta(session, banco):
    g = guardar(session, pid(session, "q1"), "ayuda")
    p = session.scalar(select(Pregunta).where(Pregunta.clave == "q1"))
    assert (g["tipo"], g["titulo"], g["asignatura_id"]) == ("ayuda", "Coste de oportunidad", banco)
    assert g["texto"] == p.ayuda_larga and g["subtema"] == "s"


def test_guardar_un_ejemplo_guarda_enunciado_y_explicacion(session, banco):
    g = guardar(session, pid(session, "q2"), "ejemplo")
    p = session.scalar(select(Pregunta).where(Pregunta.clave == "q2"))
    expl = session.scalar(select(Explicacion.texto).where(Explicacion.pregunta_id == p.id))
    assert g["enunciado"] == p.enunciado and g["texto"] == expl, f"se guardó {g}"


def test_guardar_dos_veces_lo_mismo_no_lo_duplica_y_distinto_ejemplo_si(session, banco):
    a = guardar(session, pid(session, "q1"), "ayuda")
    b = guardar(session, pid(session, "q2"), "ayuda")  # misma ayuda: es del concepto
    assert a["id"] == b["id"] and len(listar_guardados(session)) == 1
    guardar(session, pid(session, "q1"), "ejemplo")
    guardar(session, pid(session, "q2"), "ejemplo")
    assert len(listar_guardados(session)) == 3


def test_tipo_desconocido_se_rechaza(session, banco):
    with pytest.raises(ValueError, match="tipo"):
        guardar(session, pid(session, "q1"), "otro")


def test_listar_filtra_por_asignatura_y_pone_lo_ultimo_primero(session, banco):
    guardar(session, pid(session, "q1"), "ayuda")
    ultimo = guardar(session, pid(session, "q1"), "ejemplo")
    assert listar_guardados(session, banco)[0]["id"] == ultimo["id"]
    assert listar_guardados(session, "otra-asignatura") == []


def test_quitar_lo_borra_y_un_id_desconocido_falla(session, banco):
    g = guardar(session, pid(session, "q1"), "ayuda")
    quitar_guardado(session, g["id"])
    assert listar_guardados(session) == []
    with pytest.raises(ValueError, match="guardado"):
        quitar_guardado(session, g["id"])
