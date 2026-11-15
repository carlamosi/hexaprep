"""Construye el banco de Química a partir de fuentes compactas y comprueba cada problema con su expresión de Python.

Uso: python tools/build_quimica.py banks/quimica/src/T2 banks/quimica/T2.json
     python tools/build_quimica.py --check banks/quimica/src/T2        (solo comprueba, no escribe)

Formato de las fuentes: banks/quimica/FORMATO.md. La letra correcta de las preguntas test se reparte de forma
equilibrada (determinista). Una pregunta vf siempre ofrece «Vertader» (a) y «Fals» (b).
"""
import json
import math
import random
import sys
from collections import Counter
from pathlib import Path

LETRAS = "abcd"
MARGEN = 0.005  # diferencia relativa máxima entre la solución escrita y la que da la expresión


def evaluar(expr: str) -> float:
    """Evalúa la expresión de un problema solo con números, operadores y `math`."""
    return float(eval(expr, {"__builtins__": {}, "math": math}, {}))  # noqa: S307 (fuentes propias del repositorio)


def limpia(trampa: str) -> str:
    """La interfaz ya dice «Fíjate en esta trampa:», así que el texto no repite el prefijo."""
    return trampa.removeprefix("Trampa: ").removeprefix("trampa: ")


def build(src: Path) -> tuple[dict, list[str]]:
    src = Path(src)
    meta = json.loads((src / "_meta.json").read_text(encoding="utf-8"))
    errores: list[str] = []
    items = []  # (subtema, concepto dict, tipo, datos)
    for f in sorted(p for p in src.glob("*.json") if not p.name.startswith("_")):
        data = json.loads(f.read_text(encoding="utf-8"))
        for c in data["conceptos"]:
            for tipo, clave in (("test", "test"), ("vf", "vf"), ("problema", "problemas")):
                for q in c.get(clave, []):
                    items.append((data["subtema"], c, tipo, q, f.name))
    n_test = sum(1 for i in items if i[2] == "test")
    letras = [LETRAS[i % 4] for i in range(n_test)]
    random.Random(meta["prefijo"]).shuffle(letras)
    letras = iter(letras)

    preguntas = []
    for n, (subtema, c, tipo, q, archivo) in enumerate(items, start=1):
        base = {"id": f"{meta['prefijo']}-{n:04d}", "bloque": meta["bloque"], "tema": meta["tema"], "subtema": subtema,
                "concepto": c["nombre"], "dificultad": q[0], "enunciado": q[1], "ayuda_larga": c["ayuda"],
                "fuente_pagina": c["pagina"], "fuente_cara": c["cara"]}
        if tipo == "test":
            correcta = next(letras)
            dificultad, enunciado, ok, *malas, explicacion = q
            malas = iter(malas)
            base["opciones"] = [{"texto": ok} if LETRAS[i] == correcta else
                                {"texto": (m := next(malas))[0], "trampa": limpia(m[1])} for i in range(4)]
            base.update(correcta=correcta, explicacion=explicacion)
        elif tipo == "vf":
            _, _, verdadero, explicacion, trampa = q
            trampa = limpia(trampa)
            base["tipo"] = "vf"
            base["opciones"] = [{"texto": "Vertader"} if verdadero else {"texto": "Vertader", "trampa": trampa},
                                {"texto": "Fals", "trampa": trampa} if verdadero else {"texto": "Fals"}]
            base.update(correcta="a" if verdadero else "b", explicacion=explicacion)
        else:
            _, _, solucion, explicacion, expr = q
            try:
                real = evaluar(expr)
            except Exception as e:  # noqa: BLE001
                errores.append(f"{archivo} {base['id']}: expresión no evaluable ({e})")
                real = None
            if real is not None and not math.isclose(real, solucion, rel_tol=MARGEN):
                errores.append(f"{archivo} {base['id']}: la solución {solucion} no coincide con la expresión ({real:.6g})")
            base.update(tipo="problema", solucion=solucion, explicacion=explicacion)
        preguntas.append(base)
    bank = {"asignatura": meta["asignatura"], "fuente": meta["fuente"], "lote": meta["lote"], "preguntas": preguntas}
    return bank, errores


def resumen(bank: dict) -> str:
    por_tipo = Counter(p.get("tipo", "test") for p in bank["preguntas"])
    letras = Counter(p["correcta"] for p in bank["preguntas"] if p.get("tipo", "test") == "test")
    por_sub = Counter(p["subtema"] for p in bank["preguntas"])
    return f"{dict(por_tipo)} letras test {dict(sorted(letras.items()))} por subtema {dict(por_sub)}"


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--check"]
    bank, errores = build(Path(args[0]))
    for e in errores:
        print("ERROR", e)
    print(resumen(bank))
    if errores:
        sys.exit(1)
    if "--check" not in sys.argv:
        Path(args[1]).write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"escrito {args[1]}")
