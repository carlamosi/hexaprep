"""Corrección activa: una escrita fallada vuelve a salir (la misma) pasadas unas respuestas, una sola vez, y cuenta como intento."""
import random

import pytest
from sqlalchemy import select

from hexaprep import selector
from hexaprep.bank import BankFile, PreguntaIn
from hexaprep.events import AlreadyAnswered, skip_question, start_session, submit_answer
from hexaprep.importer import import_bank
from hexaprep.models import Asignatura, Intento, Pregunta
from hexaprep.selector import Filtro, next_question

BASE = dict(bloque="B", tema="T", subtema="S", dificultad=3, explicacion="E.", ayuda_larga="A.", fuente_pagina=1, fuente_cara=1)
ASIG = {"nombre": "Català", "idioma": "ca", "color": "#D9822B", "acento": "#D9822B"}


@pytest.fixture(autouse=True)
def sin_sorteo(monkeypatch):
    monkeypatch.setattr(selector, "TOP_K", 1)


def escrita(id, concepto):
    return PreguntaIn(**{**BASE, "id": id, "concepto": concepto, "enunciado": f"?{id}", "tipo": "escrita",
                         "campos": [{"etiqueta": "Paraula", "validas": ["ok"]}]})


def pregunta_test(id, concepto):
    return PreguntaIn(**{**BASE, "id": id, "concepto": concepto, "enunciado": f"?{id}",
                         "opciones": [{"texto": "ok"}, {"texto": "x", "trampa": "t"}, {"texto": "y", "trampa": "t"}, {"texto": "z", "trampa": "t"}],
                         "correcta": "a"})


def montar(session, *preguntas):
    import_bank(session, BankFile(asignatura=ASIG, preguntas=list(preguntas)))
    return session.scalar(select(Asignatura.id)), start_session(session, "practica", {})


def responder(session, sid, q, bien):
    p = session.get(Pregunta, q.pregunta_id)
    if p.tipo == "escrita":
        return submit_answer(session, sid, p.id, [], "a", None, {}, respuestas=["ok" if bien else "mal"])
    return submit_answer(session, sid, p.id, ["a", "b", "c", "d"], "a" if bien else "b", None, {})


def servir(session, asig, sid, n=1):
    return [next_question(session, sid, Filtro(asig), random.Random(i)) for i in range(n)]


def test_una_escrita_fallada_vuelve_a_salir_la_misma_pasadas_tres_respuestas(session):
    asig, sid = montar(session, escrita("e1", "A"), *[pregunta_test(f"t{i}", f"C{i}") for i in range(8)])
    fallada = None
    for _ in range(40):  # hasta que salga la escrita y se falle
        q = next_question(session, sid, Filtro(asig))
        responder(session, sid, q, bien=q.tipo != "escrita")
        if q.tipo == "escrita":
            fallada = q.pregunta_id
            break
    assert fallada
    for _ in range(selector.REINTENTO_GAP):
        q = next_question(session, sid, Filtro(asig))
        assert q.pregunta_id != fallada and not q.reintento
        responder(session, sid, q, bien=True)
    q = next_question(session, sid, Filtro(asig))
    assert q.pregunta_id == fallada and q.reintento is True


def test_el_reintento_cuenta_como_segundo_intento_y_no_hay_un_tercero(session):
    asig, sid = montar(session, escrita("e1", "A"), *[pregunta_test(f"t{i}", f"C{i}") for i in range(6)])
    p = session.scalar(select(Pregunta).where(Pregunta.clave == "e1"))
    assert responder(session, sid, type("Q", (), {"pregunta_id": p.id}), bien=False).correcta is False
    assert responder(session, sid, type("Q", (), {"pregunta_id": p.id}), bien=True).correcta is True  # reintento permitido
    assert len(session.scalars(select(Intento).where(Intento.pregunta_id == p.id)).all()) == 2
    with pytest.raises(AlreadyAnswered):
        responder(session, sid, type("Q", (), {"pregunta_id": p.id}), bien=True)


def test_acertar_a_la_primera_o_fallar_un_test_no_genera_reintento(session):
    asig, sid = montar(session, escrita("e1", "A"), pregunta_test("t1", "B"), *[pregunta_test(f"t{i}", f"C{i}") for i in range(2, 8)])
    vistas = []
    for _ in range(8):
        q = next_question(session, sid, Filtro(asig))
        if q is None:
            break
        assert not q.reintento
        vistas.append(q.pregunta_id)
        responder(session, sid, q, bien=q.tipo == "escrita")  # la escrita bien; los test mal
    assert len(vistas) == len(set(vistas))  # nada se repite: los test fallados tampoco vuelven
    p = session.scalar(select(Pregunta).where(Pregunta.tipo == "test"))
    with pytest.raises(AlreadyAnswered):
        responder(session, sid, type("Q", (), {"pregunta_id": p.id}), bien=True)


def test_una_escrita_saltada_no_se_trata_como_fallada(session):
    asig, sid = montar(session, escrita("e1", "A"), *[pregunta_test(f"t{i}", f"C{i}") for i in range(6)])
    p = session.scalar(select(Pregunta).where(Pregunta.clave == "e1"))
    skip_question(session, sid, p.id)
    for _ in range(selector.REINTENTO_GAP + 2):
        q = next_question(session, sid, Filtro(asig))
        assert not q.reintento
        responder(session, sid, q, bien=True)
