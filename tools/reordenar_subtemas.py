"""Fija el orden de los subtemas de un tema (no mueve preguntas: el progreso no se toca).

  python tools/reordenar_subtemas.py            base local (HEXAPREP_DATA o data/)
  python tools/reordenar_subtemas.py --neon     todos los esquemas de Neon (DATABASE_URL, mejor la directa)
"""
import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "tools"))

from hexaprep.models import Asignatura, Bloque, Subtema, Tema  # noqa: E402

ORDEN = {("Matemáticas", "T1 Ecuaciones, sistemas e inecuaciones"): [
    "Potencias, radicales y logaritmos", "Ecuaciones bicuadradas y polinómicas", "Ecuaciones radicales y racionales",
    "Ecuaciones exponenciales", "Ecuaciones logarítmicas", "Ecuaciones con valor absoluto", "Sistemas de ecuaciones",
    "Inecuaciones", "Problemas de ecuaciones y sistemas"]}


def aplicar(session: Session, orden: dict = ORDEN) -> int:
    """Devuelve cuántos subtemas cambiaron de orden. Los que no se nombran quedan detrás, en su orden actual."""
    cambios = 0
    for (asig, tema_n), nombres in orden.items():
        tema = session.scalar(select(Tema).join(Bloque, Bloque.id == Tema.bloque_id).join(Asignatura, Asignatura.id == Bloque.asignatura_id)
                              .where(Asignatura.nombre == asig, Tema.nombre == tema_n, Tema.deleted_at.is_(None)))
        if tema is None:
            continue
        subs = list(session.scalars(select(Subtema).where(Subtema.tema_id == tema.id, Subtema.deleted_at.is_(None))))
        resto = sorted((s for s in subs if s.nombre not in nombres), key=lambda s: (s.orden, s.nombre))
        for i, s in enumerate(sorted((s for s in subs if s.nombre in nombres), key=lambda s: nombres.index(s.nombre)) + resto):
            if s.orden != i:
                s.orden, cambios = i, cambios + 1
    session.commit()
    return cambios


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--neon", action="store_true")
    ap.add_argument("--db", type=Path, default=Path(os.environ.get("HEXAPREP_DATA", ROOT / "data")) / "hexaprep.db")
    a = ap.parse_args()
    if not a.neon:
        from hexaprep.db import get_engine
        with Session(get_engine(a.db)) as s:
            print(f"local: {aplicar(s)} subtemas cambiados")
        return 0
    from actualizar_perfiles import esquemas
    from hexaprep import perfiles
    from hexaprep.db import database_url, get_engine_online
    engine = get_engine_online(database_url())
    with engine.connect() as c:
        destinos = esquemas(c)
    for e in destinos:
        with Session(perfiles.engine_de(engine, e)) as s:
            print(f"{e}: {aplicar(s)} subtemas cambiados")
    return 0


if __name__ == "__main__":
    sys.exit(main())
