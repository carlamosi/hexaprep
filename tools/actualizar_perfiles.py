"""Pone al día TODOS los perfiles de Neon (la plantilla y cada esquema u_...): migraciones de tablas y bancos de preguntas.

  python tools/actualizar_perfiles.py                    migraciones y bancos en todos los esquemas
  python tools/actualizar_perfiles.py --solo bancos      solo cargar los bancos (banks/*/*.json)
  python tools/actualizar_perfiles.py --solo migraciones solo aplicar migraciones nuevas
  python tools/actualizar_perfiles.py --esquema NOMBRE   solo un esquema

Usa DATABASE_URL (mejor la URL directa, sin pooler). Es idempotente: lo ya cargado no se duplica ni cambia el progreso.
Un esquema sin `alembic_version` (creado antes de existir esta herramienta) adopta la versión del esquema public, porque
se clonó de él.
"""
import argparse
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "tools"))

from hexaprep import perfiles  # noqa: E402
from hexaprep.bank import load_bank, validate_bank  # noqa: E402
from hexaprep.db import database_url, get_engine_online, upgrade  # noqa: E402
from hexaprep.importer import import_bank  # noqa: E402
from import_bank import descubrir_bancos  # noqa: E402


def esquemas(conn) -> list[str]:
    """La plantilla y los perfiles activos (los archivados y public no se tocan)."""
    nombres = [s for (s,) in conn.execute(text("SELECT schema_name FROM information_schema.schemata ORDER BY 1"))]
    return [s for s in nombres if s == perfiles.PLANTILLA or s.startswith("u_")]


def adoptar_version(conn, esquema: str) -> bool:
    """Si el esquema no tiene alembic_version, copia la de public. Devuelve si lo hizo."""
    q = perfiles._q(esquema)
    if conn.scalar(text("SELECT to_regclass(:t)"), {"t": f"{q}.alembic_version"}):
        return False
    conn.execute(text(f"CREATE TABLE {q}.alembic_version (LIKE public.alembic_version INCLUDING ALL)"))
    conn.execute(text(f"INSERT INTO {q}.alembic_version SELECT * FROM public.alembic_version"))
    return True


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--solo", choices=["bancos", "migraciones"])
    ap.add_argument("--esquema")
    a = ap.parse_args(argv)
    url = database_url()
    if not url:
        print("Falta DATABASE_URL (o POSTGRES_URL).")
        return 1
    engine = get_engine_online(url)
    with engine.connect() as c:
        destinos = [a.esquema] if a.esquema else esquemas(c)
    bancos = [f for f in descubrir_bancos() if not validate_bank(f)] if a.solo != "migraciones" else []
    for esquema in destinos:
        if a.solo != "bancos":
            with engine.begin() as c:
                if adoptar_version(c, esquema):
                    print(f"{esquema}: adopta la versión de las tablas de public")
            upgrade(engine, esquema)
            print(f"{esquema}: migraciones al día")
        if bancos:
            motor = perfiles.engine_de(engine, esquema)
            creadas = actualizadas = 0
            for f in bancos:
                with Session(motor) as s:
                    r = import_bank(s, load_bank(f), archivo=f.name)
                creadas, actualizadas = creadas + r.created, actualizadas + r.updated
            print(f"{esquema}: {len(bancos)} bancos, {creadas} preguntas nuevas, {actualizadas} actualizadas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
