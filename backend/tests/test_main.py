from pathlib import Path

from hexaprep.__main__ import main
from hexaprep.backup import backup_now
from hexaprep.db import check_integrity, get_engine, upgrade


def make_db(data: Path) -> Path:
    data.mkdir(parents=True, exist_ok=True)
    db = data / "hexaprep.db"
    engine = get_engine(db)
    upgrade(engine)
    engine.dispose()
    return db


def test_corrupt_database_gives_a_clear_message_with_the_way_out(tmp_path, capsys):
    data = tmp_path / "data"
    db = make_db(data)
    backup_now(db, data / "backups")
    db.write_bytes(b"esto no es una base de datos" * 100)
    assert main([], data=data) == 1
    out = capsys.readouterr().out
    assert "dañada" in out and "backups" in out and "--restore" in out


def test_restore_flag_recovers_the_database(tmp_path, capsys):
    data = tmp_path / "data"
    db = make_db(data)
    copia = backup_now(db, data / "backups")
    db.write_bytes(b"roto" * 500)
    assert main(["--restore", str(copia)], data=data) == 0
    check_integrity(get_engine(db))
    assert "restaurada" in capsys.readouterr().out.lower()


def test_restore_flag_rejects_a_bad_copy(tmp_path, capsys):
    data = tmp_path / "data"
    make_db(data)
    mala = tmp_path / "mala.db"
    mala.write_bytes(b"no soy una copia" * 100)
    assert main(["--restore", str(mala)], data=data) == 1
    assert "error" in capsys.readouterr().out.lower()
