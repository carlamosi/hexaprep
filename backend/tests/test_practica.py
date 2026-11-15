"""Práctica: saltar preguntas, problemas con apartados, filtro por tipo, variedad, imágenes y notación científica."""
import random
from collections import Counter

import pytest
from sqlalchemy import select

from hexaprep import selector
from hexaprep.bank import BankFile, PreguntaIn
from hexaprep.events import AlreadyAnswered, parse_numero, skip_question, start_session, submit_answer
from hexaprep.importer import import_bank, question_digest
from hexaprep.models import Asignatura, Evento, Intento, Pregunta
from hexaprep.selector import Filtro, next_question

BASE = dict(bloque="B", tema="T", dificultad=3, explicacion="E.", ayuda_larga="A.", fuente_pagina=1, fuente_cara=1)
ASIG = {"nombre": "Química", "idioma": "ca", "color": "#1B998B", "acento": "#1B998B"}
ORDEN = ["a", "b", "c", "d"]


@pytest.fixture(autouse=True)
def sin_sorteo(monkeypatch):
    monkeypatch.setattr(selector, "TOP_K", 1)


def preg_test(id, concepto, subtema="S", dificultad=3, **o):
    return PreguntaIn(**{**BASE, "id": id, "subtema": subtema, "concepto": concepto, "dificultad": dificultad,
                         "enunciado": f"?{id}", "opciones": [{"texto": "ok"}, {"texto": "x", "trampa": "t"},
                                                           {"texto": "y", "trampa": "t"}, {"texto": "z", "trampa": "t"}],
                         "correcta": "a", **o})


def problema(id, concepto, subtema="S", dificultad=3, solucion=1.0, **o):
    return PreguntaIn(**{**BASE, "id": id, "subtema": subtema, "concepto": concepto, "dificultad": dificultad,
                         "enunciado": f"?{id}", "tipo": "problema", "solucion": solucion, **o})


def montar(session, *preguntas):
    import_bank(session, BankFile(asignatura=ASIG, preguntas=list(preguntas)))
    return session.scalar(select(Asignatura.id)), start_session(session, "practica", {})


def clave(session, q):
    return session.get(Pregunta, q.pregunta_id).clave


def responder(session, sid, q, bien=True):
    p = session.get(Pregunta, q.pregunta_id)
    if p.tipo == "problema":
        submit_answer(session, sid, p.id, [], "a", None, {}, "1" if bien else "99")
    else:
        submit_answer(session, sid, p.id, ORDEN, "a" if bien else "b", None, {})


# ---------- orden y aleatoriedad ----------
def test_never_serves_the_same_concept_twice_in_a_row_when_there_is_an_alternative(session):
    asig, sid = montar(session, *[preg_test(f"a{i}", "A") for i in range(3)], *[preg_test(f"b{i}", "B") for i in range(3)])
    ultimo = None
    for _ in range(6):
        q = next_question(session, sid, Filtro(asig))
        assert q.concepto_id != ultimo
        ultimo = q.concepto_id
        responder(session, sid, q)


def test_alternates_question_types_when_difficulty_is_equal(session):
    asig, sid = montar(session, *[preg_test(f"t{i}", f"T{i}") for i in range(3)],
                       *[problema(f"p{i}", f"P{i}") for i in range(3)])
    tipos = []
    for _ in range(4):
        q = next_question(session, sid, Filtro(asig))
        tipos.append(q.tipo)
        responder(session, sid, q)
    assert all(a != b for a, b in zip(tipos, tipos[1:])), tipos


def test_random_pick_among_the_best_varies_but_never_leaves_the_top(session):
    asig, sid = montar(session, *[preg_test(f"q{i}", f"C{i}") for i in range(10)])
    vistos = Counter(clave(session, next_question(session, sid, Filtro(asig), rng=random.Random(n), variedad=4))
                     for n in range(60))
    assert 1 < len(vistos) <= 4


# ---------- saltar ----------
def test_a_skipped_question_comes_back_after_three_answers_not_before(session):
    asig, sid = montar(session, *[preg_test(f"q{i}", f"C{i}", dificultad=4 if i == 0 else 3) for i in range(8)])
    primera = next_question(session, sid, Filtro(asig))
    skip_question(session, sid, primera.pregunta_id)
    siguientes = []
    for _ in range(6):
        q = next_question(session, sid, Filtro(asig))
        siguientes.append(q.pregunta_id)
        responder(session, sid, q)
    assert primera.pregunta_id not in siguientes[:3]
    assert primera.pregunta_id in siguientes[3:]


def test_the_only_question_left_is_served_even_if_skipped(session):
    asig, sid = montar(session, preg_test("q0", "C"))
    q = next_question(session, sid, Filtro(asig))
    skip_question(session, sid, q.pregunta_id)
    assert next_question(session, sid, Filtro(asig)).pregunta_id == q.pregunta_id


