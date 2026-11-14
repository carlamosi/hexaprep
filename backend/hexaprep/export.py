"""Exportaciones: conceptos más débiles (weak.json) y todos los intentos en CSV."""
import csv
import json
from collections import Counter
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from .mastery import percent
from .models import Bloque, Concepto, Dominio, Evento, Intento, Pregunta, Subtema, Tema


def export_weak(session: Session, n: int, path: Path) -> None:
    """Los n conceptos con menor dominio (solo los que tienen intentos), con las trampas que más caen."""
    doms = session.scalars(select(Dominio).where(Dominio.n_intentos > 0).order_by(Dominio.theta).limit(n)).all()
    out = []
    for d in doms:
        c = session.get(Concepto, d.concepto_id)
        sub = session.get(Subtema, c.subtema_id)
        tema = session.get(Tema, sub.tema_id)
        trampas = Counter(t for t in session.scalars(
            select(Intento.trampa_elegida).where(Intento.concepto_id == c.id, Intento.correcta.is_(False))) if t)
        out.append({"concepto_id": c.id, "concepto": c.nombre, "subtema": sub.nombre, "tema": tema.nombre,
                    "theta": round(d.theta, 4), "percent": percent(d.theta), "n_intentos": d.n_intentos,
                    "trampas": [{"trampa": t, "veces": v} for t, v in trampas.most_common()]})
    Path(path).write_text(json.dumps({"generado": datetime.now().isoformat(timespec="seconds"), "conceptos": out},
                                     ensure_ascii=False, indent=2), encoding="utf-8")


COLUMNS = ["intento_id", "fecha_servidor", "sesion_id", "pregunta", "version", "concepto", "subtema", "tema",
           "bloque", "dificultad", "opcion_inicial", "opcion_final", "n_cambios", "correcta", "trampa_elegida",
           "confianza", "orden_opciones", "t_primer_clic", "t_envio", "t_explicacion", "hora_dia", "dia_semana",
           "posicion_sesion", "n_intento_previo", "intervalo_desde_anterior", "dominio_antes", "dominio_despues"]


def export_events_csv(session: Session, path: Path) -> None:
    """Un renglón por intento, con el contexto completo. UTF-8 con BOM para abrirlo bien en Excel."""
    rows = session.execute(
        select(Intento, Evento.t_servidor, Pregunta, Concepto, Subtema, Tema, Bloque)
        .join(Evento, Evento.id == Intento.evento_id).join(Pregunta, Pregunta.id == Intento.pregunta_id)
        .join(Concepto, Concepto.id == Intento.concepto_id).join(Subtema, Subtema.id == Concepto.subtema_id)
        .join(Tema, Tema.id == Subtema.tema_id).join(Bloque, Bloque.id == Tema.bloque_id)
        .order_by(Intento.id)).all()
    with Path(path).open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        for i, t, p, c, s, tm, b in rows:
            w.writerow({
                "intento_id": i.id, "fecha_servidor": t.isoformat(), "sesion_id": i.sesion_id, "pregunta": p.clave,
                "version": p.version, "concepto": c.nombre, "subtema": s.nombre, "tema": tm.nombre,
                "bloque": b.nombre, "dificultad": i.dificultad, "opcion_inicial": i.opcion_inicial,
                "opcion_final": i.opcion_final, "n_cambios": i.n_cambios, "correcta": int(i.correcta),
                "trampa_elegida": i.trampa_elegida or "", "confianza": i.confianza or "",
                "orden_opciones": "".join(i.orden_opciones), "t_primer_clic": i.t_primer_clic,
                "t_envio": i.t_envio, "t_explicacion": i.t_explicacion, "hora_dia": i.hora_dia,
                "dia_semana": i.dia_semana, "posicion_sesion": i.posicion_sesion,
                "n_intento_previo": i.n_intento_previo, "intervalo_desde_anterior": i.intervalo_desde_anterior,
                "dominio_antes": i.dominio_antes, "dominio_despues": i.dominio_despues})
