"""Arranque: python -m hexaprep   |   python -m hexaprep --restore <copia.db>"""
import argparse
import os
import sys
from pathlib import Path

import uvicorn

from .api import ROOT, create_app
from .backup import BackupError, restore
from .db import DatabaseCorrupt, check_integrity, get_engine


def main(argv: list[str] | None = None, data: Path | None = None) -> int:
    ap = argparse.ArgumentParser(prog="hexaprep")
    ap.add_argument("--restore", metavar="COPIA", help="restaura la base desde una copia y sale")
    args = ap.parse_args(argv)
    data = Path(data or os.environ.get("HEXAPREP_DATA", ROOT / "data"))
    db = data / "hexaprep.db"

    if args.restore:
        try:
            restore(Path(args.restore), db)
        except (BackupError, OSError) as e:
            print(f"ERROR: no se pudo restaurar: {e}")
            return 1
        print(f"Copia restaurada en {db}. La base anterior queda junto a ella con el sufijo .pre-restore-")
        return 0

    if db.exists():
        engine = get_engine(db)
        try:
            check_integrity(engine)
        except DatabaseCorrupt:
            print(f"La base de datos está dañada: {db}\n"
                  f"Tus copias de seguridad están en {data / 'backups'}.\n"
                  "Para recuperar una: python -m hexaprep --restore <ruta de la copia>")
            return 1
        finally:
            engine.dispose()

    uvicorn.run(create_app(data_dir=data), host="127.0.0.1", port=int(os.environ.get("HEXAPREP_PORT", "8000")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
