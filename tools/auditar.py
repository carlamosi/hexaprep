"""Auditoría de solo lectura: intentos frente a eventos, dominio frente a su reconstrucción, huérfanos, duplicados, abandonos.

  python tools/auditar.py                      base local (data/hexaprep.db o HEXAPREP_DATA)
  DATABASE_URL=... python tools/auditar.py ESQUEMA   un perfil de Neon (esquema u_...); solo lee
"""
import json
import os
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from hexaprep.auditoria import auditar  # noqa: E402
from hexaprep.db import database_url, get_engine, get_engine_online  # noqa: E402


def main(argv: list[str]) -> int:
    url = database_url()
    if url:
        if not argv:
            print("Con DATABASE_URL indica el esquema del perfil (python tools/auditar.py u_...).")
            return 1
        engine = get_engine_online(url)
        with Session(engine) as s:
            s.execute(text("SET TRANSACTION READ ONLY"))
            s.execute(text("SELECT set_config('search_path', :e, true)"), {"e": argv[0]})
            r = auditar(s)
            s.rollback()
    else:
        datos = Path(os.environ.get("HEXAPREP_DATA", ROOT / "data"))
        with Session(get_engine(datos / "hexaprep.db")) as s:
            r = auditar(s)
    print(json.dumps(r, ensure_ascii=False, indent=1))
    return 0 if r["ok"] else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
