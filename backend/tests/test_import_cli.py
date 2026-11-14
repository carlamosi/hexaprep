import sys
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hexaprep.db import get_engine
from hexaprep.models import Pregunta

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from import_bank import main  # noqa: E402

EXAMPLE = ROOT / "banks" / "_schema_example.json"


def count(db):
    with Session(get_engine(db)) as s:
        return s.scalar(select(func.count()).select_from(Pregunta))


def test_import_cli_is_idempotent(tmp_path, capsys):
    db = tmp_path / "data" / "hexaprep.db"
    assert main(db, [EXAMPLE]) == 0
    assert "2 creadas" in capsys.readouterr().out
    assert main(db, [EXAMPLE]) == 0
    second = capsys.readouterr().out
    assert "0 creadas" in second and "2 sin cambios" in second
    assert count(db) == 2


def test_import_cli_reports_invalid_bank(tmp_path, capsys):
    bad = tmp_path / "bad.json"
    bad.write_text("{}", encoding="utf-8")
    assert main(tmp_path / "d.db", [bad]) == 1
    assert "ERROR" in capsys.readouterr().out
