"""Copia local de cada perfil de Neon: un SQLite por persona en data/respaldos/ (la app local lo abre tal cual).

Uso: DATABASE_URL=<url directa> python tools/respaldo_neon.py        (repítelo cuando quieras, p. ej. cada semana)
"""
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


def main() -> int:
    url = database_url()
    if not url:
        print("Falta DATABASE_URL (o POSTGRES_URL).")
        return 1
    online = get_engine_online(url)
    with online.connect() as c:
        esquemas = [s for (s,) in c.execute(text("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'u!_%' ESCAPE '!' ORDER BY 1"))]
    destino = ROOT / "data" / "respaldos"
    destino.mkdir(parents=True, exist_ok=True)
    for esquema in esquemas:
        archivo = destino / f"{esquema}-{date.today():%Y%m%d}.db"
        if archivo.exists():
            archivo.unlink()
        n = migrar(perfiles.engine_de(online, esquema), get_engine(archivo))
        print(f"{esquema}: {n} filas en {archivo.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
