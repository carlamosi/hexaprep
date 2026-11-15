"""Administra los perfiles online (un esquema de Postgres por persona). Usa DATABASE_URL (o POSTGRES_URL).

  python tools/perfiles.py plantilla [--rehacer]      crea el esquema «plantilla» con el catálogo del esquema public
  python tools/perfiles.py migrar-publico EMAIL       copia TODO el esquema public (progreso incluido) al perfil de EMAIL
  python tools/perfiles.py listar                     perfiles existentes
  python tools/perfiles.py archivar EMAIL             renombra su esquema (conserva los datos) para que empiece de cero
"""
import argparse
import sys
from datetime import date
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
    sub.add_parser("archivar").add_argument("email")
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
        elif a.orden == "archivar":  # empezar de cero: el esquema se renombra (no se borra) y el perfil se recrea en el próximo acceso
            esquema = perfiles.esquema_de(a.email)
            if not perfiles.existe(c, esquema):
                print(f"{a.email} no tiene perfil.")
                return 1
            nuevo = f"archivo_{esquema[2:]}_{date.today():%Y%m%d}"
            c.execute(text(f'ALTER SCHEMA "{perfiles._q(esquema)[1:-1]}" RENAME TO "{perfiles._q(nuevo)[1:-1]}"'))
            print(f"Perfil archivado como {nuevo}; empezará de cero en su próximo acceso.")
        else:
            for (s,) in c.execute(text("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'u!_%' ESCAPE '!' ORDER BY 1")):
                print(s)
    return 0


if __name__ == "__main__":
    sys.exit(main())
