from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from hexaprep.analytics import analytics
from hexaprep.events import start_session, submit_answer
from hexaprep.importer import import_bank
from hexaprep.models import Asignatura, Pregunta

ORDEN = ["c", "a", "d", "b"]
# (sesión, pregunta, letra, confianza, tiempo): la correcta de las dos preguntas es «a»
RESPUESTAS = [
    (0, 0, "a", "seguro", 4.0), (0, 1, "b", "dudo", 12.0),
    (1, 0, "b", "seguro", 30.0), (1, 1, "a", "adivino", 8.0),
    (2, 0, "a", "seguro", 3.0), (2, 1, "b", "dudo", 50.0),
]


@pytest.fixture
def ctx(session, bank):
    import_bank(session, bank)
    ps = session.scalars(select(Pregunta).order_by(Pregunta.clave)).all()
    sids = [start_session(session, "practica", {}) for _ in range(3)]
    for s, p, letra, conf, t in RESPUESTAS:
        submit_answer(session, sids[s], ps[p].id, ORDEN, letra, conf, {"t_primer_clic": t, "t_envio": t})
    return session.scalar(select(Asignatura.id)), ps


def test_summary_and_groups(session, ctx):
    a, _ = ctx
    r = analytics(session, a)
    assert r["resumen"]["respondidas"] == 6 and r["resumen"]["aciertos_pct"] == 50
    assert r["resumen"]["dias_estudiados"] == 1 and r["resumen"]["sesiones"] == 3
    assert r["resumen"]["tiempo_medio_s"] == pytest.approx(17.8, abs=0.05)
    assert {c["confianza"]: (c["n"], c["aciertos_pct"]) for c in r["confianza"]} == {
        "seguro": (3, 67), "dudo": (2, 0), "adivino": (1, 100), "sin": (0, None)}
    assert {v["tramo"]: (v["n"], v["aciertos_pct"]) for v in r["velocidad"]} == {
        "menos de 5 s": (2, 100), "5-10 s": (1, 100), "10-20 s": (1, 0), "20-40 s": (1, 0), "más de 40 s": (1, 0)}
    assert sum(h["n"] for h in r["horas"]) == 6 and len(r["horas"]) == 24 and len(r["semana"]) == 7
    assert sum(d["n"] for d in r["dificultad"]) == 6
    assert r["actividad"][0]["n"] == 6 and r["actividad"][0]["aciertos"] == 3


def test_fatigue_buckets_follow_session_position(session, ctx):
    a, _ = ctx
    f = {t["tramo"]: t["n"] for t in analytics(session, a)["fatiga"]}
    assert f["1-5"] == 6 and f["6-10"] == 0 and f["21+"] == 0


def test_traps_hard_questions_weak_concepts_and_sessions(session, ctx):
    a, ps = ctx
    r = analytics(session, a)
    assert r["trampas"][0]["n"] == 2  # la trampa de la segunda pregunta, elegida dos veces
    assert r["trampas"][0]["pregunta_id"] == ps[1].id, f"debe apuntar a la pregunta donde cayó: {r['trampas'][0]}"
    assert [d["pregunta_id"] for d in r["dificiles"]] == [ps[1].id]  # falla 2 de 3; la otra solo 1 de 3
    assert r["debiles"][0]["percent"] <= r["debiles"][-1]["percent"] and len(r["debiles"]) == 2
    assert len(r["sesiones_recientes"]) == 3 and all(s["n"] == 2 for s in r["sesiones_recientes"])
    assert r["evolucion"]["temas"] == [] or r["evolucion"]["temas"][0]["subtemas"] is not None


def test_range_filter_and_empty_state(session, ctx):
    a, _ = ctx
    lejos = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=10)
    r = analytics(session, a, dias=7, ahora=lejos)
    assert r["resumen"]["respondidas"] == 0 and r["resumen"]["aciertos_pct"] is None
    assert r["resumen"]["mejor_hora"] is None and r["actividad"] == [] and r["trampas"] == []
    assert all(c["n"] == 0 for c in r["confianza"])
    assert analytics(session, a, dias=7)["resumen"]["respondidas"] == 6



def test_errores_de_escritura_por_tipo(session):
    from test_captura import montar
    _, ps = montar(session)  # q-es: un hueco «Paraula» con valida «ok»
    for escrito in ("ko", "o", "ok", "ól"):
        submit_answer(session, start_session(session, "practica", {}), ps["q-es"].id, [], "a", None, {}, respuestas=[escrito])
    r = analytics(session, session.scalar(select(Asignatura.id)))
    got = {e["tipo"]: e["n"] for e in r["errores_escritura"]}
    assert got == {"letra_cambiada": 2, "longitud": 1}, f"obtenido {got}"  # «ko» y «ól» cambian letras; «o» es más corta