def test_skip_is_not_an_attempt_and_cannot_skip_an_answered_question(session):
    asig, sid = montar(session, preg_test("q0", "C"), preg_test("q1", "D"))
    q = next_question(session, sid, Filtro(asig))
    skip_question(session, sid, q.pregunta_id)
    assert session.scalars(select(Intento)).all() == []
    assert session.scalar(select(Evento.tipo).where(Evento.tipo == "pregunta_saltada")) == "pregunta_saltada"
    responder(session, sid, q)
    with pytest.raises(AlreadyAnswered):
        skip_question(session, sid, q.pregunta_id)
    with pytest.raises(ValueError):
        skip_question(session, sid, "no-existe")


# ---------- problemas con apartados ----------
def grupo(id, n=3, concepto="G", **o):
    return [problema(f"{id}{'abc'[i]}", concepto, grupo=id, contexto="Datos comunes", apartado="abc"[i], **o)
            for i in range(n)]


def test_parts_are_served_in_order_right_after_each_other_and_b_never_enters_alone(session):
    asig, _ = montar(session, *grupo("g1"), *[preg_test(f"t{i}", f"T{i}") for i in range(4)])
    for n in range(30):  # da igual qué entre antes: b y c nunca salen sin su a
        q = next_question(session, start_session(session, "practica", {}), Filtro(asig), rng=random.Random(n))
        assert clave(session, q) not in ("g1b", "g1c")
    sid = start_session(session, "practica", {})
    primero = session.scalar(select(Pregunta).where(Pregunta.clave == "g1a"))
    submit_answer(session, sid, primero.id, [], "a", None, {}, "1")
    q = next_question(session, sid, Filtro(asig))
    assert (clave(session, q), q.apartado, q.grupo, q.contexto) == ("g1b", "b", "g1", "Datos comunes")
    responder(session, sid, q)
    assert clave(session, next_question(session, sid, Filtro(asig))) == "g1c"


def test_skipping_a_part_skips_the_whole_group_and_it_returns_later(session):
    asig, sid = montar(session, *grupo("g1"), *[preg_test(f"t{i}", f"T{i}") for i in range(6)])
    skip_question(session, sid, session.scalar(select(Pregunta.id).where(Pregunta.clave == "g1a")))
    vistos = []
    for _ in range(6):
        q = next_question(session, sid, Filtro(asig))
        vistos.append(clave(session, q))
        responder(session, sid, q)
    assert not any(c.startswith("g1") for c in vistos[:3])


def test_if_the_first_part_is_reported_the_next_one_becomes_the_entry(session):
    asig, sid = montar(session, *grupo("g1", n=2))
    session.scalar(select(Pregunta).where(Pregunta.clave == "g1a")).excluida = True
    session.commit()
    assert clave(session, next_question(session, sid, Filtro(asig))) == "g1b"


def test_group_fields_go_together_and_only_for_problems():
    with pytest.raises(ValueError):
        problema("x", "C", grupo="g", contexto=None, apartado="a")
    with pytest.raises(ValueError):
        preg_test("y", "C", grupo="g", contexto="c", apartado="a")


# ---------- practicar solo un tipo ----------
def test_tipo_filter_serves_only_those_types(session):
    asig, sid = montar(session, *[preg_test(f"t{i}", f"T{i}") for i in range(3)],
                       *[problema(f"p{i}", f"P{i}") for i in range(3)])
    assert {next_question(session, sid, Filtro(asig, tipos=["problema"])).tipo for _ in range(5)} == {"problema"}
    assert next_question(session, sid, Filtro(asig, tipos=["test", "vf"])).tipo == "test"


# ---------- imágenes ----------
def test_image_is_stored_and_validated(session):
    asig, sid = montar(session, preg_test("t0", "C", imagen="pictogrames/corrosiu.png"))
    assert next_question(session, sid, Filtro(asig)).imagen == "pictogrames/corrosiu.png"
    for malo in ("../secreto.png", "/abs/x.png", "a/../b.png", "x.exe", "a b.png", "*.png"):
        with pytest.raises(ValueError):
            preg_test("t1", "C", imagen=malo)


def test_old_questions_keep_their_digest_after_the_new_fields():
    assert question_digest(preg_test("t0", "C")) == question_digest(preg_test("t0", "C", imagen=None))
    assert question_digest(preg_test("t0", "C")) != question_digest(preg_test("t0", "C", imagen="a/b.png"))


# ---------- notación científica ----------
@pytest.mark.parametrize("texto,esperado", [
    ("2,24e22", 2.24e22), ("2,24·10^22", 2.24e22), ("2,24x10^22", 2.24e22), ("2.24 * 10^22", 2.24e22),
    ("2,24 × 10 ^ 22", 2.24e22), ("6,02·10²³", 6.02e23), ("1,6·10^-19", 1.6e-19), ("1,6·10⁻¹⁹", 1.6e-19),
    ("10^3", 1e3), ("3·10^(−2)", 3e-2)])
def test_scientific_notation_forms(texto, esperado):
    assert parse_numero(texto) == pytest.approx(esperado)
