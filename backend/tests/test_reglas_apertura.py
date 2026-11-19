"""reglas_apertura.json (redactadas y contrastadas por Opus con los apuntes): bien formadas y aplicadas tras fallar la apertura."""
import json
import re
from pathlib import Path

from hexaprep.escritura import corregir_campo

REGLAS = json.loads((Path(__file__).resolve().parents[1] / "hexaprep" / "reglas_apertura.json").read_text(encoding="utf-8"))["reglas"]


def test_cada_patron_casa_con_sus_ejemplos_y_la_regla_es_de_una_linea_sin_guiones_largos():
    assert REGLAS, "el archivo no tiene reglas"
    for r in REGLAS:
        assert r["vocal"] in ("e", "o") and r["respaldo"], r["id"]
        assert len(r["regla"]) <= 140 and "—" not in r["regla"] and "–" not in r["regla"], r["id"]
        for ej in r["ejemplos"]:
            assert re.search(r["patron"], ej), f"{r['id']}: el patrón {r['patron']} no casa con {ej}"


def test_tras_fallar_la_apertura_sale_la_regla_de_la_palabra_o_la_generica():
    campo = lambda v: {"etiqueta": "P", "validas": [v], "errores": {}}  # noqa: E731
    assert "-ència" in corregir_campo("ciéncia", campo("ciència"))["nota"]
    assert "-ió" in corregir_campo("avió".replace("ó", "ò"), campo("avió"))["nota"]
    assert "abierta" in corregir_campo("café", campo("cafè"))["nota"], "sin regla para -è final: pista genérica"
