"""Captura de datos para analítica: error relativo, detalle de escritas, tiempos de explicación, motivo servido y nota de examen."""
import random
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from hexaprep import tiempo
from hexaprep.api import create_app
from hexaprep.bank import BankFile, PreguntaIn
from hexaprep.events import (error_relativo, record_client_event, start_session, submit_answer)
from hexaprep.importer import import_bank
from hexaprep.models import Asignatura, Evento, Intento, Pregunta
from hexaprep.selector import Filtro, next_question

BASE = dict(bloque="B", tema="T", subtema="S", dificultad=3, explicacion="E.", ayuda_larga="A.", fuente_pagina=1, fuente_cara=1)
ASIG = {"nombre": "Català", "idioma": "ca", "color": "#D9822B", "acento": "#D9822B"}
EXAMPLE = Path(__file__).resolve().parents[2] / "banks" / "_schema_example.json"


def montar(session):
    qs = [
        PreguntaIn(**{**BASE, "id": "q-es", "concepto": "c1", "enunciado": "?", "tipo": "escrita",
                      "campos": [{"etiqueta": "Paraula", "validas": ["ok"], "errores": {"ko": "regla X"}}]}),
        PreguntaIn(**{**BASE, "id": "q-pr", "concepto": "c2", "enunciado": "?", "tipo": "problema", "solucion": 2.0}),
        PreguntaIn(**{**BASE, "id": "q-te", "concepto": "c3", "enunciado": "?",
                      "opciones": [{"texto": "ok"}, {"texto": "x", "trampa": "t"}, {"texto": "y", "trampa": "t"},
                                   {"texto": "z", "trampa": "t"}], "correcta": "a"}),
    ]
    import_bank(session, BankFile(asignatura=ASIG, preguntas=qs))
    ps = {p.clave: p for p in session.scalars(select(Pregunta))}
    return start_session(session, "practica", {}), ps


def payload(session, pid):
    return session.scalar(select(Evento).where(Evento.tipo == "respuesta_enviada", Evento.pregunta_id == pid)).payload


def test_error_relativo_firmado_y_ordenado():
    assert error_relativo([2.2], [2.0], True) == [0.1]
    assert error_relativo([4.0, 1.0], [1.0, 4.0], False) == [0.0, 0.0]  # sin orden se comparan ordenados
    assert error_relativo([1.0, 2.0], [2.0], True) is None  # distinta cantidad de valores
    assert error_relativo([3.0], [0.0], True) == [3.0]  # solución 0: error absoluto


def test_el_problema_guarda_el_error_relativo(session):
    sid, ps = montar(session)
    submit_answer(session, sid, ps["q-pr"].id, [], "a", None, {}, respuesta="2,2")
    assert payload(session, ps["q-pr"].id)["error_rel"] == [0.1]


def test_la_escrita_guarda_el_detalle_sin_la_solucion(session):
    sid, ps = montar(session)
    submit_answer(session, sid, ps["q-es"].id, [], "a", None, {}, respuestas=["ko"])
    d = payload(session, ps["q-es"].id)["detalle"]
    assert d == [{"etiqueta": "Paraula", "correcto": False, "nota": "regla X"}]


def test_los_tiempos_nuevos_van_al_payload_y_a_las_columnas(session):
    sid, ps = montar(session)
    submit_answer(session, sid, ps["q-te"].id, ["a", "b", "c", "d"], "a", None,
                  {"t_primer_clic": 1.5, "t_envio": 4.0, "t_activo": 3.0, "t_oculto": 1.0})
    i = session.scalar(select(Intento))
    assert (i.t_primer_clic, i.t_envio) == (1.5, 4.0)
    assert payload(session, ps["q-te"].id)["tiempos"]["t_activo"] == 3.0


def test_explicacion_cerrada_rellena_t_explicacion_del_ultimo_intento(session):
    sid, ps = montar(session)
    pid = ps["q-te"].id
    submit_answer(session, sid, pid, ["a", "b", "c", "d"], "a", None, {})
    record_client_event(session, sid, "explicacion_cerrada", pid, {"t": 7.5})
    assert session.scalar(select(Intento.t_explicacion)) == 7.5
    assert session.scalar(select(Evento).where(Evento.tipo == "explicacion_cerrada")).payload == {"t": 7.5}


