from datetime import datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hexaprep.api import create_app

EXAMPLE = Path(__file__).resolve().parents[2] / "banks" / "_schema_example.json"


@pytest.fixture
def paths(tmp_path):
    booklets = tmp_path / "fuentes"
    booklets.mkdir()
    return {"db_path": tmp_path / "data" / "hexaprep.db", "data_dir": tmp_path / "data", "booklet_dir": booklets}


@pytest.fixture
def client(paths):
    with TestClient(create_app(**paths)) as c:
        yield c


@pytest.fixture
def loaded(client):
    r = client.post("/api/import", json={"ruta": str(EXAMPLE)})
    assert r.status_code == 200 and r.json()["created"] == 2
    return client.get("/api/subjects").json()[0]["id"]


def test_map_returns_zero_percent_on_first_run(client, loaded):
    m = client.get(f"/api/map/{loaded}").json()
    assert m["percent"] == 0 and len(m["hexes"]) == 2
    assert all(h["percent"] == 0 and {"concepto_id", "nombre", "subtema_id"} <= set(h) for h in m["hexes"])


def test_full_answer_flow_over_http(client, loaded):
    sid = client.post("/api/sessions", json={"modo": "practica", "filtro": {"asignatura_id": loaded}}).json()["sesion_id"]
    q = client.get(f"/api/sessions/{sid}/next").json()
    assert "correcta" not in q and len(q["opciones"]) == 4
    r = client.post("/api/answers", json={"sesion_id": sid, "pregunta_id": q["pregunta_id"], "orden_opciones": q["orden"],
                                          "elegida": "a", "confianza": "seguro", "tiempos": {"t_envio": 5.0}})
    ans = r.json()
    assert r.status_code == 200 and ans["correcta"] is True and ans["explicacion"] and ans["percent"] > 0
    assert client.get(f"/api/map/{loaded}").json()["percent"] > 0
    state = client.get(f"/api/sessions/{sid}").json()
    assert state["respondidas"] == [q["pregunta_id"]]
    # una pregunta ya respondida no se puede responder otra vez
    assert client.post("/api/answers", json={"sesion_id": sid, "pregunta_id": q["pregunta_id"],
                                             "orden_opciones": q["orden"], "elegida": "b"}).status_code == 409
    q2 = client.get(f"/api/sessions/{sid}/next").json()
    assert q2["pregunta_id"] != q["pregunta_id"]
    assert client.post(f"/api/questions/{q2['pregunta_id']}/report", json={"motivo": "dudosa", "sesion_id": sid}).status_code == 200
    assert client.get(f"/api/sessions/{sid}/next").json() is None
    sug = client.get("/api/suggestions").json()
    assert sug and sug[0]["tipo"] == "concepto"
    hist = client.get("/api/history").json()
    assert hist["dias"] == [datetime.now().date().isoformat()] and hist["evolucion"]


def test_placement_session_serves_the_selected_questions_once(client, loaded):
    r = client.post("/api/sessions", json={"modo": "nivel", "filtro": {"asignatura_id": loaded}}).json()
    assert r["aviso"]  # solo hay 2 preguntas, no 15
    sid, seen = r["sesion_id"], []
    while (q := client.get(f"/api/sessions/{sid}/next").json()) is not None:
        seen.append(q["pregunta_id"])
        client.post("/api/answers", json={"sesion_id": sid, "pregunta_id": q["pregunta_id"], "orden_opciones": q["orden"],
                                          "elegida": "a"})
    assert len(seen) == 2 and len(set(seen)) == 2


def test_booklet_missing_returns_404_with_message(client, loaded, paths):
    assert client.get("/api/sessions/none").status_code == 404  # sesión inexistente: 404 limpio
    sid = client.post("/api/sessions", json={"modo": "practica", "filtro": {"asignatura_id": loaded}}).json()["sesion_id"]
    q = client.get(f"/api/sessions/{sid}/next").json()
    r = client.get(f"/api/booklet/{q['fuente_id']}")
    assert r.status_code == 404 and "Economia_T1_Decisiones.pdf" in r.json()["detail"]
    (paths["booklet_dir"] / "Economia_T1_Decisiones.pdf").write_bytes(b"%PDF-1.4 fake")
    ok = client.get(f"/api/booklet/{q['fuente_id']}")
    assert ok.status_code == 200 and ok.headers["content-type"] == "application/pdf"


def test_edit_question_and_invalid_edit(client, loaded):
    sid = client.post("/api/sessions", json={"modo": "practica", "filtro": {"asignatura_id": loaded}}).json()["sesion_id"]
    qid = client.get(f"/api/sessions/{sid}/next").json()["pregunta_id"]
    assert client.put(f"/api/questions/{qid}", json={"enunciado": "Nuevo enunciado"}).json() == {"version": 2}
    bad = client.put(f"/api/questions/{qid}", json={"enunciado": "con — guion"})
    assert bad.status_code == 422 and "guion" in bad.text


def test_backup_export_and_restore(client, loaded, paths):
    sid = client.post("/api/sessions", json={"modo": "practica", "filtro": {"asignatura_id": loaded}}).json()["sesion_id"]
    q = client.get(f"/api/sessions/{sid}/next").json()
    client.post("/api/answers", json={"sesion_id": sid, "pregunta_id": q["pregunta_id"], "orden_opciones": q["orden"],
                                      "elegida": "b"})
    assert client.get("/api/backup").json() is None
    b = client.post("/api/backup").json()
    assert b["verificada"] and b["n_eventos"] >= 1 and Path(b["ruta"]).is_file()
    assert client.get("/api/backup").json()["ruta"] == b["ruta"]
    assert Path(client.post("/api/export/weak", json={"n": 5}).json()["ruta"]).is_file()
    assert Path(client.post("/api/export/events").json()["ruta"]).is_file()
    assert Path(client.post(f"/api/export/bank/{loaded}").json()["ruta"]).is_file()
    # tras la copia se responde otra pregunta; restaurar vuelve al estado de la copia
    q2 = client.get(f"/api/sessions/{sid}/next").json()
    client.post("/api/answers", json={"sesion_id": sid, "pregunta_id": q2["pregunta_id"], "orden_opciones": q2["orden"],
                                      "elegida": "a"})
    assert len(client.get(f"/api/sessions/{sid}").json()["respondidas"]) == 2
    assert client.post("/api/restore", json={"ruta": b["ruta"]}).status_code == 200
    assert len(client.get(f"/api/sessions/{sid}").json()["respondidas"]) == 1


def test_weekly_backup_runs_on_startup(paths):
    with TestClient(create_app(**paths)):
        pass
    assert len(list((paths["data_dir"] / "backups").glob("*.db"))) == 1
    with TestClient(create_app(**paths)):
        pass
    assert len(list((paths["data_dir"] / "backups").glob("*.db"))) == 1  # reciente: no repite
