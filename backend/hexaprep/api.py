"""API HTTP local (FastAPI). Todo cuelga de create_app para poder probarla con rutas temporales."""
import base64
import os
import secrets
import tempfile
from collections import defaultdict
from contextlib import asynccontextmanager
from dataclasses import asdict
from datetime import UTC, date, datetime
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import analytics, backup, events, export, mastery, quality, scheduling, selector
from .bank import RUTA_IMAGEN, load_bank, validate_bank
from .db import check_integrity, database_url, get_engine, get_engine_online, upgrade
from .importer import import_bank
from .models import (
    Asignatura, Bloque, Concepto, CopiaSeguridad, Dominio, DominioSnapshot, Evento, Explicacion, Fuente, Opcion,
    Pregunta, Subtema, Tema, utcnow,
)

ROOT = Path(__file__).resolve().parents[2]


class SessionIn(BaseModel):
    modo: str
    filtro: dict


class AnswerIn(BaseModel):
    sesion_id: str
    pregunta_id: str
    orden_opciones: list[str]
    elegida: str
    confianza: str | None = None
    tiempos: dict = {}
    respuesta: str | None = None  # solo problemas
    respuestas: list[str] | None = None  # solo escritas, una por campo


class CorrectIn(BaseModel):
    sesion_id: str
    pregunta_id: str


class SkipIn(BaseModel):
    pregunta_id: str


class ReportIn(BaseModel):
    motivo: str
    sesion_id: str | None = None


class PathIn(BaseModel):
    ruta: str


class WeakIn(BaseModel):
    n: int = 20


def get_session(request: Request):
    with Session(request.app.state.engine) as s:
        yield s


