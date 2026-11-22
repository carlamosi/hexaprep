import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from build_quimica import build  # noqa: E402
from hexaprep.bank import BankFile  # noqa: E402


def make_src(tmp_path, solucion=2.0):
    src = tmp_path / "T9"
    src.mkdir()
    (src / "_meta.json").write_text(json.dumps({
        "tema": "T9", "prefijo": "qui-t9", "bloque": "Química",
        "asignatura": {"nombre": "Química", "idioma": "ca", "color": "#111111", "acento": "#111111"},
        "fuente": {"nombre": "P", "archivo": "p.pdf"}, "lote": {"modelo": "m", "version_prompt": "q1"}}), encoding="utf-8")
    c = {"nombre": "Mol", "pagina": 2, "cara": 2, "ayuda": "Ajuda.",
         "test": [[3, f"Enunciat {i}", "Bona", ["Mala a", "ta"], ["Mala b", "tb"], ["Mala c", "tc"], "Explicació."] for i in range(8)],
         "vf": [[2, "Afirmació certa", True, "Perquè sí.", "confon X"], [2, "Afirmació falsa", False, "Perquè no.", "confon Y"]],
         "problemas": [[3, "Quants mols són 36 g d'aigua? (M = 18)", solucion, "n = m/M", "36/18"]]}
    (src / "01-a.json").write_text(json.dumps({"subtema": "Sub A", "conceptos": [c]}), encoding="utf-8")
    return src


def test_builds_a_bank_the_validator_accepts(tmp_path):
    bank, errores = build(make_src(tmp_path))
    assert errores == []
    BankFile.model_validate(bank)  # valida test, vf y problema
    tipos = [p.get("tipo", "test") for p in bank["preguntas"]]
    assert tipos.count("test") == 8 and tipos.count("vf") == 2 and tipos.count("problema") == 1
    vf = [p for p in bank["preguntas"] if p.get("tipo") == "vf"]
    assert [p["correcta"] for p in vf] == ["a", "b"]
    letras = [p["correcta"] for p in bank["preguntas"] if p.get("tipo", "test") == "test"]
    assert sorted(set(letras)) == ["a", "b", "c", "d"]


def test_a_wrong_solution_is_reported(tmp_path):
    _, errores = build(make_src(tmp_path, solucion=3.0))
    assert len(errores) == 1 and "no coincide" in errores[0]


def test_lists_brute_force_expressions_theme_override_and_optional_source(tmp_path):
    src = make_src(tmp_path)
    meta = json.loads((src / "_meta.json").read_text(encoding="utf-8"))
    del meta["fuente"]
    (src / "_meta.json").write_text(json.dumps(meta), encoding="utf-8")
    (src / "02-b.json").write_text(json.dumps({"tema": "Otro tema", "subtema": "Sub B", "conceptos": [
        {"nombre": "Bicuadradas", "pagina": 1, "ayuda": "Ajuda.", "problemas": [
            [2, "x^4-5x^2+4=0", [1, 2, -1, -2], "Pasos.", "[x for x in range(-20, 21) if abs(x**4 - 5*x**2 + 4) < 1e-9]"],
            [3, "(x, y)", [4, 3], "Pasos.", "[x for x in range(1, 20) for y in range(1, 20) if x - y == 1 and x * y == 12][:1] + [3]", True]]}]}),
        encoding="utf-8")
    bank, errores = build(src)
    assert errores == [] and "fuente" not in bank
    BankFile.model_validate(bank)
    p = [q for q in bank["preguntas"] if q["tema"] == "Otro tema"]
    assert len(p) == 2 and p[1]["ordenada"] is True and "ordenada" not in p[0] and p[0]["fuente_cara"] == 1


def test_a_wrong_list_is_reported_unless_order_is_free(tmp_path):
    src = make_src(tmp_path)
    (src / "02-b.json").write_text(json.dumps({"subtema": "Sub B", "conceptos": [
        {"nombre": "C", "pagina": 1, "ayuda": "A.", "problemas": [
            [2, "libre", [4, 1], "P.", "[1, 4]"], [2, "ordenada mal", [4, 1], "P.", "[1, 4]", True]]}]}), encoding="utf-8")
    _, errores = build(src)
    assert len(errores) == 1 and "no coincide" in errores[0]


# ---------- preguntas escritas (Català) ----------
def src_escritas(tmp_path, escritas):
    src = make_src(tmp_path)
    c = {"nombre": "Barbarismes", "pagina": 12, "ayuda": "Ajuda.", "escritas": escritas}
    (src / "02-b.json").write_text(json.dumps({"subtema": "Sub B", "conceptos": [c]}), encoding="utf-8")
    return src


def test_builds_written_questions_with_fields_and_typical_errors(tmp_path):
    esc = [[2, "Escriu el femení de «cavall».", [["Femení", ["euga"], {"egua": "Compte: és «euga»."}]], "Parella lèxica irregular."],
           [3, "Troba l'error: «Tinc que anar a classe».", [["Error", ["tinc que"]], ["Correcció", ["he d'anar", "cal que vagi"]]], "Obligació: haver de."]]
    bank, errores = build(src_escritas(tmp_path, esc))
    assert errores == []
    BankFile.model_validate(bank)
    q = [p for p in bank["preguntas"] if p.get("tipo") == "escrita"]
    assert len(q) == 2 and q[0]["campos"][0] == {"etiqueta": "Femení", "validas": ["euga"], "errores": {"egua": "Compte: és «euga»."}}
    assert q[1]["campos"][1]["validas"] == ["he d'anar", "cal que vagi"] and q[1]["campos"][1]["errores"] == {}
    assert q[0]["fuente_cara"] == 12 and q[0]["explicacion"] == "Parella lèxica irregular."


def test_written_question_checks_catch_authoring_mistakes(tmp_path):
    esc = [[3, "Troba l'error: «Hem de anar».", [["Error", ["tinc que"]], ["Correcció", ["hem d'anar"]]], "E."],
           [2, "Escriu el femení de «gall».", [["Femení", ["gallina"], {"Gallina": "n"}]], "E."],
           [2, "Escriu el femení de «porc».", [["Femení", []]], "E."]]
    _, errores = build(src_escritas(tmp_path, esc))
    assert len(errores) == 3
    assert "no apareix a la frase" in errores[0] and "coincideix amb una forma vàlida" in errores[1] and "sense formes vàlides" in errores[2]


def test_a_concept_can_override_theme_and_subtopic_without_changing_ids(tmp_path):
    src = make_src(tmp_path)
    f = src / "01-a.json"
    data = json.loads(f.read_text(encoding="utf-8"))
    antes = [p["id"] for p in build(src)[0]["preguntas"]]
    data["conceptos"][0].update({"tema": "T0", "subtema": "Sub Z"})
    f.write_text(json.dumps(data), encoding="utf-8")
    bank, _ = build(src)
    assert [p["id"] for p in bank["preguntas"]] == antes
    assert {(p["tema"], p["subtema"]) for p in bank["preguntas"]} == {("T0", "Sub Z")}
