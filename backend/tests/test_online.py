"""Modo online (Vercel + Postgres): URL de la base, contraseña de acceso y migración desde SQLite."""
import base64
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hexaprep.api import create_app
from hexaprep.bank import load_bank
from hexaprep.db import database_url, get_engine, upgrade
from hexaprep.importer import import_bank
from hexaprep.models import Base, Intento

ROOT = Path(__file__).resolve().parents[2]
EXAMPLE = ROOT / "banks" / "_schema_example.json"
sys.path.insert(0, str(ROOT / "tools"))


def basic(password: str, user: str = "carla") -> dict:
    return {"Authorization": "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()}


@pytest.fixture
def paths(tmp_path):
    (tmp_path / "fuentes").mkdir()
    return {"db_path": tmp_path / "data" / "hexaprep.db", "data_dir": tmp_path / "data", "booklet_dir": tmp_path / "fuentes"}


@pytest.mark.parametrize("env,esperado", [
    ({}, None),
    ({"DATABASE_URL": "postgres://u:p@h/db?sslmode=require"}, "postgresql+psycopg://u:p@h/db?sslmode=require"),
    ({"DATABASE_URL": "postgresql://u:p@h/db"}, "postgresql+psycopg://u:p@h/db"),
    ({"POSTGRES_URL": "postgres://u:p@h/db"}, "postgresql+psycopg://u:p@h/db"),
    ({"DATABASE_URL": "postgresql+psycopg://u:p@h/db"}, "postgresql+psycopg://u:p@h/db"),
])
def test_la_url_de_la_base_se_normaliza_para_psycopg(monkeypatch, env, esperado):
    for k in ("DATABASE_URL", "POSTGRES_URL"):
        monkeypatch.delenv(k, raising=False)
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    assert database_url() == esperado


def test_sin_contrasena_configurada_no_se_pide_nada(paths, monkeypatch):
    monkeypatch.delenv("HEXAPREP_PASSWORD", raising=False)
    with TestClient(create_app(**paths)) as c:
        assert c.get("/api/subjects").status_code == 200


def test_con_contrasena_la_api_la_exige(paths, monkeypatch):
    monkeypatch.setenv("HEXAPREP_PASSWORD", "secreta")
    with TestClient(create_app(**paths)) as c:
        sin = c.get("/api/subjects")
        assert sin.status_code == 401 and "Basic" in sin.headers["www-authenticate"]
        assert c.get("/api/subjects", headers=basic("mala")).status_code == 401
        assert c.get("/api/subjects", headers=basic("secreta", user="")).status_code == 200
        assert c.get("/api/subjects", headers=basic("secreta")).status_code == 200
        assert c.get("/api/subjects", headers={"Authorization": "Basic %%%"}).status_code == 401  # cabecera rota


def test_migrar_copia_todas_las_tablas_y_conserva_el_progreso(tmp_path):
    from migrar_a_postgres import migrar
    origen, destino = get_engine(tmp_path / "o.db"), get_engine(tmp_path / "d.db")
    upgrade(origen)
    with Session(origen) as s:
        import_bank(s, load_bank(EXAMPLE))
    with origen.begin() as c:  # un intento falso basta para comprobar que tablas con datos de uso viajan
        from hexaprep.models import Evento, Pregunta, Sesion
        sid = c.execute(Sesion.__table__.insert().values(id="s1", modo="practica", filtro={}, version_app="t", zona_horaria="x", device_id="d")).inserted_primary_key[0]
        assert sid == "s1"
    n = migrar(origen, destino)
    with origen.connect() as o, destino.connect() as d:
        for t in Base.metadata.sorted_tables:
            assert o.scalar(select(func.count()).select_from(t)) == d.scalar(select(func.count()).select_from(t)), t.name
    assert n > 0
    assert migrar(origen, destino) == 0  # repetir no duplica: solo copia a un destino vacío
