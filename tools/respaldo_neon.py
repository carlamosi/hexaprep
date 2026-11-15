"""Copia local de cada perfil de Neon: un SQLite por persona en data/respaldos/ (la app local lo abre tal cual).

Uso: python tools/respaldo_neon.py        (sin argumentos lee la conexión de .env.local; o DATABASE_URL=<url directa>)
Conserva las 8 copias más recientes de cada persona. Hay una tarea semanal de Windows que lo ejecuta (ver docs/ESTADO.md).
"""
import os
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "tools"))

from hexaprep import perfiles  # noqa: E402
from hexaprep.db import database_url, get_engine, get_engine_online  # noqa: E402
from migrar_a_postgres import migrar  # noqa: E402


KEEP = 8


def cargar_env_local() -> None:
    """Si no hay DATABASE_URL, toma la conexión directa de .env.local (la deja `vercel env pull`)."""
    if os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL"):
        return
    archivo = ROOT / ".env.local"
    valores = {}
    for linea in archivo.read_text(encoding="utf-8").splitlines() if archivo.is_file() else []:
        if "=" in linea and not linea.startswith("#"):
            k, v = linea.split("=", 1)
            valores[k.strip()] = v.strip().strip('"')
    if url := valores.get("DATABASE_URL_UNPOOLED") or valores.get("DATABASE_URL"):
        os.environ["DATABASE_URL"] = url


def podar(carpeta: Path, esquema: str) -> int:
    """Borra las copias antiguas de un esquema y deja las KEEP más recientes (el nombre lleva la fecha)."""
    viejas = sorted(carpeta.glob(f"{esquema}-*.db"))[:-KEEP]
    for f in viejas:
        f.unlink()
    return len(viejas)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    cargar_env_local()
    url = database_url()
    if not url:
        print("Falta DATABASE_URL (o POSTGRES_URL).")
        return 1
    online = get_engine_online(url)
    with online.connect() as c:
        esquemas = [s for (s,) in c.execute(text("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'u!_%' ESCAPE '!' OR schema_name LIKE 'archivo!_%' ESCAPE '!' ORDER BY 1"))]
    destino = ROOT / "data" / "respaldos"
    destino.mkdir(parents=True, exist_ok=True)
    for esquema in esquemas:
        archivo = destino / f"{esquema}-{date.today():%Y%m%d}.db"
        if archivo.exists():
            archivo.unlink()
        n = migrar(perfiles.engine_de(online, esquema), get_engine(archivo))
        print(f"{esquema}: {n} filas en {archivo.relative_to(ROOT)}" + (f" ({b} copias antiguas borradas)" if (b := podar(destino, esquema)) else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
