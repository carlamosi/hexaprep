import os
import platform
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.exc import DatabaseError
from sqlalchemy.pool import NullPool

MIGRATIONS = Path(__file__).resolve().parent.parent / "migrations"


class DatabaseCorrupt(Exception):
    pass


def device_id() -> str:
    return platform.node() or "local"


def database_url() -> str | None:
    """URL de Postgres (modo online, Vercel + Neon) o None para usar SQLite local. Fuerza el driver psycopg 3."""
    url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if not url:
        return None
    for viejo in ("postgres://", "postgresql://"):
        if url.startswith(viejo):
            return "postgresql+psycopg://" + url[len(viejo):]
    return url


def get_engine_online(url: str) -> Engine:
    # NullPool: en funciones serverless cada invocación abre y cierra su conexión (Neon ya hace el pooling).
    return create_engine(url, poolclass=NullPool, connect_args={"prepare_threshold": None})  # el pooler de Neon no admite sentencias preparadas del servidor


def get_engine(path: Path) -> Engine:
    engine = create_engine(f"sqlite:///{path}")

    @event.listens_for(engine, "connect")
    def _pragmas(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    return engine


def upgrade(engine: Engine, esquema: str | None = None) -> None:
    """Aplica las migraciones; con `esquema` (Postgres) las aplica a ese perfil en lugar de a public."""
    cfg = Config()
    cfg.set_main_option("script_location", str(MIGRATIONS))
    with engine.begin() as conn:
        if esquema:
            from .perfiles import _q
            conn.execute(text(f"SET LOCAL search_path TO {_q(esquema)}"))
        cfg.attributes["connection"] = conn
        command.upgrade(cfg, "head")


def check_integrity(engine: Engine) -> None:
    if engine.dialect.name != "sqlite":
        return
    try:
        with engine.connect() as c:
            result = c.execute(text("PRAGMA integrity_check")).scalar()
    except DatabaseError as e:
        raise DatabaseCorrupt(str(e)) from e
    if result != "ok":
        raise DatabaseCorrupt(result)
