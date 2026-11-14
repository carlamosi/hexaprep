import csv
import json
import sqlite3
from datetime import datetime, timedelta

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from conftest import make_bank
from hexaprep.backup import (
    BackupError, backup_now, count_events, maybe_weekly_backup, restore, verify_backup,
)
from hexaprep.db import get_engine
from hexaprep.events import start_session, submit_answer
from hexaprep.export import export_events_csv, export_weak
from hexaprep.importer import import_bank
from hexaprep.models import Evento, Pregunta

ORDEN = ["a", "b", "c", "d"]
T0 = datetime(2026, 11, 1, 10, 0)


@pytest.fixture
def filled(session, bank, db_path, tmp_path):
    import_bank(session, make_bank(bank, [("q1", "A", "s", 3), ("q2", "B", "s", 3), ("q3", "B", "s", 3)]))
    sid = start_session(session, "practica", {})
    for clave, letra in (("q1", "b"), ("q2", "a")):
        submit_answer(session, sid, session.scalar(select(Pregunta.id).where(Pregunta.clave == clave)), ORDEN, letra,
                      "dudo", {})
    return session, sid, db_path, tmp_path / "backups"


def n_events(session):
    return session.scalar(select(func.count()).select_from(Evento))


def test_backup_is_verifiable(filled):
    session, _, db_path, dest = filled
    path = backup_now(db_path, dest)
    assert path.parent == dest and verify_backup(path)
    assert count_events(path) == n_events(session) == 2


def test_restore_recovers_all_events(filled):
    session, sid, db_path, dest = filled
    path = backup_now(db_path, dest)
    submit_answer(session, sid, session.scalar(select(Pregunta.id).where(Pregunta.clave == "q3")), ORDEN, "a", None, {})
    assert n_events(session) == 3
    session.close()
    session.get_bind().dispose()
    restore(path, db_path)
    with Session(get_engine(db_path)) as s:
        assert n_events(s) == 2
    assert list(db_path.parent.glob(f"{db_path.name}.pre-restore-*"))  # la base anterior no se pierde


def test_restore_refuses_corrupt_backup(filled):
    session, _, db_path, dest = filled
    path = backup_now(db_path, dest)
    path.write_bytes(path.read_bytes()[:200])
    with pytest.raises(BackupError):
        restore(path, db_path)
    assert n_events(session) == 2


def test_weekly_backup_skips_when_recent(filled):
    _, _, db_path, dest = filled
    assert maybe_weekly_backup(db_path, dest, T0) is not None
    assert maybe_weekly_backup(db_path, dest, T0 + timedelta(days=6, hours=23)) is None
    assert len(list(dest.glob("*.db"))) == 1


def test_weekly_backup_runs_after_7_days(filled):
    _, _, db_path, dest = filled
    first = maybe_weekly_backup(db_path, dest, T0)
    second = maybe_weekly_backup(db_path, dest, T0 + timedelta(days=7))
    assert second is not None and second != first and verify_backup(second)


def test_corrupted_backup_fails_verification(filled, tmp_path):
    _, _, db_path, dest = filled
    path = backup_now(db_path, dest)
    data = bytearray(path.read_bytes())
    data[100:4000] = b"\x00" * 3900
    path.write_bytes(bytes(data))
    assert verify_backup(path) is False
    assert verify_backup(tmp_path / "no-existe.db") is False
    garbage = tmp_path / "x.db"
    garbage.write_bytes(b"no soy sqlite" * 50)
    assert verify_backup(garbage) is False


def test_export_weak_lists_weakest_concepts_first(filled, tmp_path):
    session, *_ = filled
    out = tmp_path / "weak.json"
    export_weak(session, 5, out)
    data = json.loads(out.read_text(encoding="utf-8"))
    assert [c["concepto"] for c in data["conceptos"]] == ["A", "B"]  # A se falló, B se acertó
    assert data["conceptos"][0]["trampas"] and data["conceptos"][0]["percent"] < data["conceptos"][1]["percent"]
    export_weak(session, 1, out)
    assert len(json.loads(out.read_text(encoding="utf-8"))["conceptos"]) == 1


def test_export_events_csv_has_one_row_per_attempt(filled, tmp_path):
    session, *_ = filled
    out = tmp_path / "ev.csv"
    export_events_csv(session, out)
    rows = list(csv.DictReader(out.open(encoding="utf-8-sig")))
    assert len(rows) == 2 and {"pregunta", "concepto", "correcta", "confianza", "trampa_elegida"} <= set(rows[0])
