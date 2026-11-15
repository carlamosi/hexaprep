"""Tipos de pregunta vf y problema: banco, importación, selector, respuesta numérica y «lo he hecho bien»."""
from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import select

from hexaprep import selector
from hexaprep.bank import BankFile, PreguntaIn, load_bank
from hexaprep.events import mark_correct, parse_numero, parse_respuesta, start_session, submit_answer
from hexaprep.importer import import_bank, question_digest
from hexaprep.models import Dominio, Intento, Opcion, Pregunta

ROOT = Path(__file__).resolve().parents[2]
BASE = dict(bloque="Química", tema="T2", subtema="El mol", concepto="Massa molar", dificultad=2,
            explicacion="Explicació.", ayuda_larga="Ajuda.", fuente_pagina=11, fuente_cara=11)


def vf(**o):
    return PreguntaIn(**{**BASE, "id": "q-vf", "tipo": "vf", "enunciado": "El mol és una unitat.",
                         "opciones": [{"texto": "Vertader"}, {"texto": "Fals", "trampa": "confon mol amb massa"}],
                         "correcta": "a", **o})


def problema(**o):
    return PreguntaIn(**{**BASE, "id": "q-pr", "tipo": "problema", "enunciado": "Quants mols són 36 g d'aigua?",
                         "solucion": 2.0, **o})


@pytest.fixture
def ctx(session):
    bank = BankFile(asignatura={"nombre": "Química", "idioma": "ca", "color": "#1B998B", "acento": "#1B998B"},
                    preguntas=[vf(), problema()])
    import_bank(session, bank)
    ps = {p.clave: p for p in session.scalars(select(Pregunta))}
    return start_session(session, "practica", {}), ps


def test_economy_digests_are_unchanged_by_the_new_fields():
    b = load_bank(ROOT / "banks" / "economia" / "T1.json")
    assert question_digest(b.preguntas[0]) == "bc6d07c4be85ec724f24392b814ea72049fae13ec099f7a64d8be371b6fcedc9"
    assert question_digest(b.preguntas[-1]) == "fd69437d00c1b7c0d5a6efedfa6fe91fc98e81c1f985ea7f2a0f6f0e17a19e26"


def test_bank_rules_per_tipo():
    vf(), problema()
    with pytest.raises(ValidationError):
        vf(opciones=[{"texto": "a"}] * 4)
    with pytest.raises(ValidationError):
        vf(correcta="c")
    with pytest.raises(ValidationError):
        problema(solucion=None)
    with pytest.raises(ValidationError):
        problema(opciones=[{"texto": "x"}, {"texto": "y", "trampa": "t"}], correcta="a")


def test_import_stores_options_and_hides_the_solution(session, ctx):
    _, ps = ctx
    assert len(session.scalars(select(Opcion).where(Opcion.pregunta_id == ps["q-vf"].id)).all()) == 2
    q = selector.question_out(session, ps["q-pr"].id)
    assert q.tipo == "problema" and q.opciones == [] and q.orden == []
    assert "2.0" not in repr(q)
    assert selector.question_out(session, ps["q-vf"].id).orden != [] and len(selector.question_out(session, ps["q-vf"].id).opciones) == 2


@pytest.mark.parametrize("texto,ok", [("2", True), ("2,0", True), (" 2.01 ", True), ("2,5", False), ("1.9", False)])
def test_numeric_answer_uses_one_percent_margin(session, ctx, texto, ok):
    sid, ps = ctx
    res = submit_answer(session, sid, ps["q-pr"].id, [], "a", None, {}, texto)
    assert res.correcta is ok and res.solucion == 2.0


def test_invalid_numeric_answer_is_rejected_without_recording(session, ctx):
    sid, ps = ctx
    for bad in (None, "abc", "", "nan"):
        with pytest.raises(ValueError):
            submit_answer(session, sid, ps["q-pr"].id, [], "a", None, {}, bad)
    assert session.scalars(select(Intento)).all() == []
    assert parse_numero("6,022e23") == 6.022e23