def create_app(db_path: Path | None = None, data_dir: Path | None = None, booklet_dir: Path | None = None,
               static_dir: Path | None = None) -> FastAPI:
    online_url = database_url()  # Postgres en Vercel; el disco allí es de solo lectura salvo /tmp
    data_dir = Path(data_dir or (Path(tempfile.gettempdir()) / "hexaprep" if online_url else ROOT / "data"))
    db_path = Path(db_path or data_dir / "hexaprep.db")
    password = os.environ.get("HEXAPREP_PASSWORD")
    booklet_dir = Path(booklet_dir or ROOT / "banks")  # rglob: cada asignatura guarda sus PDF en banks/<asignatura>/fuentes
    static_dir = Path(static_dir or ROOT / "frontend" / "dist")

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        data_dir.mkdir(parents=True, exist_ok=True)
        app.state.engine = get_engine_online(online_url) if online_url else get_engine(db_path)
        upgrade(app.state.engine)
        check_integrity(app.state.engine)
        weekly = None if online_url else backup.maybe_weekly_backup(db_path, data_dir / "backups", utcnow())
        if weekly is not None:  # que Ajustes la muestre y se pueda restaurar desde la app
            with Session(app.state.engine) as s:
                backup.record_backup(s, weekly)
        yield
        app.state.engine.dispose()

    app = FastAPI(title="HexaPrep", lifespan=lifespan)

    if password:  # acceso por contraseña (HTTP Basic: el navegador la pide solo; el usuario da igual)
        esperada = password.encode()

        @app.middleware("http")
        async def acceso(request: Request, call_next):
            auth, ok = request.headers.get("authorization", ""), False
            if auth.startswith("Basic "):
                try:
                    ok = secrets.compare_digest(base64.b64decode(auth[6:]).partition(b":")[2], esperada)
                except ValueError:
                    ok = False
            if not ok:
                return Response(status_code=401, headers={"WWW-Authenticate": 'Basic realm="HexaPrep"'})
            return await call_next(request)

    # ---------- catálogo y panal ----------
    @app.get("/api/subjects")
    def subjects(s: Session = Depends(get_session)):
        def tipos(a: Asignatura) -> list[str]:  # tipos de pregunta que tiene de verdad (para los botones de practicar)
            return sorted(s.scalars(
                select(Pregunta.tipo).distinct().join(Concepto, Concepto.id == Pregunta.concepto_id)
                .join(Subtema, Subtema.id == Concepto.subtema_id).join(Tema, Tema.id == Subtema.tema_id)
                .join(Bloque, Bloque.id == Tema.bloque_id)
                .where(Bloque.asignatura_id == a.id, Pregunta.es_actual.is_(True), Pregunta.activa.is_(True),
                       Pregunta.excluida.is_(False), Pregunta.deleted_at.is_(None))))

        return [{"id": a.id, "nombre": a.nombre, "idioma": a.idioma, "color": a.color, "acento": a.acento,
                 "percent": mastery.percent_of(s, "asignatura", a.id), "tipos": tipos(a)}
                for a in s.scalars(select(Asignatura).where(Asignatura.deleted_at.is_(None)).order_by(Asignatura.nombre))]

    @app.get("/api/map/{asignatura_id}")
    def map_(asignatura_id: str, s: Session = Depends(get_session)):
        a = s.get(Asignatura, asignatura_id)
        if a is None:
            raise HTTPException(404, "Asignatura desconocida")
        rows = s.execute(
            select(Concepto, Subtema, Tema, Dominio).join(Subtema, Subtema.id == Concepto.subtema_id)
            .join(Tema, Tema.id == Subtema.tema_id).join(Bloque, Bloque.id == Tema.bloque_id)
            .outerjoin(Dominio, Dominio.concepto_id == Concepto.id)
            .where(Bloque.asignatura_id == a.id, Concepto.deleted_at.is_(None))
            .order_by(Bloque.orden, Tema.orden, Tema.nombre, Subtema.orden, Subtema.nombre, Concepto.nombre)).all()
        hexes = [{"concepto_id": c.id, "nombre": c.nombre, "subtema_id": sub.id, "subtema": sub.nombre,
                  "tema": t.nombre, "tema_id": t.id, "color": a.acento,
                  "percent": mastery.percent(d.theta) if d is not None and d.n_intentos > 0 else 0}
                 for c, sub, t, d in rows]
        subtemas = {h["subtema_id"]: h["subtema"] for h in hexes}
        return {"asignatura": a.nombre, "percent": mastery.percent_of(s, "asignatura", a.id), "hexes": hexes,
                "subtemas": [{"id": i, "nombre": n, "percent": mastery.percent_of(s, "subtema", i)}
                             for i, n in subtemas.items()]}

    # ---------- sesiones ----------
    @app.post("/api/sessions")
    def create_session(body: SessionIn, s: Session = Depends(get_session)):
        filtro = dict(body.filtro)
        try:
            sid = events.start_session(s, body.modo, filtro)
        except ValueError as e:
            raise HTTPException(422, str(e))
        return {"sesion_id": sid}

    @app.get("/api/sessions/{sesion_id}")
    def session_state(sesion_id: str, s: Session = Depends(get_session)):
        try:
            return asdict(events.resume_session(s, sesion_id))
        except events.UnknownSession:
            raise HTTPException(404, "Sesión desconocida")

    @app.get("/api/sessions/{sesion_id}/next")
    def next_(sesion_id: str, s: Session = Depends(get_session)):
        try:
            state = events.resume_session(s, sesion_id)
        except events.UnknownSession:
            raise HTTPException(404, "Sesión desconocida")
        q = selector.next_question(s, sesion_id, selector.Filtro(**{
            k: v for k, v in state.filtro.items() if k in selector.Filtro.__dataclass_fields__}))
        if q is None:
            return None
        events.record_event(s, sesion_id, "pregunta_mostrada", q.pregunta_id, {"orden": q.orden}, datetime.now())
        return asdict(q)

    @app.post("/api/sessions/{sesion_id}/skip")
    def skip(sesion_id: str, body: SkipIn, s: Session = Depends(get_session)):
        try:
            events.skip_question(s, sesion_id, body.pregunta_id)
        except events.UnknownSession:
            raise HTTPException(404, "Sesión desconocida")
        except events.AlreadyAnswered as e:
            raise HTTPException(409, str(e))
        except ValueError as e:
            raise HTTPException(422, str(e))
        return {"ok": True}

    # ---------- respuestas y calidad ----------
    @app.post("/api/answers")
    def answer(body: AnswerIn, s: Session = Depends(get_session)):
        try:
            res = events.submit_answer(s, body.sesion_id, body.pregunta_id, body.orden_opciones, body.elegida,
                                       body.confianza, body.tiempos, body.respuesta, body.respuestas)
        except events.UnknownSession:
            raise HTTPException(404, "Sesión desconocida")
        except events.AlreadyAnswered as e:
            raise HTTPException(409, str(e))
        except ValueError as e:
            raise HTTPException(422, str(e))
        p = s.get(Pregunta, body.pregunta_id)
        mastery.snapshot_daily(s, date.today())
        dom = s.scalar(select(Dominio).where(Dominio.concepto_id == p.concepto_id))
        return {
            **asdict(res),
            "explicacion": s.scalar(select(Explicacion.texto).where(Explicacion.pregunta_id == p.id)),
            "trampas": {o.posicion: o.tipo_trampa for o in s.scalars(select(Opcion).where(Opcion.pregunta_id == p.id))
                        if o.tipo_trampa},
            "fuente_id": p.fuente_id, "fuente_pagina": p.fuente_pagina, "fuente_cara": p.fuente_cara,
            "percent": mastery.percent(dom.theta) if dom and dom.n_intentos else 0,
        }

    @app.post("/api/answers/correct")
    def answer_correct(body: CorrectIn, s: Session = Depends(get_session)):
        try:
            events.mark_correct(s, body.sesion_id, body.pregunta_id)
        except ValueError as e:
            s.rollback()
            raise HTTPException(422, str(e))
        p = s.get(Pregunta, body.pregunta_id)
        mastery.snapshot_daily(s, date.today())
        dom = s.scalar(select(Dominio).where(Dominio.concepto_id == p.concepto_id))
        return {"percent": mastery.percent(dom.theta) if dom and dom.n_intentos else 0}

    @app.get("/api/questions/reported")
    def reported(s: Session = Depends(get_session)):
        return quality.reported_questions(s)

    @app.get("/api/questions/{pregunta_id}")
    def question_detail(pregunta_id: str, s: Session = Depends(get_session)):
        try:
            return quality.question_content(s, pregunta_id)
        except ValueError as e:
            raise HTTPException(404, str(e))

    @app.post("/api/questions/{pregunta_id}/report")
    def report(pregunta_id: str, body: ReportIn, s: Session = Depends(get_session)):
        try:
            quality.report_question(s, pregunta_id, body.motivo, body.sesion_id)
        except ValueError as e:
            raise HTTPException(404, str(e))
        return {"ok": True}

    @app.put("/api/questions/{pregunta_id}")
    def edit(pregunta_id: str, cambios: dict, s: Session = Depends(get_session)):
        try:
            return {"version": quality.edit_question(s, pregunta_id, cambios)}
        except ValidationError as e:
            s.rollback()
            raise HTTPException(422, "; ".join(f"{'.'.join(map(str, x['loc']))}: {x['msg']}" for x in e.errors()))
        except ValueError as e:
            s.rollback()
            raise HTTPException(422, str(e))

    # ---------- sugerencias e historial ----------
    @app.get("/api/suggestions")
    def suggestions_(s: Session = Depends(get_session)):
        return [asdict(x) for x in scheduling.suggestions(s, utcnow())]

    @app.get("/api/history")
    def history(s: Session = Depends(get_session)):
        stamps = s.scalars(select(Evento.t_servidor).where(Evento.tipo == "respuesta_enviada"))
        dias = sorted({t.replace(tzinfo=UTC).astimezone().date().isoformat() for t in stamps})
        by: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
        for snap, sub in s.execute(select(DominioSnapshot, Concepto.subtema_id)
                                   .join(Concepto, Concepto.id == DominioSnapshot.concepto_id)).all():
            by[sub][snap.fecha].append(snap.theta)
        nombres = {i: n for i, n in s.execute(select(Subtema.id, Subtema.nombre))}
        return {"dias": dias, "evolucion": [
            {"subtema_id": sub, "subtema": nombres[sub],
             "puntos": [{"fecha": f, "percent": mastery.percent(sum(t) / len(t))} for f, t in sorted(fechas.items())]}
            for sub, fechas in by.items()]}

    @app.get("/api/analytics")
    def analytics_(asignatura_id: str, dias: int = 0, s: Session = Depends(get_session)):
        if s.get(Asignatura, asignatura_id) is None:
            raise HTTPException(404, "Asignatura desconocida")
        if dias < 0:
            raise HTTPException(422, "dias no puede ser negativo")
        return analytics.analytics(s, asignatura_id, dias)

    # ---------- copias, exportaciones, importación ----------
    @app.post("/api/backup")
    def backup_now(s: Session = Depends(get_session)):
        if online_url:
            raise HTTPException(501, "No disponible online: las copias las hace Neon")
        try:
            path = backup.backup_now(db_path, data_dir / "backups")
        except backup.BackupError as e:
            raise HTTPException(500, str(e))
        return _backup_row(backup.record_backup(s, path))

    @app.get("/api/backup")
    def last_backup(s: Session = Depends(get_session)):
        row = s.scalar(select(CopiaSeguridad).order_by(CopiaSeguridad.id.desc()).limit(1))
        return _backup_row(row) if row else None

    @app.post("/api/restore")
    def restore(body: PathIn, request: Request):
        if online_url:
            raise HTTPException(501, "No disponible online: las copias las hace Neon")
        request.app.state.engine.dispose()
        try:
            backup.restore(Path(body.ruta), db_path)
        except backup.BackupError as e:
            request.app.state.engine = get_engine(db_path)
            raise HTTPException(422, str(e))
        request.app.state.engine = get_engine(db_path)
        upgrade(request.app.state.engine)
        return {"ok": True}

    def _out(name: str) -> Path:
        d = data_dir / "exports"
        d.mkdir(parents=True, exist_ok=True)
        return d / name

    @app.post("/api/export/weak")
    def export_weak(body: WeakIn, s: Session = Depends(get_session)):
        export.export_weak(s, body.n, p := _out("weak.json"))
        return {"ruta": str(p)}

    @app.post("/api/export/events")
    def export_events(s: Session = Depends(get_session)):
        export.export_events_csv(s, p := _out("eventos.csv"))
        return {"ruta": str(p)}

    @app.post("/api/export/bank/{asignatura_id}")
    def export_bank(asignatura_id: str, s: Session = Depends(get_session)):
        if s.get(Asignatura, asignatura_id) is None:
            raise HTTPException(404, "Asignatura desconocida")
        quality.export_bank(s, asignatura_id, p := _out(f"banco-{asignatura_id[:8]}.json"))
        return {"ruta": str(p)}

    @app.post("/api/import")
    def import_(body: PathIn, s: Session = Depends(get_session)):
        path = Path(body.ruta)
        if path.suffix != ".json" or not path.is_file():
            raise HTTPException(404, f"No encuentro el banco {path.name}")
        errors = validate_bank(path)
        if errors:
            raise HTTPException(422, "; ".join(errors[:5]))
        return asdict(import_bank(s, load_bank(path), archivo=path.name))

    # ---------- imágenes de las preguntas ----------
    @app.get("/api/imagen/{ruta:path}")
    def imagen(ruta: str):
        if not RUTA_IMAGEN.fullmatch(ruta):  # solo rutas relativas simples: nada de «..», comodines ni absolutas
            raise HTTPException(404, "Imagen no encontrada")
        carpetas = sorted(booklet_dir.iterdir()) if booklet_dir.is_dir() else []
        found = next((f for d in carpetas if (f := d / "img" / ruta).is_file()), None)
        if found is None:
            raise HTTPException(404, "Imagen no encontrada")
        return FileResponse(found, headers={"Cache-Control": "public, max-age=86400"})

    # ---------- booklets ----------
    @app.get("/api/booklet/{fuente_id}")
    def booklet(fuente_id: str, s: Session = Depends(get_session)):
        f = s.get(Fuente, fuente_id)
        if f is None or not f.archivo:
            raise HTTPException(404, "Esta pregunta no tiene booklet asociado")
        found = next(booklet_dir.rglob(f.archivo), None) if booklet_dir.is_dir() else None
        if found is None:
            raise HTTPException(404, f"No encuentro el PDF {f.archivo} en {booklet_dir}. Copia el booklet en esa carpeta.")
        return FileResponse(found, media_type="application/pdf", content_disposition_type="inline")

    # El frontend compilado va al final: las rutas /api tienen prioridad.
    if static_dir.is_dir():
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")

    return app


def _backup_row(row: CopiaSeguridad) -> dict:
    return {"ruta": row.ruta, "verificada": row.verificada, "n_eventos": row.n_eventos,
            "fecha": row.created_at.isoformat()}
