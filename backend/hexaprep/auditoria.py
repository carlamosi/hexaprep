"""Auditoría de solo lectura de un perfil: ¿cuadran intentos, eventos y dominio? No escribe nada."""
from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import mastery
from .models import Dominio, Evento, Intento, Pregunta, Sesion

TOL = 1e-6


def auditar(session: Session) -> dict:
    """Devuelve contadores y listas de problemas; `ok` es True si todo cuadra."""
    intentos = session.scalars(select(Intento).where(Intento.deleted_at.is_(None))).all()
    n_eventos = session.scalar(select(func.count()).select_from(Evento).where(Evento.tipo == "respuesta_enviada"))
    ids_evento = set(session.scalars(select(Evento.id).where(Evento.tipo == "respuesta_enviada")))
    sin_evento = [i.id for i in intentos if i.evento_id not in ids_evento]
    ids_pregunta = set(session.scalars(select(Pregunta.id)))
    ids_sesion = set(session.scalars(select(Sesion.id)))
    huerfanos = [i.id for i in intentos if i.pregunta_id not in ids_pregunta or i.sesion_id not in ids_sesion]
    # una pregunta se responde una vez por sesión, y una segunda (reintento de una escrita fallada)
    por_par = Counter((i.sesion_id, i.pregunta_id) for i in intentos)
    duplicados = [{"sesion_id": s, "pregunta_id": p, "n": n} for (s, p), n in por_par.items() if n > 2]
    dominio_mal = []
    for dom in session.scalars(select(Dominio)):
        theta, sigma, n, racha, _ = mastery.reconstruir(session, dom.concepto_id)
        if dom.n_intentos != n or abs(dom.theta - theta) > TOL or abs(dom.sigma - sigma) > TOL:
            dominio_mal.append({"concepto_id": dom.concepto_id, "guardado": [dom.n_intentos, round(dom.theta, 4)],
                                "reconstruido": [n, round(theta, 4)]})
    mostradas = Counter()
    for sid, tipo, pid in session.execute(select(Evento.sesion_id, Evento.tipo, Evento.pregunta_id).where(
            Evento.tipo.in_(["pregunta_mostrada", "respuesta_enviada", "pregunta_saltada"])).order_by(Evento.id)):
        mostradas[(sid, pid)] += 1 if tipo == "pregunta_mostrada" else -1000
    abandonadas = sum(1 for v in mostradas.values() if 0 < v < 1000)
    sin_fin = session.scalar(select(func.count()).select_from(Sesion).where(Sesion.fin.is_(None)))
    r = {"intentos": len(intentos), "eventos_respuesta": n_eventos, "intentos_sin_evento": sin_evento,
         "huerfanos": huerfanos, "duplicados": duplicados, "dominio_incoherente": dominio_mal,
         "preguntas_abandonadas": abandonadas, "sesiones_sin_fin": sin_fin}
    r["ok"] = len(intentos) == n_eventos and not (sin_evento or huerfanos or duplicados or dominio_mal)
    return r
