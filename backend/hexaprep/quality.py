"""Calidad del banco: reportar preguntas dudosas, editarlas (nueva versión) y exportar el banco."""
import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import events, mastery, scheduling
from .bank import AsignaturaIn, BankFile, FuenteIn, OpcionIn, PreguntaIn
from .importer import _add_question, question_digest
from .models import (
    Asignatura, Bloque, Concepto, Explicacion, Fuente, Opcion, Pregunta, ReporteCalidad, Subtema, Tema, utcnow,
)

EDITABLE = {"enunciado", "ayuda_larga", "explicacion", "dificultad", "opciones", "correcta", "fuente_pagina",
            "fuente_cara", "excluida", "solucion"}


def _current(session: Session, pregunta_id: str) -> Pregunta:
    p = session.get(Pregunta, pregunta_id)
    if p is None:
        raise ValueError(f"pregunta desconocida: {pregunta_id}")
    return session.scalar(select(Pregunta).where(Pregunta.clave == p.clave, Pregunta.es_actual.is_(True))) or p


def _recompute(session: Session, concepto_id: str) -> None:
    mastery.rebuild(session, concepto_id)
    scheduling.rebuild(session, concepto_id)


def _set_excluida(session: Session, clave: str, value: bool) -> None:
    for p in session.scalars(select(Pregunta).where(Pregunta.clave == clave)):
        p.excluida = value


def report_question(session: Session, pregunta_id: str, motivo: str, sesion_id: str | None = None) -> None:
    """Excluye la pregunta (todas sus versiones) de dominio y selector. No borra ningún evento."""
    p = _current(session, pregunta_id)
    session.add(ReporteCalidad(pregunta_id=p.id, motivo=motivo))
    _set_excluida(session, p.clave, True)
    session.flush()
    _recompute(session, p.concepto_id)
    session.commit()
    if sesion_id:
        events.record_event(session, sesion_id, "pregunta_reportada", p.id, {"motivo": motivo}, datetime.now())


def _to_bank_question(session: Session, p: Pregunta) -> PreguntaIn:
    c = session.get(Concepto, p.concepto_id)
    sub = session.get(Subtema, c.subtema_id)
    tema = session.get(Tema, sub.tema_id)
    bloque = session.get(Bloque, tema.bloque_id)
    ops = session.scalars(select(Opcion).where(Opcion.pregunta_id == p.id).order_by(Opcion.posicion)).all()
    expl = session.scalar(select(Explicacion.texto).where(Explicacion.pregunta_id == p.id))
    problema = p.tipo == "problema"
    return PreguntaIn(
        id=p.clave, bloque=bloque.nombre, tema=tema.nombre, subtema=sub.nombre, concepto=c.nombre,
        dificultad=p.dificultad_base, enunciado=p.enunciado, tipo=p.tipo,
        solucion=float(ops[0].texto) if problema else None,
        opciones=[] if problema else [OpcionIn(texto=o.texto, trampa=o.tipo_trampa) for o in ops],
        correcta=None if problema else next(o.posicion for o in ops if o.correcta), explicacion=expl or "",
        ayuda_larga=p.ayuda_larga or "", fuente_pagina=p.fuente_pagina, fuente_cara=p.fuente_cara)


def question_content(session: Session, pregunta_id: str) -> dict:
    """Contenido editable de la versión vigente de una pregunta (para el editor de la app)."""
    cur = _current(session, pregunta_id)
    q = _to_bank_question(session, cur)
    return {"pregunta_id": cur.id, "version": cur.version, "excluida": cur.excluida, "enunciado": q.enunciado,
            "opciones": [o.model_dump() for o in q.opciones], "correcta": q.correcta, "explicacion": q.explicacion,
            "ayuda_larga": q.ayuda_larga, "dificultad": q.dificultad, "fuente_pagina": q.fuente_pagina,
            "fuente_cara": q.fuente_cara, "tipo": q.tipo, "solucion": q.solucion}


def reported_questions(session: Session) -> list[dict]:
    """Preguntas reportadas que siguen excluidas (versión vigente), con el último motivo."""
    out = []
    for p in session.scalars(select(Pregunta).where(Pregunta.es_actual.is_(True), Pregunta.excluida.is_(True),
                                                      Pregunta.deleted_at.is_(None)).order_by(Pregunta.clave)):
        motivo = session.scalar(
            select(ReporteCalidad.motivo).join(Pregunta, Pregunta.id == ReporteCalidad.pregunta_id)
            .where(Pregunta.clave == p.clave).order_by(ReporteCalidad.id.desc()).limit(1))
        out.append({"pregunta_id": p.id, "enunciado": p.enunciado, "motivo": motivo})
    return out


def edit_question(session: Session, pregunta_id: str, cambios: dict) -> int:
    """Crea una versión nueva con los cambios y devuelve su número. Lanza ValidationError si no es válida."""
    unknown = set(cambios) - EDITABLE
    if unknown:
        raise ValueError(f"campos no editables: {sorted(unknown)}")
    cur = _current(session, pregunta_id)
    reinstate = cambios.get("excluida") is False
    content = {k: v for k, v in cambios.items() if k != "excluida"}
    if not content:  # solo reactivar
        if reinstate:
            _set_excluida(session, cur.clave, False)
            session.flush()
            _recompute(session, cur.concepto_id)
            session.commit()
        return cur.version
    data = _to_bank_question(session, cur).model_dump()
    data.update(content)
    q = PreguntaIn.model_validate(data)  # valida antes de tocar nada
    cur.es_actual = False
    session.flush()
    _add_question(session, q, session.get(Concepto, cur.concepto_id), cur.version + 1, cur.fuente_id, cur.lote_id,
                  question_digest(q), cur.excluida)
    new = session.scalar(select(Pregunta).where(Pregunta.clave == cur.clave, Pregunta.es_actual.is_(True)))
    new.origen = "manual"
    if reinstate:
        _set_excluida(session, cur.clave, False)
    session.flush()
    _recompute(session, cur.concepto_id)
    session.commit()
    return new.version


def export_bank(session: Session, asignatura_id: str, path: Path) -> None:
    """Exporta las versiones vigentes en JSON que pasa validate_bank y reimporta como 'sin cambios'."""
    a = session.get(Asignatura, asignatura_id)
    fuentes = session.scalars(select(Fuente).where(Fuente.asignatura_id == a.id, Fuente.deleted_at.is_(None))).all()
    claves = session.scalars(
        select(Pregunta).join(Concepto, Concepto.id == Pregunta.concepto_id)
        .join(Subtema, Subtema.id == Concepto.subtema_id).join(Tema, Tema.id == Subtema.tema_id)
        .join(Bloque, Bloque.id == Tema.bloque_id)
        .where(Bloque.asignatura_id == a.id, Pregunta.es_actual.is_(True), Pregunta.deleted_at.is_(None))
        .order_by(Pregunta.clave)).all()
    bank = BankFile(
        asignatura=AsignaturaIn(nombre=a.nombre, idioma=a.idioma, color=a.color, acento=a.acento),
        # shortcut: con varias fuentes no se declara ninguna a nivel de archivo, subir a fuente por pregunta si hace falta
        fuente=FuenteIn(nombre=fuentes[0].nombre, archivo=fuentes[0].archivo) if len(fuentes) == 1 else None,
        preguntas=[_to_bank_question(session, p) for p in claves])
    Path(path).write_text(json.dumps(bank.model_dump(exclude_none=True), ensure_ascii=False, indent=2),
                          encoding="utf-8")
