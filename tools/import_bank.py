"""Importa bancos JSON en la base local (idempotente). Uso: python tools/import_bank.py banks/economia/T1.json ...

La base es la de HEXAPREP_DATA (carpeta, por defecto data/) o la que se indique con --db.
"""
import argparse
import os
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from hexaprep.bank import load_bank, validate_bank
from hexaprep.db import get_engine, upgrade
from hexaprep.importer import import_bank

ROOT = Path(__file__).resolve().parents[1]


def main(db_path: Path, files: list[Path]) -> int:
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    engine = get_engine(db_path)
    upgrade(engine)
    failed = 0
    for f in map(Path, files):
        errors = validate_bank(f)
        if errors:
            failed += 1
            print(f"ERROR {f.name}: {errors[0]}")
            continue
        with Session(engine) as session:
            r = import_bank(session, load_bank(f), archivo=f.name)
        print(f"{f.name}: {r.created} creadas, {r.updated} actualizadas, {r.unchanged} sin cambios")
    engine.dispose()
    return 1 if failed else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--db", type=Path, default=Path(os.environ.get("HEXAPREP_DATA", ROOT / "data")) / "hexaprep.db")
    args = ap.parse_args()
    sys.exit(main(args.db, args.files))
