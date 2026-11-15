"""Reloj de la alumna: en Vercel el servidor corre en UTC, así que HEXAPREP_TZ (p. ej. Europe/Madrid) fija su hora y su día."""
import os
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo


def ahora() -> datetime:
    zona = os.environ.get("HEXAPREP_TZ")
    return datetime.now(ZoneInfo(zona)).replace(tzinfo=None) if zona else datetime.now()


def hoy() -> date:
    return ahora().date()


def a_local(dt: datetime) -> datetime:
    """Una fecha UTC (naive) de la base, en la hora de la alumna (naive)."""
    zona = os.environ.get("HEXAPREP_TZ")
    return dt.replace(tzinfo=UTC).astimezone(ZoneInfo(zona) if zona else None).replace(tzinfo=None)
