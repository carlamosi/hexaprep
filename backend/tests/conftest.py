import json
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from hexaprep.bank import BankFile, load_bank
from hexaprep.db import get_engine, upgrade

EXAMPLE = Path(__file__).resolve().parents[2] / "banks" / "_schema_example.json"


@pytest.fixture
def db_path(tmp_path):
    return tmp_path / "t.db"


@pytest.fixture
def engine(db_path):
    e = get_engine(db_path)
    upgrade(e)
    return e


@pytest.fixture
def session(engine):
    with Session(engine) as s:
        yield s


@pytest.fixture
def bank() -> BankFile:
    return load_bank(EXAMPLE)


def bank_with(bank: BankFile, **changes_first) -> BankFile:
    """Copia del banco con la primera pregunta modificada."""
    data = json.loads(bank.model_dump_json())
    data["preguntas"][0].update(changes_first)
    return BankFile.model_validate(data)


def make_bank(base: BankFile, items: list[tuple[str, str, str, int]]) -> BankFile:
    """Banco con una pregunta por (id, concepto, subtema, dificultad), clonando la primera del ejemplo."""
    data = json.loads(base.model_dump_json())
    tpl = data["preguntas"][0]
    data["preguntas"] = [{**tpl, "id": i, "concepto": c, "subtema": s, "dificultad": d} for i, c, s, d in items]
    return BankFile.model_validate(data)
