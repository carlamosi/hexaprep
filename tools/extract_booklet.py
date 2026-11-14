"""Extrae el texto de un booklet A5 grapado (hojas A4 apaisadas con dos paginas A5 cada una).

Uso: python tools/extract_booklet.py booklet.pdf [salida.md]

Se usa pdfplumber porque el pdftotext instalado (Xpdf) no admite recortar por mitades (-x -y -W -H).
"""
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import pdfplumber


@dataclass
class BlockText:
    bloque: str
    pagina: int  # pagina A5, 1-based (1 = portada)
    cara: int  # cara del PDF, 1-based (para abrir con #page=)
    texto: str


def imposition(n_faces: int) -> list[tuple[int, int]]:
    """Por cada cara (0-based): (A5 izquierda, A5 derecha), con indices A5 0-based y T = 2 * n_faces."""
    t = 2 * n_faces
    return [(t - 1 - 2 * (f // 2), 2 * (f // 2)) if f % 2 == 0 else (2 * (f // 2) + 1, t - 2 - 2 * (f // 2))
            for f in range(n_faces)]


INDEX_LINE = re.compile(r"^(?P<name>.*?\S)\s+(?P<a>\d+)(?:\s*[–—-]\s*(?P<b>\d+))?$")


def _parse_index(cover: str, last_printed: int) -> list[tuple[str, int, int]]:
    """Entradas del indice de la portada: (nombre, primera, ultima) con numeros impresos (portada = 0)."""
    entries = []
    for line in cover.splitlines():
        m = INDEX_LINE.match(line.strip())
        if not m or re.match(r"(?i)tema\b", m["name"]):
            continue
        a, b = int(m["a"]), int(m["b"] or m["a"])
        if 1 <= a <= b <= last_printed and (not entries or a > entries[-1][2]):
            entries.append((m["name"], a, b))
    return entries


def extract(pdf: Path) -> list[BlockText]:
    with pdfplumber.open(pdf) as doc:
        faces = imposition(len(doc.pages))
        texts: dict[int, tuple[int, str]] = {}
        for f, (page, (left, right)) in enumerate(zip(doc.pages, faces)):
            mid = page.width / 2
            for idx, box in ((left, (0, 0, mid, page.height)), (right, (mid, 0, page.width, page.height))):
                texts[idx] = (f + 1, (page.crop(box).extract_text() or "").strip())
    total = 2 * len(faces)
    index = _parse_index(texts[0][1], total - 2)
    blocks = []
    for i in range(total):
        # el numero impreso de una pagina interior coincide con su indice A5 0-based
        if i == 0:
            name = "Portada"
        elif i == total - 1:
            name = "Contraportada"
        else:
            name = next((n for n, a, b in index if a <= i <= b), "Sin bloque")
        blocks.append(BlockText(bloque=name, pagina=i + 1, cara=texts[i][0], texto=texts[i][1]))
    return blocks


def to_markdown(blocks: list[BlockText]) -> str:
    out, current = [], None
    for b in blocks:
        if b.bloque != current:
            out.append(f"\n## {b.bloque}\n")
            current = b.bloque
        out.append(f"<!-- pagina {b.pagina} cara {b.cara} -->\n{b.texto}\n")
    return "\n".join(out).strip() + "\n"


if __name__ == "__main__":
    md = to_markdown(extract(Path(sys.argv[1])))
    if len(sys.argv) > 2:
        Path(sys.argv[2]).write_text(md, encoding="utf-8")
    else:
        sys.stdout.reconfigure(encoding="utf-8")
        print(md)
