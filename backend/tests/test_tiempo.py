"""La hora de las respuestas debe ser la de la alumna aunque el servidor (Vercel) corra en UTC."""
from datetime import datetime, timedelta

from hexaprep import tiempo


def test_sin_zona_configurada_usa_la_hora_local_del_equipo(monkeypatch):
    monkeypatch.delenv("HEXAPREP_TZ", raising=False)
    assert abs(tiempo.ahora() - datetime.now()) < timedelta(seconds=2)


def test_con_zona_configurada_la_hora_y_el_dia_salen_en_esa_zona(monkeypatch):
    monkeypatch.setenv("HEXAPREP_TZ", "Pacific/Kiritimati")  # UTC+14, sin horario de verano
    esperado = datetime.now(tz=None).astimezone().utcoffset()  # solo para tener un punto de comparación
    utc = datetime.utcnow()
    diferencia = tiempo.ahora() - utc
    assert abs(diferencia - timedelta(hours=14)) < timedelta(seconds=5), (diferencia, esperado)
    assert tiempo.hoy() == tiempo.ahora().date()
    assert tiempo.ahora().tzinfo is None  # naive, como el resto de fechas de la base


def test_a_local_pasa_una_fecha_utc_de_la_base_a_la_hora_de_la_alumna(monkeypatch):
    monkeypatch.setenv("HEXAPREP_TZ", "Pacific/Kiritimati")
    assert tiempo.a_local(datetime(2026, 1, 1, 12, 0)) == datetime(2026, 1, 2, 2, 0)
    monkeypatch.setenv("HEXAPREP_TZ", "Europe/Madrid")
    assert tiempo.a_local(datetime(2026, 7, 1, 22, 30)) == datetime(2026, 7, 2, 0, 30)  # verano: UTC+2, otro día
