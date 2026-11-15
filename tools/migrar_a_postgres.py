"""Copia la base SQLite local a la base online (Postgres) y deja allí el esquema listo.

Uso (desde la raíz): DATABASE_URL=<url de Neon> python tools/migrar_a_postgres.py [--db data/hexaprep.db]
Solo copia a un destino vacío (no duplica si se repite). Los bancos ya viajan dentro de la base (preguntas y progreso).
"""
import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import Engine, func, select

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from hexaprep.db import database_url, get_engine, get_engine_online, upgrade  # noqa: E402
from hexaprep.models import Asignatura, Base  # noqa: E402

LOTE = 500


def migrar(origen: Engine, destino: Engine) -> int:
    """Copia todas las tablas (en orden de dependencias) y devuelve las filas copiadas; 0 si el destino ya tenía datos."""
    upgrade(destino)
    with destino.connect() as d:
        if d.scalar(select(func.count()).select_from(Asignatura.__table__)):
            return 0
    total = 0
    with origen.connect() as o, destino.begin() as d:
        for tabla in Base.metadata.sorted_tables:
            filas = [dict(r._mapping) for r in o.execute(select(tabla))]
            for i in range(0, len(filas), LOTE):
                d.execute(tabla.insert(), filas[i:i + LOTE])
            total += len(filas)
    return total


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", type=Path, default=Path(os.environ.get("HEXAPREP_DATA", ROOT / "data")) / "hexaprep.db")
    a = ap.parse_args()
    url = database_url()
    if not url or not a.db.is_file():
        sys.exit("Falta DATABASE_URL (o POSTGRES_URL) o no existe la base local.")
    n = migrar(get_engine(a.db), get_engine_online(url))
    print(f"{n} filas copiadas" if n else "El destino ya tenía datos: no se ha copiado nada.")
