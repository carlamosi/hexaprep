"""Administra los perfiles online (un esquema de Postgres por persona). Usa DATABASE_URL (o POSTGRES_URL).

  python tools/perfiles.py plantilla [--rehacer]      crea el esquema «plantilla» con el catálogo del esquema public
  python tools/perfiles.py migrar-publico EMAIL       copia TODO el esquema public (progreso incluido) al perfil de EMAIL
  python tools/perfiles.py listar                     perfiles existentes
"""
import argparse
import sys
from pathlib import Path

from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from hexaprep import perfiles  # noqa: E402
from hexaprep.db import database_url, get_engine_online  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="orden", required=True)
    sub.add_parser("plantilla").add_argument("--rehacer", action="store_true")
    sub.add_parser("migrar-publico").add_argument("email")
    sub.add_parser("listar")
    a = ap.parse_args(argv)
    url = database_url()
    if not url:
        print("Falta DATABASE_URL (o POSTGRES_URL).")
        return 1
    engine = get_engine_online(url)
    with engine.begin() as c:
        if a.orden == "plantilla":
            if perfiles.existe(c, perfiles.PLANTILLA):
                if not a.rehacer:
                    print("La plantilla ya existe (usa --rehacer para recrearla).")
                    return 1
                c.execute(text(f'DROP SCHEMA "{perfiles.PLANTILLA}" CASCADE'))
            n = perfiles.clonar_esquema(c, "public", perfiles.PLANTILLA, "catalogo")
            print(f"Plantilla creada con {n} filas de catálogo.")
        elif a.orden == "migrar-publico":
            esquema = perfiles.esquema_de(a.email)
            if perfiles.existe(c, esquema):
                print(f"El perfil de {a.email} ya existe ({esquema}); no se toca.")
                return 1
            n = perfiles.clonar_esquema(c, "public", esquema, "todo")
            print(f"Perfil de {a.email.lower()} creado en {esquema} con {n} filas.")
        else:
            for (s,) in c.execute(text("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'u!_%' ESCAPE '!' ORDER BY 1")):
                print(s)
    return 0


if __name__ == "__main__":
    sys.exit(main())
