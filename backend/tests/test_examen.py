"""Fecha de examen opcional: cuántos días faltan y cuántos conceptos nuevos al día harían falta para cubrir el temario."""
from datetime import date, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hexaprep import tiempo
from hexaprep.api import create_app
from hexaprep.examen import plan

EXAMPLE = Path(__file__).resolve().parents[2] / "banks" / "_schema_example.json"
HOY = date(2026, 11, 15)


def test_el_plan_reparte_lo_que_falta_entre_los_dias_que_quedan():
    assert plan(HOY + timedelta(days=10), HOY, 100, 30) == {"dias": 10, "total": 100, "tocados": 30, "sin_tocar": 70, "por_dia": 7}
    assert plan(HOY + timedelta(days=3), HOY, 100, 30)["por_dia"] == 24  # 70 / 3 redondeado hacia arriba


def test_el_dia_del_examen_y_los_casos_limite():
    assert plan(HOY, HOY, 50, 10)["por_dia"] == 40  # hoy mismo: todo lo que falta es hoy
    assert plan(HOY + timedelta(days=5), HOY, 50, 50)["por_dia"] == 0  # temario ya tocado
    pasado = plan(HOY - timedelta(days=2), HOY, 50, 10)
    assert pasado["dias"] == -2 and pasado["por_dia"] is None


@pytest.fixture
def cliente(tmp_path, monkeypatch):
    for k in ("GOOGLE_CLIENT_ID", "HEXAPREP_PASSWORD", "DATABASE_URL", "POSTGRES_URL"):
        monkeypatch.delenv(k, raising=False)
    (tmp_path / "f").mkdir()
    with TestClient(create_app(db_path=tmp_path / "d" / "h.db", data_dir=tmp_path / "d", booklet_dir=tmp_path / "f")) as c:
        assert c.post("/api/import", json={"ruta": str(EXAMPLE)}).status_code == 200
        c.asig = c.get("/api/subjects").json()[0]["id"]
        yield c


def test_sin_fecha_solo_informa_del_temario(cliente):
    r = cliente.get(f"/api/examen/{cliente.asig}").json()
    assert r["fecha"] is None and r["dias"] is None and r["por_dia"] is None and r["total"] == 2 and r["tocados"] == 0


def test_guardar_leer_y_quitar_la_fecha(cliente):
    fecha = (tiempo.hoy() + timedelta(days=4)).isoformat()
    assert cliente.put(f"/api/examen/{cliente.asig}", json={"fecha": fecha}).status_code == 200
    r = cliente.get(f"/api/examen/{cliente.asig}").json()
    assert r["fecha"] == fecha and r["dias"] == 4 and r["por_dia"] == 1  # 2 conceptos sin tocar en 4 días
    assert cliente.put(f"/api/examen/{cliente.asig}", json={"fecha": None}).status_code == 200
    assert cliente.get(f"/api/examen/{cliente.asig}").json()["fecha"] is None


def test_fechas_absurdas_y_asignatura_desconocida_se_rechazan(cliente):
    for mala in ("mañana", "2026-13-40", "1999-01-01", "2099-01-01", ""):
        assert cliente.put(f"/api/examen/{cliente.asig}", json={"fecha": mala}).status_code == 422, mala
    assert cliente.get("/api/examen/nada").status_code == 404
    assert cliente.put("/api/examen/nada", json={"fecha": None}).status_code == 404
