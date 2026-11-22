"""Reorganiza el temario de Català según banks/catala/estructura.json sin perder progreso (ver hexaprep/reorganizar.py).

  python tools/reorganizar_catalogo.py --dry-run          base local (data/hexaprep.db, HEXAPREP_DATA o --db): informe y se revierte
  python tools/reorganizar_catalogo.py                    aplica a la base local
  DATABASE_URL=... python tools/reorganizar_catalogo.py --dry-run     Neon: la plantilla y cada perfil u_..., una transacción por esquema
  DATABASE_URL=... python tools/reorganizar_catalogo.py --esquema u_abc123

Idempotente. Ejecútala ANTES de cargar los bancos nuevos (`tools/actualizar_perfiles.py --solo bancos`): así el importador
encuentra los conceptos ya en su sitio. Con Neon usa la URL directa (sin pooler) y haz antes `python tools/respaldo_neon.py`.
"""
import argparse
import os
import sys
from pathlib import Path

from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "tools"))

from hexaprep.db import database_url, get_engine, get_engine_online, upgrade  # noqa: E402
from hexaprep.reorganizar import Informe, cargar_estructura, reorganizar  # noqa: E402

ETIQUETAS = [("renombrados", "renombrados"), ("creados", "creados"), ("movidos", "conceptos movidos"),
             ("fusionados", "fusionados"), ("partidos", "partidos"), ("subtemas_retirados", "subtemas vaciados"),
             ("temas_retirados", "temas vaciados")]


def imprimir(nombre: str, r: Informe, detalle: bool) -> None:
    print(f"== {nombre}: " + (", ".join(f"{et} {len(getattr(r, k))}" for k, et in ETIQUETAS if getattr(r, k))
                              or "sin cambios") + f"; temas y subtemas reordenados {r.reordenados}; "
          f"intentos reasignados {r.intentos_reasignados}; dominios reconstruidos {r.dominios_reconstruidos}; "
          f"snapshots regenerados {r.snapshots_regenerados}")
    if detalle:
        for k, et in ETIQUETAS[2:5]:
            for x in getattr(r, k):
                print(f"   {et}: {x}")
    for x in r.faltan:
        print(f"   AVISO sin origen (lo creará el importador, sin progreso previo): {x}")
    for x in r.huerfanos:
        print(f"   ATENCIÓN: {x}")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="informa y revierte cada transacción")
    ap.add_argument("--db", type=Path, default=Path(os.environ.get("HEXAPREP_DATA", ROOT / "data")) / "hexaprep.db")
    ap.add_argument("--estructura", type=Path, default=ROOT / "banks" / "catala" / "estructura.json")
    ap.add_argument("--esquema", help="solo este esquema de Neon")
    ap.add_argument("--detalle", action="store_true", help="lista cada concepto movido, fusionado o partido")
    a = ap.parse_args(argv)
    estructura = cargar_estructura(a.estructura)
    informes = []

    def pasada(nombre: str, motor, en_seco: bool = False, callar: bool = False) -> bool:
        with Session(motor) as s:
            r = reorganizar(s, estructura)
            if a.dry_run or en_seco or r.huerfanos:
                s.rollback()
            else:
                s.commit()
        informes.append(r)
        if not callar:
            imprimir(nombre, r, a.detalle)
        return not r.huerfanos

    url = database_url()
    if url:
        from actualizar_perfiles import esquemas  # noqa: E402
        from hexaprep import perfiles  # noqa: E402
        engine = get_engine_online(url)
        with engine.connect() as c:
            destinos = [a.esquema] if a.esquema else esquemas(c)
        if not a.dry_run:  # dos fases: nada se confirma en ningún esquema si alguno trae huérfanos
            if not all([pasada(e, perfiles.engine_de(engine, e), en_seco=True, callar=True) for e in destinos]):
                for e, r in zip(destinos, informes):
                    imprimir(e, r, False)
                print("Validación previa fallida: no se guardó nada en ningún esquema.")
                return 2
            informes.clear()
        for esquema in destinos:
            pasada(esquema, perfiles.engine_de(engine, esquema))
    else:
        engine = get_engine(a.db)
        upgrade(engine)
        pasada(str(a.db), engine)
    if any(r.huerfanos for r in informes):
        print("Hay temas o subtemas fuera del mapa con contenido: esas transacciones se revirtieron.")
        return 2
    print("(en seco: no se guardó nada)" if a.dry_run else "Hecho.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
