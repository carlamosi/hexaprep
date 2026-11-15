"""Prueba de humo contra Postgres (Neon): responde por la API real en un esquema temporal y relee todo con una conexión nueva.

Uso: DATABASE_URL=<url> python tools/prueba_online.py     (crea y borra un esquema «prueba_tmp»; no toca ningún perfil)
Necesita el esquema «plantilla» (python tools/perfiles.py plantilla).
"""
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import func, select, text

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("HEXAPREP_TZ", "Europe/Madrid")

from hexaprep import perfiles, tiempo  # noqa: E402
from hexaprep.api import create_app  # noqa: E402
from hexaprep.db import database_url, get_engine_online  # noqa: E402
from hexaprep.models import Ajuste, Dominio, DominioSnapshot, Evento, Intento, Sesion  # noqa: E402

TMP = "prueba_tmp"


def main() -> int:
    url = database_url()
    if not url:
        print("Falta DATABASE_URL")
        return 1
    admin = get_engine_online(url)
    with admin.begin() as c:
        c.execute(text(f'DROP SCHEMA IF EXISTS "{TMP}" CASCADE'))
        perfiles.clonar_esquema(c, perfiles.PLANTILLA, TMP, "todo")
    fallos: list[str] = []
    try:
        with TestClient(create_app()) as cli:
            cli.app.state.engine = perfiles.engine_de(cli.app.state.engine, TMP)
            asig = next(a["id"] for a in cli.get("/api/subjects").json() if a["nombre"].startswith("Catal"))
            sid = cli.post("/api/sessions", json={"modo": "practica", "filtro": {"asignatura_id": asig}}).json()["sesion_id"]
            enviadas, saltadas = 0, 0
            for i in range(8):
                q = cli.get(f"/api/sessions/{sid}/next").json()
                if i == 3:  # una saltada: no cuenta como respuesta
                    cli.post(f"/api/sessions/{sid}/skip", json={"pregunta_id": q["pregunta_id"]})
                    saltadas += 1
                    continue
                cuerpo = {"sesion_id": sid, "pregunta_id": q["pregunta_id"], "orden_opciones": q["orden"], "elegida": (q["orden"] or ["a"])[0],
                          "tiempos": {"t_envio": 3.0}}
                if q["tipo"] == "escrita":
                    cuerpo.update(orden_opciones=[], elegida="a", respuestas=["x"] * len(q["campos"]))
                elif q["tipo"] == "problema":
                    cuerpo.update(orden_opciones=[], elegida="a", respuesta="1")
                r = cli.post("/api/answers", json=cuerpo)
                if r.status_code != 200:
                    fallos.append(f"respuesta {i}: HTTP {r.status_code} {r.text[:120]}")
                else:
                    enviadas += 1
            for ruta in (f"/api/analytics?asignatura_id={asig}", f"/api/map/{asig}", "/api/history", "/api/suggestions"):
                r = cli.get(ruta)
                if r.status_code != 200:
                    fallos.append(f"{ruta}: HTTP {r.status_code}")
            fecha = (tiempo.hoy().replace(year=tiempo.hoy().year + 1)).isoformat()  # fecha de examen: se guarda y se lee
            if cli.put(f"/api/examen/{asig}", json={"fecha": fecha}).status_code != 200 or cli.get(f"/api/examen/{asig}").json()["fecha"] != fecha:
                fallos.append("la fecha de examen no se guarda")
            hora_esperada = tiempo.ahora().hour
        # Lectura con una conexión NUEVA: lo que no esté confirmado en disco no aparece.
        fresco = perfiles.engine_de(get_engine_online(url), TMP)
        with fresco.connect() as c:
            n = {t.__tablename__: c.scalar(select(func.count()).select_from(t)) for t in (Intento, Evento, Sesion, Dominio, DominioSnapshot)}
            horas = {h for (h,) in c.execute(select(Intento.hora_dia))}
            examenes = c.scalar(select(func.count()).select_from(Ajuste).where(Ajuste.clave.like('examen:%')))
        print("respuestas enviadas:", enviadas, "| saltadas:", saltadas, "| filas guardadas:", n, "| hora guardada:", horas, "hora Madrid:", hora_esperada)
        if n["intento"] != enviadas:
            fallos.append(f"intentos guardados {n['intento']} != enviados {enviadas}")
        if n["evento"] < enviadas or n["sesion"] != 1 or n["dominio"] < 1 or n["dominio_snapshot"] < 1:
            fallos.append(f"faltan filas derivadas: {n}")
        if examenes != 1:
            fallos.append(f"la fecha de examen no persiste en una conexión nueva ({examenes})")
        if horas and horas != {hora_esperada} and abs(min(horas) - hora_esperada) > 1:
            fallos.append("la hora guardada no es la de Madrid")
    finally:
        with admin.begin() as c:
            c.execute(text(f'DROP SCHEMA IF EXISTS "{TMP}" CASCADE'))
    for f in fallos:
        print("FALLO:", f)
    print("TODO BIEN: lo respondido se guarda en Neon" if not fallos else f"{len(fallos)} fallos")
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main())
