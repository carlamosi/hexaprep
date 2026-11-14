import pytest
from sqlalchemy import text
from sqlalchemy.exc import DatabaseError

from hexaprep.db import DatabaseCorrupt, check_integrity, get_engine, upgrade
from hexaprep.ids import new_id

TABLES = {
    "asignatura", "bloque", "tema", "subtema", "concepto", "fuente", "pregunta", "opcion",
    "explicacion", "lote", "sesion", "evento", "intento", "dominio", "dominio_snapshot",
    "reporte_calidad", "ajuste", "importacion", "copia_seguridad",
}


@pytest.fixture
def engine(tmp_path):
    e = get_engine(tmp_path / "t.db")
    upgrade(e)
    return e


def test_wal_and_fk_enabled(tmp_path):
    e = get_engine(tmp_path / "t.db")
    with e.connect() as c:
        assert c.execute(text("PRAGMA journal_mode")).scalar() == "wal"
        assert c.execute(text("PRAGMA foreign_keys")).scalar() == 1


def test_new_id_is_time_ordered():
    ids = [new_id() for _ in range(10)]
    assert ids == sorted(ids)
    assert len(set(ids)) == 10


def _insert_evento(c):
    c.execute(text("INSERT INTO sesion (id,created_at,updated_at,device_id,modo,filtro,inicio) "
                   "VALUES ('s','2026-01-01','2026-01-01','d','practica','{}','2026-01-01')"))
    c.execute(text("INSERT INTO evento (id,created_at,updated_at,device_id,sesion_id,tipo,payload,t_cliente,t_servidor) "
                   "VALUES ('e','2026-01-01','2026-01-01','d','s','x','{}','2026-01-01','2026-01-01')"))


@pytest.mark.parametrize("sql", ["UPDATE evento SET tipo='y'", "DELETE FROM evento"])
def test_evento_is_append_only(engine, sql):
    with engine.begin() as c:
        _insert_evento(c)
    with pytest.raises(DatabaseError):
        with engine.begin() as c:
            c.execute(text(sql))


def test_migrations_upgrade_from_empty(engine):
    with engine.connect() as c:
        names = {r[0] for r in c.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))}
        cols = {r[1] for r in c.execute(text("PRAGMA table_info(pregunta)"))}
    assert TABLES <= names
    assert {"id", "created_at", "updated_at", "deleted_at", "device_id"} <= cols
    check_integrity(engine)


def test_check_integrity_raises_on_corrupt_file(tmp_path):
    p = tmp_path / "bad.db"
    p.write_bytes(b"this is not a sqlite database" * 100)
    with pytest.raises(DatabaseCorrupt):
        check_integrity(get_engine(p))
