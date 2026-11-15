"""Guardas sobre los bancos reales de banks/<asignatura>/*.json: nada se rompe al añadir contenido."""
from collections import Counter
from pathlib import Path

import pytest

from hexaprep.bank import load_bank, validate_bank

BANKS = Path(__file__).resolve().parents[2] / "banks"
ARCHIVOS = sorted(p for p in BANKS.glob("*/*.json") if p.parent.name != "src")


def test_there_are_banks_to_check():
    assert len(ARCHIVOS) >= 8


@pytest.mark.parametrize("archivo", ARCHIVOS, ids=lambda p: f"{p.parent.name}/{p.name}")
def test_every_real_bank_validates(archivo):
    assert validate_bank(archivo) == []


def test_ids_are_unique_across_every_bank():
    ids = Counter(q.id for a in ARCHIVOS for q in load_bank(a).preguntas)
    assert [i for i, n in ids.items() if n > 1] == []


def test_every_image_exists_and_every_group_is_complete():
    for a in ARCHIVOS:
        carpeta = a.parent / "img"
        grupos: dict[str, list[str]] = {}
        for q in load_bank(a).preguntas:
            if q.imagen:
                assert (carpeta / q.imagen).is_file(), f"{a.name} {q.id}: falta {q.imagen}"
            if q.grupo:
                grupos.setdefault(q.grupo, []).append(q.apartado)
        for g, letras in grupos.items():
            assert letras == list("abcde"[: len(letras)]) and len(letras) >= 2, f"{a.name} {g}: apartados {letras}"


def test_each_subject_keeps_one_identity_across_its_banks():
    por_asignatura: dict[str, set] = {}
    for a in ARCHIVOS:
        asig = load_bank(a).asignatura
        por_asignatura.setdefault(asig.nombre, set()).add((asig.idioma, asig.color, asig.acento))
    assert all(len(v) == 1 for v in por_asignatura.values()), por_asignatura


def test_import_all_orders_banks_by_subject_then_theme_original_first():
    import sys

    sys.path.insert(0, str(BANKS.parent / "tools"))
    from import_bank import descubrir_bancos

    orden = [f"{f.parent.name}/{f.name}" for f in descubrir_bancos(BANKS)]
    assert orden.index("mates/S.json") < orden.index("mates/G.json")  # T1 y T2 antes que Gauss (T3)
    assert orden.index("quimica/T2.json") < orden.index("quimica/T3.json")
    assert orden.index("economia/T1.json") < orden.index("economia/A1.json")  # el booklet antes que sus apuntes
    assert orden.index("economia/T2.json") < orden.index("economia/A2.json") and orden.index("economia/T3.json") < orden.index("economia/A3.json")
    assert orden.index("economia/A1.json") < orden.index("economia/T2.json")  # y los temas en orden
    assert "catala/N1.json" in orden
