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


SEGUROS = {n: __builtins__[n] if isinstance(__builtins__, dict) else getattr(__builtins__, n)
           for n in ("range", "abs", "sorted", "sum", "min", "max", "len", "round", "float", "int", "all", "any", "zip", "pow")}


def evaluar(expr: str):
    """Evalúa la expresión de un problema solo con números, operadores, `math` y unas pocas funciones puras.

    shortcut: eval sobre fuentes propias del repositorio (nunca entrada de la alumna ni de terceros); si algún día
    se aceptan bancos ajenos, sustituirlo por un intérprete de expresiones.
    """
    return eval(expr, {"__builtins__": SEGUROS, "math": math}, {})  # noqa: S307


def coinciden(real, solucion, ordenada: bool) -> bool:
    """¿Coincide lo que da la expresión con la solución escrita (diferencia relativa menor de MARGEN)?"""
    a = [float(x) for x in (real if isinstance(real, (list, tuple)) else [real])]
    b = [float(x) for x in (solucion if isinstance(solucion, list) else [solucion])]
    if len(a) != len(b):
        return False
    if not ordenada:
        a, b = sorted(a), sorted(b)
    return all(math.isclose(x, y, rel_tol=MARGEN, abs_tol=1e-6) for x, y in zip(a, b))


def limpia(trampa: str) -> str:
    """La interfaz ya dice «Fíjate en esta trampa:», así que el texto no repite el prefijo."""
    return trampa.removeprefix("Trampa: ").removeprefix("trampa: ")


def build(src: Path) -> tuple[dict, list[str]]:
    src = Path(src)
    meta = json.loads((src / "_meta.json").read_text(encoding="utf-8"))
    errores: list[str] = []
    items = []  # (subtema, concepto dict, tipo, datos, archivo, tema, grupo o None)
    n_grupo = 0
    for f in sorted(p for p in src.glob("*.json") if not p.name.startswith("_")):
        data = json.loads(f.read_text(encoding="utf-8"))
        for c in data["conceptos"]:
            for tipo, clave in (("test", "test"), ("vf", "vf"), ("problema", "problemas")):
                for q in c.get(clave, []):
                    items.append((data["subtema"], c, tipo, q, f.name, data.get("tema", meta["tema"]), None))
            for g in c.get("grupos", []):  # problema con apartados: enunciado común y una respuesta por apartado
                n_grupo += 1
                if not 2 <= len(g["apartados"]) <= 5:
                    errores.append(f"{f.name}: un grupo lleva de 2 a 5 apartados")
                for i, q in enumerate(g["apartados"]):
                    items.append((data["subtema"], c, "problema", q, f.name, data.get("tema", meta["tema"]),
                                  {"grupo": f"{meta['prefijo']}-g{n_grupo:03d}", "contexto": g["contexto"], "apartado": "abcde"[i]}))
    n_test = sum(1 for i in items if i[2] == "test")
    # `tests_congelados`: las primeras N preguntas test conservan el reparto de letras que ya tenían (no se reimportan como versiones nuevas)
    congelados = min(meta.get("tests_congelados", n_test), n_test)
    letras = [LETRAS[i % 4] for i in range(congelados)]
    random.Random(meta["prefijo"]).shuffle(letras)
    nuevas = [LETRAS[i % 4] for i in range(n_test - congelados)]
    random.Random(meta["prefijo"] + "-2").shuffle(nuevas)
    letras = iter(letras + nuevas)

    preguntas = []
    for n, (subtema, c, tipo, q, archivo, tema, grupo) in enumerate(items, start=1):
        base = {"id": f"{meta['prefijo']}-{n:04d}", "bloque": meta["bloque"], "tema": tema, "subtema": subtema,
                "concepto": c["nombre"], "dificultad": q[0], "enunciado": q[1], "ayuda_larga": c["ayuda"],
                "fuente_pagina": c["pagina"], "fuente_cara": c.get("cara", c["pagina"])}
        if tipo == "test":
            correcta = next(letras)
            q = list(q)
            if isinstance(q[-1], dict):  # extras de la pregunta: {"imagen": "pictogrames/corrosiu.png"}
                base.update(q.pop())
            dificultad, enunciado, ok, *malas, explicacion = q
            malas = iter(malas)
            base["opciones"] = [{"texto": ok} if LETRAS[i] == correcta else
                                {"texto": (m := next(malas))[0], "trampa": limpia(m[1])} for i in range(4)]
            base.update(correcta=correcta, explicacion=explicacion)
        elif tipo == "vf":
            q = list(q)
            if isinstance(q[-1], dict):
                base.update(q.pop())
            _, _, verdadero, explicacion, trampa = q
            trampa = limpia(trampa)
            base["tipo"] = "vf"
            base["opciones"] = [{"texto": "Vertader"} if verdadero else {"texto": "Vertader", "trampa": trampa},
                                {"texto": "Fals", "trampa": trampa} if verdadero else {"texto": "Fals"}]
            base.update(correcta="a" if verdadero else "b", explicacion=explicacion)
        else:
            _, _, solucion, explicacion, expr, *resto = q
            ordenada = bool(resto and resto[0])
            try:
                real = evaluar(expr)
            except Exception as e:  # noqa: BLE001
                errores.append(f"{archivo} {base['id']}: expresión no evaluable ({e})")
            else:
                if not coinciden(real, solucion, ordenada):
                    errores.append(f"{archivo} {base['id']}: la solución {solucion} no coincide con la expresión ({real})")
            base.update(tipo="problema", solucion=solucion, explicacion=explicacion, **({"ordenada": True} if ordenada else {}))
            if grupo:
                base.update(grupo)
        if "imagen" in base and not (src.resolve().parents[1] / "img" / base["imagen"]).is_file():
            errores.append(f"{archivo} {base['id']}: la imagen {base['imagen']} no existe en banks/<asignatura>/img/")
        preguntas.append(base)
    bank = {"asignatura": meta["asignatura"], **({"fuente": meta["fuente"]} if "fuente" in meta else {}),
            "lote": meta["lote"], "preguntas": preguntas}
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
