"""Copias de seguridad con la API de backup de SQLite, verificadas, y restauración."""
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from .models import CopiaSeguridad, utcnow

STAMP = "%Y%m%d-%H%M%S-%f"
PREFIX = "hexaprep-"
WEEK = timedelta(days=7)


class BackupError(Exception):
    pass


def _copy(src: Path, dst: Path) -> None:
    source = sqlite3.connect(src)
    target = sqlite3.connect(dst)
    try:
        source.backup(target)
    finally:
        target.close()
        source.close()


def count_events(path: Path) -> int:
    con = sqlite3.connect(f"file:{Path(path).as_posix()}?mode=ro", uri=True)
    try:
        return con.execute("SELECT count(*) FROM evento").fetchone()[0]
    finally:
        con.close()


def verify_backup(path: Path) -> bool:
    """integrity_check correcto y tabla de eventos legible."""
    path = Path(path)
    if not path.is_file():
        return False
    try:
        con = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
        try:
            ok = con.execute("PRAGMA integrity_check").fetchall() == [("ok",)]
        finally:
            con.close()
        return ok and count_events(path) >= 0
    except sqlite3.DatabaseError:
        return False


def backup_now(db_path: Path, dest_dir: Path, now: datetime | None = None) -> Path:
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    path = dest_dir / f"{PREFIX}{(now or utcnow()).strftime(STAMP)}.db"
    _copy(Path(db_path), path)
    if not verify_backup(path):
        path.unlink(missing_ok=True)
        raise BackupError("la copia de seguridad no pasó la verificación")
    return path


def _last_backup_time(dest_dir: Path) -> datetime | None:
    stamps = []
    for p in Path(dest_dir).glob(f"{PREFIX}*.db"):
        try:
            stamps.append(datetime.strptime(p.stem[len(PREFIX):], STAMP))
        except ValueError:
            continue
    return max(stamps) if stamps else None


def maybe_weekly_backup(db_path: Path, dest_dir: Path, now: datetime) -> Path | None:
    last = _last_backup_time(dest_dir)
    if last is not None and now - last < WEEK:
        return None
    return backup_now(db_path, dest_dir, now)


def restore(path: Path, db_path: Path) -> None:
    """Sustituye la base por la copia. La base anterior queda como <db>.pre-restore-<fecha>.

    Hay que cerrar antes todas las conexiones a db_path (en Windows no se puede mover una base abierta).
    """
    path, db_path = Path(path), Path(db_path)
    if not verify_backup(path):
        raise BackupError("la copia está dañada o no es una base HexaPrep; no se restaura")
    tmp = db_path.with_name(db_path.name + ".restoring")
    tmp.unlink(missing_ok=True)
    _copy(path, tmp)
    if db_path.exists():
        try:
            con = sqlite3.connect(db_path)
            try:
                con.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            finally:
                con.close()
        except sqlite3.DatabaseError:
            pass  # base dañada: justo el caso en que se restaura; se aparta tal cual
        db_path.replace(db_path.with_name(f"{db_path.name}.pre-restore-{utcnow().strftime(STAMP)}"))
    for suffix in ("-wal", "-shm"):
        db_path.with_name(db_path.name + suffix).unlink(missing_ok=True)
    tmp.replace(db_path)


def record_backup(session: Session, path: Path) -> CopiaSeguridad:
    row = CopiaSeguridad(ruta=str(path), verificada=verify_backup(path), n_eventos=count_events(path))
    session.add(row)
    session.commit()
    return row
