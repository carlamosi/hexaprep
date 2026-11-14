import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from build_bank import build  # noqa: E402
from hexaprep.bank import validate_bank  # noqa: E402


def make_src(tmp_path, n=8):
    src = tmp_path / "T9"
    src.mkdir()
    (src / "_meta.json").write_text(json.dumps({
        "tema": "T9 Prueba", "prefijo": "eco-t9", "caras": 4,
        "fuente": {"nombre": "Prueba", "archivo": "p.pdf"}, "lote": {"modelo": "m", "version_prompt": "v1"}}), encoding="utf-8")
    qs = [[3, f"Enunciado {i}", f"Correcta {i}", [f"Mala a{i}", "trampa a"], [f"Mala b{i}", "trampa b"],
           [f"Mala c{i}", "trampa c"], "Explicación."] for i in range(n)]
    (src / "01-a.json").write_text(json.dumps({"subtema": "Sub A", "conceptos": [
        {"nombre": "Concepto 1", "pagina": 2, "ayuda": "Ayuda 1.", "preguntas": qs[: n // 2]},
        {"nombre": "Concepto 2", "pagina": 8, "ayuda": "Ayuda 2.", "preguntas": qs[n // 2:]}]}), encoding="utf-8")
    return src


def test_build_makes_valid_balanced_bank_with_caras(tmp_path):
    out = tmp_path / "T9.json"
    build(make_src(tmp_path), out)
    assert validate_bank(out) == []
    bank = json.loads(out.read_text(encoding="utf-8"))
    qs = bank["preguntas"]
    assert [q["id"] for q in qs][:2] == ["eco-t9-0001", "eco-t9-0002"]
    assert set(Counter(q["correcta"] for q in qs).values()) == {2}  # 8 preguntas, 2 por letra
    assert all(q["opciones"]["abcd".index(q["correcta"])]["texto"].startswith("Correcta") for q in qs)
    # T = 8: pagina 2 (indice 1) en cara 2; pagina 8 (contraportada, indice 7) en cara 1
    assert {q["fuente_pagina"]: q["fuente_cara"] for q in qs} == {2: 2, 8: 1}
    assert qs[0]["ayuda_larga"] == "Ayuda 1." and qs[-1]["ayuda_larga"] == "Ayuda 2."
