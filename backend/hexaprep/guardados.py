"""Guardados: la ayuda de un concepto o la explicación de un ejemplo, por perfil (clave `guardados` de `ajuste`).

Se guarda el texto tal como estaba: si el banco cambia después, lo guardado no se mueve.
"""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from .ids import new_id
from .models import Bloque, Concepto, Explicacion, Pregunta, Subtema, Tema
from .quality import _ajuste, _current, _guardar_ajuste

TIPOS = ("ayuda", "ejemplo")


def guardar(session: Session, pregunta_id: str, tipo: str) -> dict:
    """Guarda la ayuda del concepto de la pregunta o su explicación con el enunciado. Lo ya guardado se devuelve tal cual."""
    if tipo not in TIPOS:
        raise ValueError(f"tipo de guardado desconocido: {tipo}")
    p = _current(session, pregunta_id)
    c = session.get(Concepto, p.concepto_id)
    s = session.get(Subtema, c.subtema_id)
    t = session.get(Tema, s.tema_id)
    clave = f"ayuda:{c.id}" if tipo == "ayuda" else f"ejemplo:{p.clave}"
    guardados = _ajuste(session, "guardados")
    previo = next((g for g in guardados if g["clave"] == clave), None)
    if previo:
        return previo
    texto = p.ayuda_larga if tipo == "ayuda" else session.scalar(select(Explicacion.texto).where(Explicacion.pregunta_id == p.id))
    if not texto:
        raise ValueError("no hay texto que guardar")
    g = {"id": new_id(), "clave": clave, "tipo": tipo, "asignatura_id": session.get(Bloque, t.bloque_id).asignatura_id,
         "concepto_id": c.id, "titulo": c.nombre, "subtema": s.nombre, "tema": t.nombre, "texto": texto,
         "enunciado": p.enunciado if tipo == "ejemplo" else None, "fecha": datetime.now().isoformat(timespec="seconds")}
    _guardar_ajuste(session, "guardados", [*guardados, g])
    return g


def listar_guardados(session: Session, asignatura_id: str | None = None) -> list[dict]:
    """Lo último guardado, primero."""
    return [g for g in reversed(_ajuste(session, "guardados")) if asignatura_id in (None, g["asignatura_id"])]


def quitar_guardado(session: Session, guardado_id: str) -> None:
    guardados = _ajuste(session, "guardados")
    if not any(g["id"] == guardado_id for g in guardados):
        raise ValueError(f"no hay ningún guardado con id {guardado_id}")
    _guardar_ajuste(session, "guardados", [g for g in guardados if g["id"] != guardado_id])
