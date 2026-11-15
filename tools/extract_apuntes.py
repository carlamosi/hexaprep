"""Extrae el texto de los PDF de apuntes (una página A4 por página, sin imposición) a banks/<asignatura>/texto/*.md.

Uso (desde la raíz): python tools/extract_apuntes.py
Cada página queda marcada con `<!-- pagina N -->` (para `fuente_pagina`; en estos PDF pagina = cara).
Los PDF que son solo imagen (sin texto) se renderizan a PNG en banks/<asignatura>/texto/img/ para poder leerlos a ojo.
"""
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
# (asignatura, PDF en fuentes/, salida en texto/)
PDFS = [
    ("economia", "Economia_T1_Apuntes.pdf", "t1_apuntes.md"),
    ("economia", "Economia_T2_Apuntes.pdf", "t2_apuntes.md"),
    ("economia", "Economia_T3_Apuntes.pdf", "t3_apuntes.md"),
    ("quimica", "Quimica_T3_Formulacio_organica.pdf", "t3_formulacio_organica.md"),
    ("mates", "Mates_Algebra_llibre.pdf", "algebra_llibre.md"),
    ("mates", "Mates_Examen_equacions_inequacions_solucions.pdf", "examen_equacions_inequacions.md"),
    ("mates", "Mates_Fitxa_exponencials_logaritmiques.pdf", "fitxa_exp_log.md"),
    ("mates", "Mates_Propietats_potencies_radicals_logaritmes.pdf", "propietats.md"),
    ("mates", "Mates_Equacions_racionals_irracionals_bicuadrades.pdf", "equacions_racionals_irracionals.md"),
    ("mates", "Mates_Inequacions.pdf", "inequacions.md"),
    ("mates", "Mates_Matrius_exercicis.pdf", "matrius_exercicis.md"),
    ("catala", "Catala_Normativa_general.pdf", "normativa.md"),
]


def main() -> None:
    for asig, pdf_name, salida in PDFS:
        pdf_path = ROOT / "banks" / asig / "fuentes" / pdf_name
        destino = ROOT / "banks" / asig / "texto" / salida
        destino.parent.mkdir(parents=True, exist_ok=True)
        partes, sin_texto = [], []
        with pdfplumber.open(pdf_path) as pdf:
            for n, p in enumerate(pdf.pages, start=1):
                texto = (p.extract_text() or "").strip()
                partes.append(f"<!-- pagina {n} -->\n{texto}")
                if not texto:
                    sin_texto.append(n)
                    img = destino.parent / "img" / f"{destino.stem}-p{n}.png"
                    img.parent.mkdir(parents=True, exist_ok=True)
                    p.to_image(resolution=130).original.convert("RGB").save(img, optimize=True)
        destino.write_text("\n\n".join(partes) + "\n", encoding="utf-8")
        print(f"{asig}/texto/{salida}: {len(partes)} págs" + (f", sin texto (renderizadas a PNG): {sin_texto}" if sin_texto else ""))


if __name__ == "__main__":
    main()
