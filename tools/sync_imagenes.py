"""Copia banks/*/img/**/*.png a frontend/public/img/ (online no existe banks/, las imágenes salen del frontend)."""
import shutil
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DEST = RAIZ / "frontend" / "public" / "img"

n = 0
for origen in (RAIZ / "banks").glob("*/img"):
    for f in origen.rglob("*.png"):
        destino = DEST / f.relative_to(origen)
        destino.parent.mkdir(parents=True, exist_ok=True)
        if not destino.exists() or destino.read_bytes() != f.read_bytes():
            shutil.copyfile(f, destino)
            n += 1
print(f"{n} imágenes copiadas a {DEST}")
