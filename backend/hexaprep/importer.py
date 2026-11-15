import hashlib
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from .bank import BankFile, PreguntaIn
from .models import (
    Asignatura, Bloque, Concepto, Explicacion, Fuente, Importacion, Lote, Opcion, Pregunta, Subtema, Tema,
)


@dataclass
class ImportReport:
    created: int = 0
    updated: int = 0
    unchanged: int = 0


def _digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def question_digest(q: PreguntaIn) -> str:
    # Las preguntas test no incluyen los campos de tipo: así su huella no cambia y no se reimportan como nuevas versiones.
    return _digest(q.model_dump_json(exclude={"tipo", "solucion"} if q.tipo == "test" else None))


def _get_or_create(session: Session, model, **keys):
    row = session.scalar(select(model).filter_by(**keys, deleted_at=None))
    if row is None:
        row = model(**keys)
        session.add(row)
        session.flush()
    return row


def _concepto(session: Session, asignatura: Asignatura, q: PreguntaIn) -> Concepto:
    bloque = _get_or_create(session, Bloque, asignatura_id=asignatura.id, nombre=q.bloque)
    tema = _get_or_create(session, Tema, bloque_id=bloque.id, nombre=q.tema)
    subtema = _get_or_create(session, Subtema, tema_id=tema.id, nombre=q.subtema)
    return _get_or_create(session, Concepto, subtema_id=subtema.id, nombre=q.concepto)


def _add_question(session: Session, q: PreguntaIn, concepto: Concepto, version: int, fuente_id, lote_id,
                  digest: str, excluida: bool) -> None:
    p = Pregunta(
        clave=q.id, version=version, es_actual=True, concepto_id=concepto.id, fuente_id=fuente_id,
        lote_id=lote_id, tipo=q.tipo, enunciado=q.enunciado, ayuda_larga=q.ayuda_larga, dificultad_base=q.dificultad,
        fuente_pagina=q.fuente_pagina, fuente_cara=q.fuente_cara, content_hash=digest, excluida=excluida,
    )
    session.add(p)
    session.flush()
    if q.tipo == "problema":  # una sola opción «a» guarda la solución; el selector no la envía al cliente
        session.add(Opcion(pregunta_id=p.id, posicion="a", texto=repr(q.solucion), correcta=True))
    for i, o in enumerate(q.opciones):
        letra = "abcd"[i]
        session.add(Opcion(pregunta_id=p.id, posicion=letra, texto=o.texto, correcta=letra == q.correcta,
                           tipo_trampa=o.trampa))
    session.add(Explicacion(pregunta_id=p.id, texto=q.explicacion))


def import_bank(session: Session, bank: BankFile, archivo: str = "") -> ImportReport:
    report = ImportReport()
    a = bank.asignatura
    asignatura = session.scalar(select(Asignatura).where(Asignatura.nombre == a.nombre, Asignatura.deleted_at.is_(None)))
    if asignatura is None:
        asignatura = Asignatura(nombre=a.nombre, idioma=a.idioma, color=a.color, acento=a.acento)
        session.add(asignatura)
        session.flush()
    fuente = (_get_or_create(session, Fuente, asignatura_id=asignatura.id, nombre=bank.fuente.nombre)
              if bank.fuente else None)
    if fuente and bank.fuente.archivo:
        fuente.archivo, fuente.hash_pdf = bank.fuente.archivo, bank.fuente.hash_pdf
    lote = None

    for q in bank.preguntas:
        digest = question_digest(q)
        current = session.scalar(select(Pregunta).where(Pregunta.clave == q.id, Pregunta.es_actual.is_(True)))
        # Un banco que coincide con cualquier versión ya guardada no ha cambiado desde entonces. Así, volver a
        # importar el JSON original (run.ps1 lo hace en cada arranque) no deshace las correcciones hechas en la app.
        known = set(session.scalars(select(Pregunta.content_hash).where(Pregunta.clave == q.id)))
        if current is not None and digest in known:
            report.unchanged += 1
            continue
        if lote is None and bank.lote:
            lote = Lote(**bank.lote.model_dump())
            session.add(lote)
            session.flush()
        concepto = _concepto(session, asignatura, q)
        if current is None:
            _add_question(session, q, concepto, 1, fuente and fuente.id, lote and lote.id, digest, False)
            report.created += 1
        else:
            current.es_actual = False
            session.flush()
            _add_question(session, q, concepto, current.version + 1, (fuente and fuente.id) or current.fuente_id, lote and lote.id,
                          digest, current.excluida)
            report.updated += 1

    session.add(Importacion(archivo=archivo, hash=_digest(bank.model_dump_json()), creadas=report.created,
                            actualizadas=report.updated, sin_cambios=report.unchanged))
    session.commit()
    return report
