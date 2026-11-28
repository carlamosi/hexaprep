"""Tipo de pregunta «escrita»: banco, importación, selector (sin filtrar la solución) y respuesta por campos."""
import random
from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import select

from hexaprep import selector
from hexaprep.bank import BankFile, PreguntaIn, load_bank
from hexaprep.events import start_session, submit_answer
from hexaprep.importer import import_bank, question_digest
from hexaprep.models import Concepto, Intento, Pregunta

ROOT = Path(__file__).resolve().parents[2]
BASE = dict(bloque="Verbs", tema="Gerundis i participis", subtema="Verbs en -ndre", concepto="Participi en -ès",
            dificultad=2, explicacion="Explicació.", ayuda_larga="Ajuda.", fuente_pagina=6, fuente_cara=6)
CAMPOS = [{"etiqueta": "Gerundi", "validas": ["admetent"]},
          {"etiqueta": "Participi", "validas": ["admès"], "errores": {"admetut": "Mai «admetut»: el participi és «admès»."}}]


def escrita(**o):
    return PreguntaIn(**{**BASE, "id": "q-es", "tipo": "escrita", "enunciado": "admetre", "campos": CAMPOS, **o})


@pytest.fixture
def ctx(session):
    import_bank(session, BankFile(asignatura={"nombre": "Català", "idioma": "ca", "color": "#C2185B", "acento": "#C2185B"},
                                  preguntas=[escrita()]))
    p = session.scalar(select(Pregunta).where(Pregunta.clave == "q-es"))
    return start_session(session, "practica", {}), p


def test_reglas_del_banco():
    escrita()
    for malo in ({"campos": None}, {"campos": []}, {"opciones": [{"texto": "x"}] * 2, "correcta": "a"}, {"solucion": 1.0},
                 {"campos": [{"etiqueta": "x", "validas": []}]}):
        with pytest.raises(ValidationError):
            escrita(**malo)
    with pytest.raises(ValidationError):  # un test no lleva campos
        PreguntaIn(**{**BASE, "id": "q-t", "enunciado": "?", "campos": CAMPOS, "correcta": "a",
                      "opciones": [{"texto": "a"}, {"texto": "b", "trampa": "t"}, {"texto": "c", "trampa": "t"},
                                   {"texto": "d", "trampa": "t"}]})


def test_las_huellas_antiguas_no_cambian():
    b = load_bank(ROOT / "banks" / "economia" / "T1.json")
    assert question_digest(b.preguntas[0]) == "bc6d07c4be85ec724f24392b814ea72049fae13ec099f7a64d8be371b6fcedc9"


def test_el_selector_no_envia_las_respuestas_pero_si_las_etiquetas(session, ctx):
    _, p = ctx
    sub = session.scalar(select(Concepto.subtema_id).where(Concepto.id == p.concepto_id))
    q = selector._to_out(session, p, sub, random.Random(0))
    assert q.tipo == "escrita" and q.opciones == [] and q.orden == [] and q.campos == ["Gerundi", "Participi"]
    assert "admès" not in repr(q) and "admetent" not in repr(q)


def test_responder_bien_y_mal_por_campos(session, ctx):
    sid, p = ctx
    res = submit_answer(session, sid, p.id, [], "a", None, {}, respuestas=["admetent", "admetut"])
    assert res.correcta is False
    assert [c["correcto"] for c in res.campos] == [True, False] and "admès" in res.campos[1]["nota"]
    assert session.scalar(select(Intento.correcta).where(Intento.pregunta_id == p.id)) is False


def test_acierto_completo_cuenta(session, ctx):
    sid, p = ctx
    assert submit_answer(session, sid, p.id, [], "a", None, {}, respuestas=["Admetent", "admès"]).correcta is True


def test_respuesta_con_numero_de_campos_incorrecto_no_se_registra(session, ctx):
    sid, p = ctx
    for mala in (None, ["admetent"], ["a", "b", "c"]):
        with pytest.raises(ValueError):
            submit_answer(session, sid, p.id, [], "a", None, {}, respuestas=mala)
    assert session.scalars(select(Intento)).all() == []


def test_error_de_teclado_da_por_buena_una_escrita_fallada(session, ctx):
    from hexaprep.events import mark_correct
    sid, p = ctx
    assert submit_answer(session, sid, p.id, [], "a", None, {}, None, ["admetnt", "admès"]).correcta is False
    mark_correct(session, sid, p.id)
    assert session.scalar(select(Intento).where(Intento.pregunta_id == p.id)).correcta is True
