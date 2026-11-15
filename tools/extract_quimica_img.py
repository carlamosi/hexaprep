"""Recorta de banks/quimica/fuentes/Quimica_T2_Laboratori.pdf los pictogramas y el material de laboratorio.

Uso (desde la raíz): python tools/extract_quimica_img.py
Escribe PNG en banks/quimica/img/{pictogrames,material}/ y banks/quimica/img/INDEX.md (archivo, nombre en el booklet, página).
Cada entrada es (cara del PDF, nº de imagen en la cara, carpeta/archivo, nombre que da el booklet, página A5).
"""
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "banks" / "quimica" / "fuentes" / "Quimica_T2_Laboratori.pdf"
OUT = ROOT / "banks" / "quimica" / "img"
ANCHO_MAX = 420  # px

IMAGENES = [
    # pictogramas (páginas 5 y 6)
    (5, 6, "pictogrames/explosiu", "Explosiu", 5), (5, 7, "pictogrames/inflamable", "Inflamable", 5),
    (5, 8, "pictogrames/comburent", "Comburent", 5), (5, 9, "pictogrames/gas-pressio", "Gas a pressió", 5),
    (5, 10, "pictogrames/corrosiu", "Corrosiu", 5), (6, 0, "pictogrames/irritacio", "Irritació cutània", 6),
    (6, 1, "pictogrames/toxicitat", "Toxicitat aguda", 6), (6, 2, "pictogrames/aspiracio", "Perillós per aspiració", 6),
    (6, 3, "pictogrames/medi-aquatic", "Perillós per al medi aquàtic", 6),
    # medir volums (página 7)
    (7, 5, "material/proveta", "Proveta graduada", 7), (7, 6, "material/pipeta-graduada", "Pipeta graduada", 7),
    (7, 7, "material/pipeta-aforada", "Pipeta aforada", 7), (7, 8, "material/bureta", "Bureta", 7),
    (7, 9, "material/matras-aforat", "Matràs aforat", 7), (7, 10, "material/pera-goma", "Pera de goma", 7),
    # contenir i pesar (página 8)
    (8, 0, "material/vas-precipitats", "Vas de precipitats", 8), (8, 1, "material/matras-erlenmeyer", "Matràs Erlenmeyer", 8),
    (8, 2, "material/flascons", "Flascons", 8), (8, 4, "material/flasco-rentador", "Flascó rentador", 8),
    (8, 5, "material/balanca", "Balança", 8), (8, 6, "material/balanca-analitica", "Balança analítica", 8),
    (8, 8, "material/espatula", "Espàtules", 8), (8, 9, "material/vidre-rellotge", "Vidre de rellotge", 8),
    (8, 10, "material/pesasubstancies", "Pesasubstàncies", 8), (8, 11, "material/morter", "Morter", 8),
    # escalfar (página 9)
    (9, 13, "material/bec-bunsen", "Bec Bunsen", 9),
    # filtrar i separar (página 10)
    (10, 0, "material/muntatge-buchner", "Muntatge Büchner + kitasatos", 10), (10, 1, "material/embut", "Embut", 10),
    (10, 2, "material/embut-buchner", "Embut Büchner", 10), (10, 3, "material/kitasatos", "Kitasatos", 10),
    (10, 4, "material/embut-decantacio", "Embut de decantació", 10),
    # fer reaccions i obtenir el producte (página 11)
    (11, 0, "material/balo-reaccio", "Baló de reacció", 11), (11, 1, "material/balo-fons-rodo", "Baló de fons rodó", 11),
    (11, 2, "material/balo-tres-boques", "Baló de tres boques", 11), (11, 3, "material/tubs-assaig", "Tubs d'assaig", 11),
    (11, 4, "material/gresol", "Gresol", 11), (11, 5, "material/refrigerants", "Refrigerants", 11),
    (11, 6, "material/rotavapor", "Rotavapor", 11), (11, 7, "material/cristal-litzador", "Cristal·litzador", 11),
    (11, 8, "material/assecador", "Assecador", 11),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    indice = ["# Imágenes de Química (recortadas del booklet)", "",
              "| archivo (relativo a banks/quimica/img/) | nombre en el booklet | página |", "|---|---|---|"]
    with pdfplumber.open(PDF) as pdf:
        for cara, k, ruta, nombre, pagina in IMAGENES:
            p = pdf.pages[cara - 1]
            im = p.images[k]
            assert 0 <= im["x0"] and im["x1"] <= p.width, f"imagen fuera de la cara: {ruta}"
            bbox = (max(im["x0"] - 1, 0), max(im["top"] - 1, 0), min(im["x1"] + 1, p.width), min(im["bottom"] + 1, p.height))
            img = p.crop(bbox).to_image(resolution=250).original.convert("RGB")
            if img.width > ANCHO_MAX:
                img = img.resize((ANCHO_MAX, round(img.height * ANCHO_MAX / img.width)))
            destino = OUT / f"{ruta}.png"
            destino.parent.mkdir(parents=True, exist_ok=True)
            img.save(destino, optimize=True)
            indice.append(f"| {ruta}.png | {nombre} | {pagina} |")
    (OUT / "INDEX.md").write_text("\n".join(indice) + "\n", encoding="utf-8")
    print(f"{len(IMAGENES)} imágenes en {OUT}")


if __name__ == "__main__":
    main()
