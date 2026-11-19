"""D5 evidencia distribuida y D6 grado FSRS por ritmo y borrados."""
import pytest
from fsrs import Rating
from sqlalchemy import select

from conftest import make_bank
from hexaprep import mastery, scheduling
from hexaprep.events import start_session, submit_answer
from hexaprep.importer import import_bank
from hexaprep.models import Concepto, Dominio, Evento, Pregunta

ORDEN = ["a", "b", "c", "d"]


def banco(session, bank, n=6):
    import_bank(session, make_bank(bank, [(f"q{i}", "A", "s", 3) for i in range(n)]))
    return [p.id for p in session.scalars(select(Pregunta).order_by(Pregunta.clave))], session.scalar(select(Concepto.id))


def responder(session, sid, pid, ok=True, tiempos=None):
    submit_answer(session, sid, pid, ORDEN, "a" if ok else "b", None, tiempos or {})


def test_las_repeticiones_en_la_misma_sesion_pesan_menos_que_repartidas(session, bank):
    ids, cid = banco(session, bank)
    una = start_session(session, "practica", {})
    for pid in ids[:3]:
        responder(session, una, pid)
    junto = session.scalar(select(Dominio.theta).where(Dominio.concepto_id == cid))
    # mismo número de aciertos pero cada uno en su sesión
    for pid in ids[3:6]:
        responder(session, start_session(session, "practica", {}), pid)
    # theta repartido (6 intentos: 3 juntos + 3 repartidos) frente a 3 juntos: lo repartido aporta más por intento
    despues = session.scalar(select(Dominio.theta).where(Dominio.concepto_id == cid))
    t_junto, _ = 0.0, 0.0
    for k in range(3):
        t_junto, _s = mastery.update(t_junto, 1.5, 3, True, "test", peso=mastery.peso_intento(k, False))
    t_igual, _s = 0.0, 1.5
    for _ in range(3):
        t_igual, _s = mastery.update(t_igual, _s, 3, True, "test")
    assert t_junto < t_igual, f"3 aciertos seguidos ({t_junto:.3f}) deben subir menos que sin descuento ({t_igual:.3f})"
    assert despues > junto, f"theta tras repartir {despues:.3f} debe superar al de 3 seguidos {junto:.3f}"


def test_el_reintento_de_la_correccion_activa_pesa_menos(session):
    assert mastery.peso_intento(0, True) < mastery.peso_intento(0, False) == 1.0
    assert mastery.peso_intento(2, False) < mastery.peso_intento(1, False) < 1.0


def test_consolidado_exige_aciertos_en_tres_dias_distintos():
    p = [mastery.percent_concepto(2.0, 0.4, d) for d in (1, 2, 3, 5)]
    assert p[0] < p[1] < p[2] == p[3], f"porcentaje por días con aciertos (1, 2, 3, 5): {p}"
    assert mastery.percent_concepto(2.0, 0.4) == p[2], "sin dato de días no se aplica tope"


def test_fsrs_no_cuenta_los_aciertos_repetidos_de_la_misma_sesion(session, bank):
    ids, cid = banco(session, bank)
    a = start_session(session, "practica", {})
    responder(session, a, ids[0])
    e1 = session.scalar(select(Dominio.fsrs_state).where(Dominio.concepto_id == cid))
    responder(session, a, ids[1])
    responder(session, a, ids[2])
    e3 = session.scalar(select(Dominio.fsrs_state).where(Dominio.concepto_id == cid))
    assert e3["stability"] == e1["stability"], f"estabilidad tras 1 y tras 3 aciertos seguidos: {e1['stability']} {e3['stability']}"
    responder(session, a, ids[3], ok=False)
    e4 = session.scalar(select(Dominio.fsrs_state).where(Dominio.concepto_id == cid))
    assert e4["stability"] < e1["stability"], "un fallo sí cuenta aunque sea de la misma sesión"


@pytest.mark.parametrize("ritmo,borrados,esperado", [
    (1.0, 0, Rating.Good), (3.0, 0, Rating.Hard), (1.0, 5, Rating.Hard), (None, None, Rating.Good), (9.0, 9, Rating.Hard)])
def test_el_grado_fsrs_usa_ritmo_y_borrados(ritmo, borrados, esperado):
    assert scheduling.rate(True, None, ritmo, borrados) == esperado
    assert scheduling.rate(False, None, ritmo, borrados) == Rating.Again
    assert scheduling.rate(True, "dudo") == Rating.Hard, "la confianza antigua sigue contando"


def test_submit_answer_guarda_el_ritmo_en_el_evento(session, bank):
    ids, _ = banco(session, bank)
    sid = start_session(session, "practica", {})
    responder(session, sid, ids[0], tiempos={"t_activo": 20.0, "n_borrados": 2})
    pay = session.scalar(select(Evento.payload).where(Evento.tipo == "respuesta_enviada"))
    assert pay["ritmo"] > 0, f"payload: {pay}"
