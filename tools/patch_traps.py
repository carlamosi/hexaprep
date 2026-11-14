"""Reescribe etiquetas de trampa en las fuentes compactas.

Uso: python tools/patch_traps.py T1 parche.json   (parche: {"0143": {"d": "nueva trampa"}}, id = ultimos 4 digitos, letra = opcion)
Localiza cada pregunta en el banco construido, edita banks/economia/src/Tn/*.json y reconstruye banks/economia/Tn.json.
"""
import json
import sys
from pathlib import Path

from build_bank import build

ROOT = Path(__file__).resolve().parents[1] / "banks" / "economia"


def main(theme: str, patch_file: str) -> None:
    patch = json.loads(Path(patch_file).read_text(encoding="utf-8"))
    built = json.loads((ROOT / f"{theme}.json").read_text(encoding="utf-8"))["preguntas"]
    wanted = {}  # (enunciado, texto de opcion) -> nueva trampa
    for q in built:
        for letter, trap in patch.get(q["id"][-4:], {}).items():
            wanted[(q["enunciado"], q["opciones"]["abcd".index(letter)]["texto"])] = trap
    done = 0
    for f in sorted((ROOT / "src" / theme).glob("0*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        for c in data["conceptos"]:
            for q in c["preguntas"]:
                for m in q[3:6]:
                    key = (q[1], m[0])
                    if key in wanted:
                        m[1] = wanted.pop(key)
                        done += 1
        f.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    assert not wanted, f"sin localizar: {list(wanted)[:3]}"
    build(ROOT / "src" / theme, ROOT / f"{theme}.json")
    print(f"{theme}: {done} trampas reescritas")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