def test_vf_checks_its_two_letters(session, ctx):
    sid, ps = ctx
    with pytest.raises(ValueError):
        submit_answer(session, sid, ps["q-vf"].id, ["a", "b", "c", "d"], "a", None, {})
    assert submit_answer(session, sid, ps["q-vf"].id, ["b", "a"], "a", None, {}).correcta is True


def test_mark_correct_flips_the_attempt_and_rebuilds_mastery(session, ctx):
    sid, ps = ctx
    p = ps["q-pr"]
    assert submit_answer(session, sid, p.id, [], "a", None, {}, "5").correcta is False
    theta_mal = session.scalar(select(Dominio.theta).where(Dominio.concepto_id == p.concepto_id))
    mark_correct(session, sid, p.id)
    intento = session.scalar(select(Intento).where(Intento.pregunta_id == p.id))
    assert intento.correcta is True
    assert session.scalar(select(Dominio.theta).where(Dominio.concepto_id == p.concepto_id)) > theta_mal
    mark_correct(session, sid, p.id)  # repetir no hace nada
    with pytest.raises(ValueError):
        mark_correct(session, sid, ps["q-vf"].id)



def test_scalar_problem_and_vf_digests_are_unchanged_by_lists():
    assert question_digest(problema()) == "5d788e4f92aad2ea4b75563a8cf0e4fb2bd3eac6c4800d53b9199fbf3c1e495f"
    assert question_digest(vf()) == "a21fa882894d4edfbaf492ebd84cd0362d1525b30e8696bc50eeac7ebde310bc"
    assert question_digest(problema(solucion=[1.0, 4.0])) != question_digest(problema(solucion=[1.0, 4.0], ordenada=True))


@pytest.mark.parametrize("texto,esperado", [("3/4", 0.75), ("-1/2", -0.5), ("−3", -3.0), (" 1 000 ", 1000.0), ("2,5", 2.5)])
def test_parse_numero_accepts_fractions_and_unicode_minus(texto, esperado):
    assert parse_numero(texto) == pytest.approx(esperado)


@pytest.mark.parametrize("malo", ["1/0", "a/b", "1/", "", "inf", "1;2;3;4;5;6;7"])
def test_parse_respuesta_rejects_garbage(malo):
    with pytest.raises(ValueError):
        parse_respuesta(malo)


def test_parse_respuesta_lists():
    assert parse_respuesta("1; 4") == [1.0, 4.0]
    assert parse_respuesta("-1/2 y 3") == [-0.5, 3.0]
    assert parse_respuesta("2,5") == [2.5]


def lista_ctx(session, solucion, ordenada):
    bank = BankFile(asignatura={"nombre": "Mates", "idioma": "es", "color": "#4A6FE3", "acento": "#4A6FE3"},
                    preguntas=[problema(id="q-ls", solucion=solucion, ordenada=ordenada)])
    import_bank(session, bank)
    return start_session(session, "practica", {}), session.scalar(select(Pregunta))


@pytest.mark.parametrize("texto,ordenada,ok", [
    ("4; 1", False, True), ("1; 4", False, True), ("1,005; 4", False, True), ("1,05; 4", False, False), ("1", False, False), ("1; 4; 5", False, False),
    ("4; 1", True, False), ("1; 4", True, True), ("2/2; 8/2", True, True)])
def test_list_answers_respect_order_and_count(session, texto, ordenada, ok):
    sid, p = lista_ctx(session, [1.0, 4.0], ordenada)
    res = submit_answer(session, sid, p.id, [], "a", None, {}, texto)
    assert res.correcta is ok and res.solucion == [1.0, 4.0]


def test_list_solution_survives_the_editor_roundtrip_and_old_scalar_rows_still_read(session):
    from hexaprep.importer import leer_solucion
    from hexaprep.quality import question_content
    sid, p = lista_ctx(session, [1.0, 4.0], True)
    c = question_content(session, p.id)
    assert c["solucion"] == [1.0, 4.0] and c["ordenada"] is True
    assert leer_solucion("2.0") == (2.0, False)  # formato antiguo de las preguntas ya importadas
