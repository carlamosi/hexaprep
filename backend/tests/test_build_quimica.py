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
