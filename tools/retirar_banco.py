"""Retira de la práctica todas las preguntas de un banco (excluidas, sin borrar): python tools/retirar_banco.py banks/catala/retiradas/N1.json

La base es la de HEXAPREP_DATA (carpeta, por defecto data/) o la que se indique con --db. Se reactivan desde el editor de la app.
"""
import argparse
import os
import sys
from pathlib import Path

from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from hexaprep.bank import load_bank  # noqa: E402
from hexaprep.db import get_engine, upgrade  # noqa: E402
from hexaprep.quality import retire_claves  # noqa: E402

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("banco", type=Path)
    ap.add_argument("--db", type=Path, default=Path(os.environ.get("HEXAPREP_DATA", ROOT / "data")) / "hexaprep.db")
    a = ap.parse_args()
    engine = get_engine(a.db)
    upgrade(engine)
    with Session(engine) as s:
        print(f"{a.banco.name}: {retire_claves(s, [q.id for q in load_bank(a.banco).preguntas])} preguntas retiradas")
    engine.dispose()
