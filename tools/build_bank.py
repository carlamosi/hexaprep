"""Construye un banco JSON del esquema a partir de fuentes compactas (banks/economia/src/Tn/).

Uso: python tools/build_bank.py banks/economia/src/T1 banks/economia/T1.json

Cada Tn/ tiene _meta.json y archivos NN-*.json con {"subtema", "conceptos": [{"nombre", "pagina", "ayuda",
"preguntas": [[dificultad, enunciado, correcta, [mala, trampa] x3, explicacion], ...]}]}.
El script reparte la letra correcta de forma equilibrada (determinista) y calcula la cara del PDF.
"""
import json
import random
import sys
from pathlib import Path

from extract_booklet import imposition

LETRAS = "abcd"


def _cara_por_pagina(n_caras: int) -> dict[int, int]:
    return {idx + 1: f + 1 for f, pair in enumerate(imposition(n_caras)) for idx in pair}


def build(src: Path, out: Path) -> None:
    src = Path(src)
    meta = json.loads((src / "_meta.json").read_text(encoding="utf-8"))
    cara = _cara_por_pagina(meta["caras"])
    items = []  # (subtema, concepto, pagina, ayuda, pregunta)
    for f in sorted(p for p in src.glob("*.json") if not p.name.startswith("_")):
        data = json.loads(f.read_text(encoding="utf-8"))
        for c in data["conceptos"]:
            for q in c["preguntas"]:
                items.append((data["subtema"], c["nombre"], c["pagina"], c["ayuda"], q))
    letras = [LETRAS[i % 4] for i in range(len(items))]
    random.Random(meta["prefijo"]).shuffle(letras)  # reparto equilibrado, sin patrón previsible

    preguntas = []
    for n, ((subtema, concepto, pagina, ayuda, q), correcta) in enumerate(zip(items, letras), start=1):
        dificultad, enunciado, ok, *malas, explicacion = q
        malas = iter(malas)
        opciones = [{"texto": ok} if LETRAS[i] == correcta else
                    {"texto": (m := next(malas))[0], "trampa": m[1]} for i in range(4)]
        preguntas.append({
            "id": f"{meta['prefijo']}-{n:04d}", "bloque": meta.get("bloque", "Economía"), "tema": meta["tema"],
            "subtema": subtema, "concepto": concepto, "dificultad": dificultad, "enunciado": enunciado,
            "opciones": opciones, "correcta": correcta, "explicacion": explicacion, "ayuda_larga": ayuda,
            "fuente_pagina": pagina, "fuente_cara": cara[pagina]})
    bank = {"asignatura": {"nombre": "Economía", "idioma": "es", "color": "#B05A8F", "acento": "#B05A8F"},
            "fuente": meta["fuente"], "lote": meta["lote"], "preguntas": preguntas}
    Path(out).write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    build(Path(sys.argv[1]), Path(sys.argv[2]))
    print(f"escrito {sys.argv[2]}")
