import copy
import json
from pathlib import Path

import pytest

from hexaprep.bank import load_bank, validate_bank

EXAMPLE = Path(__file__).resolve().parents[2] / "banks" / "_schema_example.json"


def q(**over):
    base = {
        "id": "eco-t1-0001",
        "bloque": "Decisiones",
        "tema": "T1 Decisiones",
        "subtema": "Coste de oportunidad",
        "concepto": "Definición de coste de oportunidad",
        "dificultad": 3,
        "enunciado": "¿Qué es el coste de oportunidad?",
        "opciones": [
            {"texto": "El valor de la mejor alternativa a la que se renuncia"},
            {"texto": "El precio pagado", "trampa": "confunde coste con precio"},
            {"texto": "El coste total", "trampa": "confunde con coste total"},
            {"texto": "El beneficio obtenido", "trampa": "confunde con beneficio"},
        ],
        "correcta": "a",
        "explicacion": "Es lo que se deja de ganar.",
        "ayuda_larga": "Texto largo de ayuda.",
        "fuente_pagina": 3,
        "fuente_cara": 2,
    }
    base.update(over)
    return base


def write(tmp_path, *preguntas):
    bank = json.loads(EXAMPLE.read_text(encoding="utf-8"))
    bank["preguntas"] = list(preguntas)
    p = tmp_path / "b.json"
    p.write_text(json.dumps(bank, ensure_ascii=False), encoding="utf-8")
    return p


def test_accepts_example_bank():
    assert validate_bank(EXAMPLE) == []
    assert len(load_bank(EXAMPLE).preguntas) >= 2


def test_rejects_three_options(tmp_path):
    x = q()
    x["opciones"] = x["opciones"][:3]
    assert validate_bank(write(tmp_path, x))


def test_rejects_two_correct_or_none(tmp_path):
    none = q(correcta="e")
    assert validate_bank(write(tmp_path, none))
    # dos correctas: una opción incorrecta sin trampa equivale a una segunda correcta
    two = q()
    two["opciones"][1].pop("trampa")
    assert validate_bank(write(tmp_path, two))


def test_rejects_difficulty_6(tmp_path):
    assert validate_bank(write(tmp_path, q(dificultad=6)))


def test_rejects_duplicate_ids(tmp_path):
    assert any("duplicad" in e for e in validate_bank(write(tmp_path, q(), q())))


def test_rejects_missing_trap_on_wrong_option(tmp_path):
    x = q()
    x["opciones"][2].pop("trampa")
    assert validate_bank(write(tmp_path, x))


def test_rejects_em_dash_in_text(tmp_path):
    assert validate_bank(write(tmp_path, q(enunciado="Esto — no vale")))
    x = q()
    x["opciones"][0]["texto"] = "Rango 1–2"
    assert validate_bank(write(tmp_path, x))


def test_rejects_missing_fuente_cara(tmp_path):
    x = q()
    del x["fuente_cara"]
    assert validate_bank(write(tmp_path, x))


def test_errors_are_one_line_each(tmp_path):
    errs = validate_bank(write(tmp_path, q(dificultad=9)))
    assert errs and all("\n" not in e for e in errs)


def test_missing_file_reports_error(tmp_path):
    assert validate_bank(tmp_path / "nope.json")
