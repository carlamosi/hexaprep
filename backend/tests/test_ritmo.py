"""Carga esperada de una pregunta (lectura + escritura) y tiempos activos del historial."""
import json

import pytest

from hexaprep.analytics import analytics
from hexaprep.ritmo import carga_esperada


def test_carga_crece_con_el_texto_leido_y_con_lo_que_hay_que_escribir():
    corta = carga_esperada("test", "¿Qué es?", None, ["Uno", "Dos"])
    larga = carga_esperada("test", "¿Qué es el coste de oportunidad en una economía de mercado? " * 3, None, ["Uno " * 20] * 4)
    assert larga > corta, f"larga {larga} <= corta {corta}"
    escrita_corta = carga_esperada("escrita", "Forma", None, [json.dumps([{"etiqueta": "g", "validas": ["ok"]}])])
    escrita_larga = carga_esperada("escrita", "Forma", None, [json.dumps([{"etiqueta": "g", "validas": ["extraordinàriament"]}])])
    assert escrita_larga > escrita_corta, f"{escrita_larga} <= {escrita_corta}"
    assert carga_esperada("test", "x", None, []) >= 3, "mínimo de 3 s"


def test_el_historial_usa_t_activo_y_da_el_ritmo(session, bank):
    from sqlalchemy import select

    from hexaprep.events import start_session, submit_answer
    from hexaprep.importer import import_bank
    from hexaprep.models import Asignatura, Pregunta

    import_bank(session, bank)
    p = session.scalars(select(Pregunta).order_by(Pregunta.clave)).first()
    sid = start_session(session, "practica", {})
    submit_answer(session, sid, p.id, ["c", "a", "d", "b"], "a", None, {"t_primer_clic": 5, "t_envio": 100, "t_activo": 10})
    r = analytics(session, session.scalar(select(Asignatura.id)))
    assert r["resumen"]["tiempo_medio_s"] == pytest.approx(10), f"debe usar t_activo (10), no t_envio (100): {r['resumen']}"
    assert r["resumen"]["ritmo"] > 0 and r["fatiga"][0]["ritmo"] == pytest.approx(r["resumen"]["ritmo"])
