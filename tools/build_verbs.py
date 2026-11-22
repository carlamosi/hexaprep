"""Genera banks/catala/V1.json (gerundi y participi de los verbos irregulares) desde la tabla de los apuntes.

Uso (desde la raíz): python tools/build_verbs.py
Sin IA: los datos salen tal cual de la tabla «Gerundis i participis irregulars» del PDF, más «ésser» (normativa).
Una pregunta escrita por verbo: se da el infinitiu y se escriben gerundi y participi.
"""
import json
import re
import unicodedata
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "banks" / "catala" / "fuentes" / "Catala_Apunts_Gramatica.pdf"
SALIDA = ROOT / "banks" / "catala" / "V1.json"
EXTRA = [("ésser", "essent", ["estat"])]  # está en la normativa, no en la tabla
FRECUENTES = {"dir", "dur", "fer", "haver", "poder", "saber", "voler", "tenir", "venir", "viure", "veure", "treure"}
AYUDA = ("El gerundi regular acaba en -ant (verbs en -ar), -ent (en -er i -re) o -int (en -ir), i el participi en -at, -ut o -it. "
         "La taula dels apunts recull els verbs que s'aparten d'aquesta regla. "
         "Truc: els verbs molt freqüents (dir, fer, tenir, venir...) gairebé sempre són irregulars; estudia'ls sencers.")


def _sin_acentos(t: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn")


PALABRA = re.compile(r"[a-zàèéíòóúïüç]+")


def parsear(texto: str) -> list[tuple[str, str, list[str]]]:
    """Busca tríos infinitiu·gerundi·participi en cada línea (la otra columna del PDF mete ruido en la misma línea).

    Un participi con varias formas va con coma («planyut, plangut»); una forma partida en dos líneas se arrastra al
    último trío de la línea siguiente.
    """
    verbos, arrastre = [], None
    for linea in texto.splitlines():
        t, i, hallados = linea.split(), 0, []
        while i + 2 < len(t):
            inf, ger, part = t[i:i + 3]
            if (PALABRA.fullmatch(inf) and inf.endswith(("r", "re")) and PALABRA.fullmatch(ger) and ger.endswith("nt")
                    and PALABRA.fullmatch(part.rstrip(","))):
                formas, i = [part], i + 3
                while formas[-1].endswith(",") and i < len(t):
                    formas.append(t[i])
                    i += 1
                hallados.append([inf, ger, formas])
            else:
                i += 1
        if arrastre and hallados:
            hallados[-1][2].insert(0, arrastre)
            arrastre = None
        if hallados and t[-1].endswith(",") and i == len(t) - 1:
            arrastre = t[-1]
        verbos += [(inf, ger, [f.strip(", ") for f in formas]) for inf, ger, formas in hallados]
    return verbos


def leer_pdf(pdf_path: Path = PDF) -> list[tuple[str, str, list[str]]]:
    with pdfplumber.open(pdf_path) as pdf:
        pagina = next(p for p in pdf.pages if "Gerundis i participis irregulars" in (p.extract_text() or ""))
        verbos = parsear(pagina.extract_text())
    return sorted(verbos + EXTRA, key=lambda v: _sin_acentos(v[0]))


def _ger_regular(inf: str) -> str:
    return inf[:-2] + "ant" if inf.endswith("ar") else inf[:-1] + "nt" if inf.endswith("ir") else inf[:-2] + "ent"


def _part_regular(inf: str) -> str:
    return inf[:-2] + "at" if inf.endswith("ar") else inf[:-2] + "it" if inf.endswith("ir") else inf[:-2] + "ut"


def _error_regular(inf: str, regular: str, validas: list[str], que: str) -> dict:
    if regular in validas:
        return {}
    nota = f"Compte: el {que} de «{inf}» no és «{regular}», és irregular: {' o '.join(validas)}."
    return {f: nota for f in (regular, _sin_acentos(regular)) if f not in validas}


# Familias por reglas sobre las formas (sin IA); el orden es el de aparición en el temario. La primera regla que se cumple manda.
FAMILIAS = ["Participis en -s", "Participis forts en -t", "Participis en -gut, -cut i -çut", "Verbs amb dos participis",
            "Participi regular (compte amb el gerundi)"]


def familia(inf: str, ger: str, parts: list[str]) -> str:
    if len(parts) > 1:
        return FAMILIAS[3]
    p = parts[0]
    if p.endswith("s"):
        return FAMILIAS[0]
    if p.endswith(("gut", "cut", "çut")):
        return FAMILIAS[2]
    return FAMILIAS[4] if _sin_acentos(p) == _sin_acentos(_part_regular(inf)) else FAMILIAS[1]


def construir(verbos) -> list[dict]:
    preguntas = []
    for inf, ger, parts in verbos:
        reg_ger, reg_part = _ger_regular(inf), _part_regular(inf)
        errores_ger, errores_part = _error_regular(inf, reg_ger, [ger], "gerundi"), _error_regular(inf, reg_part, parts, "participi")
        if inf == "ésser":  # verbo sin forma regular posible: solo el error clásico
            errores_ger, errores_part = {}, {"sigut": "«Sigut» és incorrecte: el participi d'ésser és «estat»."}
        explicacion = (f"{inf} → gerundi «{ger}», participi «{' o '.join(parts)}». "
                       + ("El gerundi és regular. " if ger == reg_ger else f"El gerundi és irregular (no és «{reg_ger}»). ")
                       + ("El participi és regular." if reg_part in parts else f"El participi és irregular (no és «{reg_part}»)."))
        dificultad = min(5, max(1, 3 + (ger != reg_ger) + (len(parts) > 1) - (inf in FRECUENTES)))
        preguntas.append({
            "tema": "El verb", "subtema": "Gerundis i participis irregulars", "concepto": familia(inf, ger, parts),
            "dificultad": dificultad, "enunciado": f"Verb: «{inf}».",
            "tipo": "escrita",
            "campos": [{"etiqueta": "Gerundi", "validas": [ger], "errores": errores_ger},
                       {"etiqueta": "Participi", "validas": parts, "errores": errores_part}],
            "explicacion": explicacion, "ayuda_larga": AYUDA, "fuente_pagina": 6, "fuente_cara": 10,
        })
    return preguntas


def banco(verbos, asignatura: dict) -> dict:
    preguntas = [{"id": f"cat-v1-{i:04d}", "bloque": asignatura["nombre"], **q} for i, q in enumerate(construir(verbos), 1)]
    return {"asignatura": asignatura,
            "fuente": {"nombre": "Català Apunts de gramàtica", "archivo": PDF.name},
            "lote": {"modelo": "tools/build_verbs.py", "version_prompt": "v1"}, "preguntas": preguntas}


def main() -> None:
    asignatura = json.loads((ROOT / "banks" / "catala" / "retiradas" / "N1.json").read_text(encoding="utf-8"))["asignatura"]  # N1 está retirado
    verbos = leer_pdf()
    SALIDA.write_text(json.dumps(banco(verbos, asignatura), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{SALIDA.name}: {len(verbos)} verbos")


if __name__ == "__main__":
    main()
