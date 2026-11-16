"""Perfiles online: el nombre del esquema es estable y no admite inyección (el clonado en sí se prueba contra Neon)."""
import pytest

from hexaprep.perfiles import CATALOGO, _q, esquema_de
from hexaprep.models import Base


def test_el_esquema_es_estable_y_no_distingue_mayusculas():
    assert esquema_de("Carla@Gmail.com ") == esquema_de("carla@gmail.com")
    assert esquema_de("a@gmail.com") != esquema_de("b@gmail.com")
    assert esquema_de("x@y.z").startswith("u_") and len(esquema_de("x@y.z")) == 14


@pytest.mark.parametrize("malo", ['a"; DROP SCHEMA public; --', "A", "con espacio", "", "x" * 41, "a-b"])
def test_un_nombre_de_esquema_raro_se_rechaza(malo):
    with pytest.raises(ValueError):
        _q(malo)


def test_el_catalogo_solo_nombra_tablas_que_existen():
    assert set(CATALOGO) <= {t.name for t in Base.metadata.tables.values()}


def test_el_nombre_del_esquema_archivado_lleva_fecha_y_hora_y_es_valido():
    from datetime import datetime

    from hexaprep.perfiles import nombre_archivo
    n = nombre_archivo("u_35af3cffa925", datetime(2026, 11, 16, 9, 5, 7))
    assert n == "archivo_35af3cffa925_20261116_090507"
    _q(n)  # cumple las reglas de nombre de esquema
