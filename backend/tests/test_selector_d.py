"""Selector en dos pasos (D1), repaso por riesgo de olvido (D4), calibración (D3) y datos para evaluarlo (C5)."""
import random
from datetime import timedelta

import pytest
from sqlalchemy import select

from conftest import make_bank
from hexaprep import selector
from hexaprep.events import start_session, submit_answer
from hexaprep.importer import import_bank
from hexaprep.models import Asignatura, Dominio, Evento, Pregunta, utcnow
from hexaprep.selector import Filtro, next_question

ORDEN = ["a", "b", "c", "d"]


@pytest.fixture(autouse=True)
def sin_sorteo(monkeypatch):
    monkeypatch.setattr(selector, "TOP_K", 1)


def montar(session, bank, items):
    import_bank(session, make_bank(bank, items))
    return session.scalar(select(Asignatura.id)), start_session(session, "practica", {})


def servir(session, sid, asig, correcta=True):
    q = next_question(session, sid, Filtro(asig), rng=random.Random(1), variedad=1)
    if q is None:
        return None
    submit_answer(session, sid, q.pregunta_id, ORDEN, "a" if correcta else "b", None, {})
    return session.get(Pregunta, q.pregunta_id)


def conceptos_servidos(session, sid, asig, n, correcta=True):
    out = []
    for _ in range(n):
        p = servir(session, sid, asig, correcta)
        out.append(p.concepto_id if p else None)
    return out


def nombres(session, ids):
    from hexaprep.models import Concepto
    return [session.get(Concepto, i).nombre if i else None for i in ids]


def test_al_empezar_un_concepto_salen_dos_seguidas_y_luego_se_intercala(session, bank):
    asig, sid = montar(session, bank, [(f"{c}{i}", c, "s", 3) for c in "ABC" for i in range(4)])
    seq = nombres(session, conceptos_servidos(session, sid, asig, 6))
    assert seq[0] == seq[1], f"un concepto nuevo da 2 seguidas: {seq}"
    assert seq[2] != seq[1] and seq[2] == seq[3], f"luego otro concepto, también de 2 en 2: {seq}"
    assert seq[4] != seq[3], f"secuencia servida {seq}"


def test_tope_por_concepto_y_sesion_cuando_hay_alternativas(session, bank):
    asig, sid = montar(session, bank, [(f"A{i}", "A", "s", 3) for i in range(10)] + [(f"B{i}", "B", "s", 3) for i in range(10)])
    seq = nombres(session, conceptos_servidos(session, sid, asig, 8))
    assert max(seq.count("A"), seq.count("B")) <= selector.TOPE_CONCEPTO * 2 and seq.count("A") >= 1 and seq.count("B") >= 1, seq
    assert all(seq[:selector.TOPE_CONCEPTO].count(c) <= selector.TOPE_CONCEPTO for c in "AB")


def test_ventaja_a_los_conceptos_sin_tocar(session, bank):
    asig, sid = montar(session, bank, [("A0", "A", "s", 3), ("A1", "A", "s", 3), ("B0", "B", "s", 3), ("B1", "B", "s", 3)])
    # A queda tocado en otra sesión; en una sesión nueva debe salir primero B, que está sin tocar
    for _ in range(2):
        servir(session, sid, asig)
    sid2 = start_session(session, "practica", {})
    p = servir(session, sid2, asig)
    from hexaprep.models import Concepto
    assert session.get(Concepto, p.concepto_id).nombre == "B", "debe empezar por el concepto sin tocar"


def test_repaso_vencido_con_mas_riesgo_de_olvido_va_primero(session, bank):
    asig, sid = montar(session, bank, [(f"{c}{i}", c, "s", 3) for c in "ABC" for i in range(3)])
    for c in "AB":  # toca A y B en otra sesión
        pass
    ant = start_session(session, "practica", {})
    for _ in range(4):
        servir(session, ant, asig)
    ahora = utcnow()
    doms = {d.concepto_id: d for d in session.scalars(select(Dominio).where(Dominio.n_intentos > 0))}
    ids = list(doms)
    assert len(ids) == 2
    viejo, reciente = ids
    # el primero lleva mucho más tiempo vencido que el segundo
    for d, dias in ((doms[viejo], 40), (doms[reciente], 1)):
        st = dict(d.fsrs_state)
        from datetime import UTC
        st["last_review"] = (ahora - timedelta(days=dias + 5)).replace(tzinfo=UTC).isoformat()
        st["due"] = (ahora - timedelta(days=dias)).replace(tzinfo=UTC).isoformat()
        d.fsrs_state = st
        d.proximo_repaso = ahora - timedelta(days=dias)
    session.commit()
    sid2 = start_session(session, "practica", {})
    p = servir(session, sid2, asig)
    assert p.concepto_id == viejo, f"debe ir primero el repaso con más riesgo de olvido; sirvió {p.concepto_id}"


def test_la_pregunta_servida_guarda_rank_candidatas_fase_y_r_fsrs(session, bank):
    asig, sid = montar(session, bank, [(f"{c}{i}", c, "s", 3) for c in "AB" for i in range(3)])
    servir(session, sid, asig)
    q = next_question(session, sid, Filtro(asig), rng=random.Random(1), variedad=1)
    sv = q.servida
    assert {"rank", "n_cands", "fase", "r_fsrs", "motivo", "p_pred"} <= set(sv), f"servida: {sv}"
    assert sv["rank"] == 1 and sv["n_cands"] >= 1 and sv["fase"] in ("nuevo", "aprendizaje", "consolidado")


def test_calibracion_corrige_p_pred_con_el_acierto_real(session, bank):
    from hexaprep.selector import calibrar
    assert calibrar(0.5, 0.0) == pytest.approx(0.5)
    assert calibrar(0.5, 1.0) > 0.7 and calibrar(0.5, -1.0) < 0.3


def test_recencia_sube_p_y_decae_y_el_desfase_es_cero_con_pocos_datos(session, bank):
    from hexaprep.selector import desfase_calibracion, recencia
    assert recencia(0.5, None) == 0.5
    assert recencia(0.5, 0.0) > recencia(0.5, 1.0) > recencia(0.5, 10.0) >= 0.5
    asig, sid = montar(session, bank, [("A0", "A", "s", 3)])
    assert desfase_calibracion(session, asig) == 0.0
