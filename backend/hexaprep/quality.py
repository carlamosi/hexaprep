"""Calidad del banco: reportar preguntas dudosas, editarlas (nueva versión) y exportar el banco."""
import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import events, mastery, scheduling
from .bank import AsignaturaIn, BankFile, CampoIn, FuenteIn, OpcionIn, PreguntaIn
from .importer import _add_question, leer_solucion, question_digest
from .models import (
    Ajuste, Asignatura, Bloque, Concepto, Explicacion, Fuente, Opcion, Pregunta, ReporteCalidad, Subtema, Tema, utcnow,
)

EDITABLE = {"enunciado", "ayuda_larga", "explicacion", "dificultad", "opciones", "correcta", "fuente_pagina",
            "fuente_cara", "excluida", "solucion", "ordenada"}


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


def retire_claves(session: Session, claves: list[str]) -> int:
    """Retira preguntas (todas sus versiones): ni se sirven ni cuentan en el dominio. No borra nada; se reactivan desde el editor."""
    conceptos = set()
    for clave in claves:
        for p in session.scalars(select(Pregunta).where(Pregunta.clave == clave)):
            p.excluida = True
            conceptos.add(p.concepto_id)
    session.flush()
    for c in conceptos:
        _recompute(session, c)
    session.commit()
    return len(claves)


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
    problema = p.tipo in ("problema", "escrita")
    return PreguntaIn(
        id=p.clave, bloque=bloque.nombre, tema=tema.nombre, subtema=sub.nombre, concepto=c.nombre,
        dificultad=p.dificultad_base, enunciado=p.enunciado, tipo=p.tipo,
        solucion=leer_solucion(ops[0].texto)[0] if p.tipo == "problema" else None,
        ordenada=leer_solucion(ops[0].texto)[1] if p.tipo == "problema" else False,
        campos=[CampoIn(**c) for c in json.loads(ops[0].texto)] if p.tipo == "escrita" else None,
        imagen=p.imagen, grupo=p.grupo, contexto=p.contexto, apartado=p.apartado,
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
            "fuente_cara": q.fuente_cara, "tipo": q.tipo, "solucion": q.solucion,
            "ordenada": q.ordenada, "imagen": q.imagen, "contexto": q.contexto, "apartado": q.apartado}


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


# ---------- «Aún no lo hemos dado» (ocultar por alcance), «demasiado fácil» y «mi respuesta también valía» ----------
ALCANCES = ("pregunta", "concepto", "tema")


def _ajuste(session: Session, clave: str) -> list:
    fila = session.scalar(select(Ajuste).where(Ajuste.clave == clave))
    return list(fila.valor) if fila is not None and isinstance(fila.valor, list) else []


def _guardar_ajuste(session: Session, clave: str, valor: list) -> None:
    fila = session.scalar(select(Ajuste).where(Ajuste.clave == clave))
    if fila is None:
        session.add(Ajuste(clave=clave, valor=valor))
    else:
        fila.valor = valor
    session.commit()


def ocultar(session: Session, pregunta_id: str, alcance: str) -> dict:
    """Oculta la pregunta, su concepto o su tema entero (no se sirven ni cuentan en el %). Reversible con `mostrar_oculto`.

    Se guarda en `ajuste` del perfil qué claves oculta esta acción, para devolver solo esas (las ya reportadas siguen fuera)."""
    if alcance not in ALCANCES:
        raise ValueError(f"alcance no válido: {alcance}")
    p = _current(session, pregunta_id)
    c = session.get(Concepto, p.concepto_id)
    sub = session.get(Subtema, c.subtema_id)
    tema = session.get(Tema, sub.tema_id)
    if alcance == "pregunta":
        ident, nombre, filtro = p.id, p.enunciado[:80], [Pregunta.id == p.id]
    elif alcance == "concepto":
        ident, nombre, filtro = c.id, c.nombre, [Pregunta.concepto_id == c.id]
    else:
        ident, nombre = tema.id, tema.nombre
        filtro = [Pregunta.concepto_id.in_(select(Concepto.id).join(Subtema, Subtema.id == Concepto.subtema_id)
                                           .where(Subtema.tema_id == tema.id))]
    ps = session.scalars(select(Pregunta).where(*filtro, Pregunta.es_actual.is_(True), Pregunta.excluida.is_(False),
                                                Pregunta.deleted_at.is_(None))).all()
    claves = sorted({q.clave for q in ps})
    conceptos = {q.concepto_id for q in ps}
    for clave in claves:
        _set_excluida(session, clave, True)
    session.flush()
    for cid in conceptos:
        _recompute(session, cid)
    registro = {"id": f"{alcance}:{ident}", "alcance": alcance, "nombre": nombre, "claves": claves}
    _guardar_ajuste(session, "ocultos", [o for o in _ajuste(session, "ocultos") if o["id"] != registro["id"]] + [registro])
    return registro


def listar_ocultos(session: Session) -> list[dict]:
    return _ajuste(session, "ocultos")


def mostrar_oculto(session: Session, registro_id: str) -> None:
    """Devuelve a la práctica lo que ocultó esa acción (y solo eso)."""
    ocultos = _ajuste(session, "ocultos")
    reg = next((o for o in ocultos if o["id"] == registro_id), None)
    if reg is None:
        raise ValueError(f"no hay nada oculto con id {registro_id}")
    conceptos = set()
    for clave in reg["claves"]:
        _set_excluida(session, clave, False)
        conceptos |= set(session.scalars(select(Pregunta.concepto_id).where(Pregunta.clave == clave)))
    session.flush()
    for cid in conceptos:
        _recompute(session, cid)
    _guardar_ajuste(session, "ocultos", [o for o in ocultos if o["id"] != registro_id])


def anotar_facil(session: Session, pregunta_id: str, sesion_id: str | None = None) -> None:
    """«Demasiado fácil u obvia»: solo deja constancia (no oculta nada, es una opinión)."""
    p = _current(session, pregunta_id)
    if sesion_id:
        events.record_event(session, sesion_id, "pregunta_reportada", p.id, {"motivo": "facil"}, datetime.now())


def anotar_alternativa(session: Session, pregunta_id: str, texto: str) -> None:
    """«Mi respuesta también valía»: no cambia la nota; guarda lo escrito para añadirlo al banco."""
    texto = " ".join(texto.split())
    if not texto:
        raise ValueError("respuesta vacía")
    p = _current(session, pregunta_id)
    _guardar_ajuste(session, "alternativas", _ajuste(session, "alternativas")
                    + [{"clave": p.clave, "enunciado": p.enunciado[:120], "texto": texto[:300]}])


def listar_alternativas(session: Session) -> list[dict]:
    return _ajuste(session, "alternativas")
