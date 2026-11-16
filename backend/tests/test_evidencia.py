"""Peso de la evidencia por tipo de pregunta (el azar) y objetivo de acierto por sesión (experimento 60/75/85)."""
import random

import pytest
from sqlalchemy import select

from hexaprep import events, mastery, selector
from hexaprep.bank import BankFile, PreguntaIn
from hexaprep.importer import import_bank
from hexaprep.mastery import evidencia, expected_correct, update
from hexaprep.models import Asignatura, Dominio, Pregunta
from hexaprep.selector import Filtro, next_question

BASE = dict(bloque="B", tema="T", subtema="S", explicacion="E.", ayuda_larga="A.", fuente_pagina=1, fuente_cara=1)
ASIG = {"nombre": "Mates", "idioma": "es", "color": "#D9822B", "acento": "#D9822B"}


def test_acertar_al_azar_sube_la_probabilidad_esperada_solo_en_test_y_vf():
    assert expected_correct(0.0, 3) == pytest.approx(0.5)
    assert expected_correct(0.0, 3, "problema") == expected_correct(0.0, 3, "escrita") == pytest.approx(0.5)
    assert expected_correct(0.0, 3, "test") == pytest.approx(0.25 + 0.75 * 0.5)
    assert expected_correct(0.0, 3, "vf") == pytest.approx(0.5 + 0.5 * 0.5)


def test_un_acierto_en_test_o_vf_enseña_menos_que_uno_en_problema():
    th = {t: update(0.0, 1.5, 3, True, t) for t in ("problema", "test", "vf")}
    assert th["problema"] == update(0.0, 1.5, 3, True)  # sin tipo: igual que antes
    assert th["problema"][0] > th["test"][0] > th["vf"][0]
    assert th["problema"][1] < th["test"][1] < th["vf"][1]  # y la incertidumbre baja menos
    assert evidencia(th["test"][1]) < evidencia(th["problema"][1])


def test_un_fallo_en_test_castiga_mas_que_en_problema():  # fallar pese al azar a favor es más informativo
    assert update(0.0, 1.5, 3, False, "test")[0] < update(0.0, 1.5, 3, False, "problema")[0]


def montar(session, *preguntas):
    import_bank(session, BankFile(asignatura=ASIG, preguntas=list(preguntas)))
    return session.scalar(select(Asignatura.id))


def test_rebuild_usa_el_tipo_de_cada_intento(session):
    test = PreguntaIn(**{**BASE, "id": "q-te", "concepto": "c1", "enunciado": "?", "dificultad": 3,
                         "opciones": [{"texto": "ok"}, {"texto": "x", "trampa": "t"}, {"texto": "y", "trampa": "t"},
                                      {"texto": "z", "trampa": "t"}], "correcta": "a"})
    prob = PreguntaIn(**{**BASE, "id": "q-pr", "concepto": "c2", "enunciado": "?", "dificultad": 3, "tipo": "problema",
                         "solucion": 2.0})
    montar(session, test, prob)
    sid = events.start_session(session, "practica", {})
    ps = {p.clave: p for p in session.scalars(select(Pregunta))}
    events.submit_answer(session, sid, ps["q-te"].id, ["a", "b", "c", "d"], "a", None, {})
    events.submit_answer(session, sid, ps["q-pr"].id, [], "a", None, {}, respuesta="2")
    dom = {d.concepto_id: d for d in session.scalars(select(Dominio))}
    assert dom[ps["q-pr"].concepto_id].theta > dom[ps["q-te"].concepto_id].theta


def test_cada_sesion_sortea_un_objetivo_y_respeta_el_que_se_le_da(session):
    montar(session)  # sin preguntas basta
    objetivos = set()
    for _ in range(40):
        sid = events.start_session(session, "practica", {})
        objetivos.add(events.resume_session(session, sid).filtro["objetivo"])
    assert objetivos == set(events.OBJETIVOS)
    sid = events.start_session(session, "practica", {"objetivo": 0.9})
    assert events.resume_session(session, sid).filtro["objetivo"] == 0.9


def test_el_selector_busca_la_dificultad_que_da_el_objetivo(session, monkeypatch):
    monkeypatch.setattr(selector, "TOP_K", 1)
    qs = [PreguntaIn(**{**BASE, "id": f"q{d}", "concepto": f"c{d}", "enunciado": "?", "dificultad": d,
                        "tipo": "problema", "solucion": 1.0}) for d in (1, 3, 5)]
    asig = montar(session, *qs)
    sid = events.start_session(session, "practica", {})
    # con el conocimiento previo (theta 1) la dificultad 1 es casi segura y la 5 es difícil
    facil = next_question(session, sid, Filtro(asig, objetivo=0.93), random.Random(0))
    dificil = next_question(session, sid, Filtro(asig, objetivo=0.35), random.Random(0))
    assert (facil.dificultad, dificil.dificultad) == (1, 5)
    assert next_question(session, sid, Filtro(asig), random.Random(0)).dificultad == 3  # sin objetivo: 0,6