def test_eventos_de_cliente_solo_los_permitidos_y_de_tamano_acotado(session):
    sid, ps = montar(session)
    for tipo in ("respuesta_enviada", "marcada_correcta", "inventado"):
        with pytest.raises(ValueError):
            record_client_event(session, sid, tipo, None, {})
    with pytest.raises(ValueError):
        record_client_event(session, sid, "contexto", None, {"x": "a" * 5000})
    record_client_event(session, sid, "contexto", None, {"ancho": 390})
    record_client_event(session, sid, "ayuda_abierta", ps["q-te"].id, {})
    record_client_event(session, sid, "reanudacion", None, {"oculto_s": 30})


def test_el_motivo_servido_y_la_probabilidad_prevista(session):
    sid, ps = montar(session)
    q = next_question(session, sid, Filtro(session.scalar(select(Asignatura.id))), random.Random(0))
    assert q.servida["motivo"] == "nuevo"
    assert 0 < q.servida["p_pred"] < 1
    assert q.servida["dias_concepto"] is None


def test_una_escrita_fallada_vuelve_con_motivo_reintento(session, monkeypatch):
    from hexaprep import selector
    monkeypatch.setattr(selector, "TOP_K", 1)
    monkeypatch.setattr(selector, "REINTENTO_GAP", 0)
    sid, ps = montar(session)
    submit_answer(session, sid, ps["q-es"].id, [], "a", None, {}, respuestas=["mal"])
    q = next_question(session, sid, Filtro(session.scalar(select(Asignatura.id))), random.Random(0))
    assert q.reintento and q.servida["motivo"] == "reintento"


@pytest.fixture
def cliente(tmp_path, monkeypatch):
    for k in ("GOOGLE_CLIENT_ID", "HEXAPREP_PASSWORD", "DATABASE_URL", "POSTGRES_URL"):
        monkeypatch.delenv(k, raising=False)
    (tmp_path / "f").mkdir()
    with TestClient(create_app(db_path=tmp_path / "d" / "h.db", data_dir=tmp_path / "d", booklet_dir=tmp_path / "f")) as c:
        assert c.post("/api/import", json={"ruta": str(EXAMPLE)}).status_code == 200
        c.asig = c.get("/api/subjects").json()[0]["id"]
        yield c


def test_el_endpoint_de_evento_y_el_next_guardan_el_motivo(cliente):
    sid = cliente.post("/api/sessions", json={"modo": "practica", "filtro": {"asignatura_id": cliente.asig}}).json()["sesion_id"]
    q = cliente.get(f"/api/sessions/{sid}/next").json()
    assert "servida" not in q  # no sale al cliente
    r = cliente.post(f"/api/sessions/{sid}/evento", json={"tipo": "ayuda_abierta", "pregunta_id": q["pregunta_id"]})
    assert r.status_code == 200
    assert cliente.post(f"/api/sessions/{sid}/evento", json={"tipo": "respuesta_enviada"}).status_code == 422
    assert cliente.post("/api/sessions/nada/evento", json={"tipo": "contexto"}).status_code == 404


def test_nota_de_examen_guarda_la_nota_con_el_dominio_del_momento(cliente):
    url = f"/api/examen/{cliente.asig}/nota"
    assert cliente.post(url, json={"nota": 7.5}).status_code == 200
    r = cliente.get(url).json()
    assert r == [{"fecha": tiempo.hoy().isoformat(), "nota": 7.5, "dominio": 0}]
    for mala in (-1, 11, "x"):
        assert cliente.post(url, json={"nota": mala}).status_code == 422
    assert cliente.post("/api/examen/nada/nota", json={"nota": 5}).status_code == 404


def test_lote_2_eventos_de_cliente_carga_explicacion_abierta_y_copia(session):
    sid, ps = montar(session)
    for tipo, p in (("carga", {"t_carga_ms": 120, "esqueleto": False, "prefetch": True}),
                    ("explicacion_abierta", {}), ("copia", {"t_copia": 4.2, "n_copias": 1})):
        record_client_event(session, sid, tipo, ps["q-te"].id, p)
        ev = session.scalar(select(Evento).where(Evento.tipo == tipo))
        assert ev is not None and ev.payload == p, f"{tipo}: payload guardado {ev and ev.payload}"
