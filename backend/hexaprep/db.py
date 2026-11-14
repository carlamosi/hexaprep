import platform
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.exc import DatabaseError

MIGRATIONS = Path(__file__).resolve().parent.parent / "migrations"


class DatabaseCorrupt(Exception):
    pass


def device_id() -> str:
    return platform.node() or "local"


def get_engine(path: Path) -> Engine:
    engine = create_engine(f"sqlite:///{path}")

    @event.listens_for(engine, "connect")
    def _pragmas(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    return engine


def upgrade(engine: Engine) -> None:
    cfg = Config()
    cfg.set_main_option("script_location", str(MIGRATIONS))
    with engine.begin() as conn:
        cfg.attributes["connection"] = conn
        command.upgrade(cfg, "head")


def check_integrity(engine: Engine) -> None:
    try:
        with engine.connect() as c:
            result = c.execute(text("PRAGMA integrity_check")).scalar()
    except DatabaseError as e:
        raise DatabaseCorrupt(str(e)) from e
    if result != "ok":
        raise DatabaseCorrupt(result)
