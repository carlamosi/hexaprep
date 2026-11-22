"""Analítica del historial: agregaciones de los intentos de una asignatura (solo lectura, todo derivado)."""
import json
from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import mastery, tiempo
from .models import Bloque, Concepto, Dominio, DominioSnapshot, Evento, Intento, Opcion, Pregunta, Sesion, Subtema, Tema
from .escritura import clasificar_error
from .ritmo import carga_esperada
from .scheduling import _retrievability

CONFIANZAS = ("seguro", "dudo", "adivino")
TRAMOS_POSICION = [(1, 5, "1-5"), (6, 10, "6-10"), (11, 15, "11-15"), (16, 20, "16-20"), (21, None, "21+")]
TRAMOS_TIEMPO = [(0, 5, "menos de 5 s"), (5, 10, "5-10 s"), (10, 20, "10-20 s"), (20, 40, "20-40 s"), (40, None, "más de 40 s")]
MIN_HORA = 3  # respuestas mínimas para llamar «mejor hora» a una hora


def _pct(ok: int, n: int) -> int | None:
    return round(100 * ok / n) if n else None


def _media(xs: list[float]) -> float | None:
    return round(sum(xs) / len(xs), 1) if xs else None


def _local(dt: datetime) -> datetime:
    return tiempo.a_local(dt)


def _grupo(rows: list, clave, etiquetas: list) -> list[dict]:
    """Aciertos por grupo, conservando el orden de `etiquetas` y mostrando también los grupos vacíos."""
    por: dict = defaultdict(lambda: [0, 0])
    for r in rows:
        g = clave(r)
        por[g][0] += 1
        por[g][1] += r.correcta
    return [{"clave": e, "n": por[e][0], "aciertos_pct": _pct(por[e][1], por[e][0])} for e in etiquetas]


def _tramo(valor: float, tramos: list) -> str:
    return next(nombre for lo, hi, nombre in tramos if valor >= lo and (hi is None or valor < hi))


def _evolucion(session: Session, asignatura_id: str, desde: str | None) -> dict:
    q = (select(DominioSnapshot, Subtema, Tema)
         .join(Concepto, Concepto.id == DominioSnapshot.concepto_id)
         .join(Subtema, Subtema.id == Concepto.subtema_id).join(Tema, Tema.id == Subtema.tema_id)
         .join(Bloque, Bloque.id == Tema.bloque_id).where(Bloque.asignatura_id == asignatura_id))
    if desde:
        q = q.where(DominioSnapshot.fecha >= desde)
    total: dict[str, list[float]] = defaultdict(list)
    sub: dict[tuple, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    tem: dict[tuple, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for snap, s, t in session.execute(q).all():
        p = mastery.progreso(snap.theta, snap.sigma)
        total[snap.fecha].append(p)
        sub[(t.id, s.id, s.nombre)][snap.fecha].append(p)
        tem[(t.id, t.nombre)][snap.fecha].append(p)
    # el denominador es TODO el temario del nivel, no solo lo tocado
    por_sub = dict(session.execute(select(Concepto.subtema_id, func.count()).where(Concepto.deleted_at.is_(None))
                                   .group_by(Concepto.subtema_id)).all())
    de_tema = dict(session.execute(select(Subtema.id, Subtema.tema_id)).all())
    por_tema: dict[str, int] = defaultdict(int)
    for sid, n in por_sub.items():
        por_tema[de_tema[sid]] += n
    n_asig = len(mastery._concept_ids(session, "asignatura", asignatura_id))

    def serie(d: dict[str, list[float]], n: int) -> list[dict]:
        return [{"fecha": f, "percent": round(100 * sum(v) / n)} for f, v in sorted(d.items())]

    return {
        "asignatura": serie(total, n_asig),
        "temas": [{"tema_id": tid, "tema": nombre, "puntos": serie(d, por_tema[tid]),
                   "subtemas": [{"subtema_id": sid, "subtema": sn, "puntos": serie(sd, por_sub[sid])}
                                for (tt, sid, sn), sd in sub.items() if tt == tid]}
                  for (tid, nombre), d in tem.items()],
    }


def _tiempos_activos(session: Session, filas: list) -> tuple[dict[str, float], dict[str, float]]:
    """Por intento: segundos activos (sin la pestaña oculta; los antiguos usan t_envio) y su cociente con la carga esperada."""
    por_evento = {i.evento_id: i for i, *_ in filas if i.t_envio is not None}
    payloads = dict(session.execute(select(Evento.id, Evento.payload).where(Evento.id.in_(list(por_evento)))).all()) if por_evento else {}
    textos: dict[str, list[str]] = defaultdict(list)
    ids = {f[1].id for f in filas}
    for pid, texto in session.execute(select(Opcion.pregunta_id, Opcion.texto).where(Opcion.pregunta_id.in_(ids)).order_by(Opcion.posicion)).all() if ids else []:
        textos[pid].append(texto)
    carga = {f[1].id: carga_esperada(f[1].tipo, f[1].enunciado, f[1].contexto, textos[f[1].id]) for f in filas}
    activo, ritmo = {}, {}
    for i, p, *_ in filas:
        if i.t_envio is None:
            continue
        t = ((payloads.get(i.evento_id) or {}).get("tiempos") or {}).get("t_activo")
        activo[i.id] = float(t) if isinstance(t, (int, float)) else i.t_envio
        ritmo[i.id] = activo[i.id] / carga[p.id]
    return activo, ritmo


def _retencion(intentos: list) -> dict:
    """Retención real (D9): % de aciertos en repasos hechos tras 1 día o más (y tras 7 o más) desde el intento anterior."""
    def tras(dias: int) -> dict:
        xs = [i for i in intentos if i.intervalo_desde_anterior is not None and i.intervalo_desde_anterior >= dias * 86400]
        return {"n": len(xs), "pct": _pct(sum(i.correcta for i in xs), len(xs))}
    return {"d1": tras(1), "d7": tras(7)}


def _errores_escritura(session: Session, filas: list) -> list[dict]:
    """Tipo de cada hueco fallado en las escritas (apertura, acento omitido, letra cambiada, longitud...), comparando lo
    escrito con las formas válidas. «Troba l'error» queda fuera: ahí se marca un fragmento, no se escribe la palabra."""
    fallidas = [(i, p) for i, p, *_ in filas if p.tipo == "escrita" and not i.correcta]
    if not fallidas:
        return []
    payloads = dict(session.execute(select(Evento.id, Evento.payload).where(Evento.id.in_([i.evento_id for i, _ in fallidas]))).all())
    campos = dict(session.execute(select(Opcion.pregunta_id, Opcion.texto).where(
        Opcion.pregunta_id.in_({p.id for _, p in fallidas}), Opcion.posicion == "a")).all())
    cuenta: Counter = Counter()
    for i, p in fallidas:
        pay = payloads.get(i.evento_id) or {}
        try:
            cs = json.loads(campos[p.id])
        except (KeyError, ValueError):
            continue
        for c, escrito, d in zip(cs, pay.get("respuestas") or [], pay.get("detalle") or []):
            if d.get("correcto") or c.get("etiqueta") == "Error":
                continue
            if tipo := clasificar_error(escrito, c["validas"]):
                cuenta[tipo] += 1
    return [{"tipo": t, "n": n} for t, n in cuenta.most_common()]


DIAS_OLVIDO = 21
UMBRAL_OLVIDO = 70  # % de recuperabilidad por debajo del cual conviene repasar


def _olvido(session: Session, asignatura_id: str, ahora: datetime) -> dict:
    """Recuperabilidad FSRS proyectada a 21 días: media por tema, y qué conceptos cruzan el umbral y cuándo."""
    filas = session.execute(
        select(Dominio, Concepto, Tema).join(Concepto, Concepto.id == Dominio.concepto_id)
        .join(Subtema, Subtema.id == Concepto.subtema_id).join(Tema, Tema.id == Subtema.tema_id)
        .join(Bloque, Bloque.id == Tema.bloque_id)
        .where(Bloque.asignatura_id == asignatura_id, Dominio.n_intentos > 0, Dominio.fsrs_state.is_not(None))).all()
    dias = list(range(DIAS_OLVIDO + 1))
    por_tema: dict[tuple, list[list[float]]] = defaultdict(list)
    cruces = []
    ya_bajo = 0
    for dom, c, t in filas:
        curva = [100 * _retrievability(dom.fsrs_state, ahora + timedelta(days=d)) for d in dias]
        por_tema[(t.id, t.nombre)].append(curva)
        if curva[0] < UMBRAL_OLVIDO:
            ya_bajo += 1
        else:
            dia = next((d for d, r in zip(dias, curva) if r < UMBRAL_OLVIDO), None)
            if dia is not None:
                cruces.append({"concepto_id": c.id, "concepto": c.nombre, "tema": t.nombre, "dia": dia})
    cruces.sort(key=lambda x: x["dia"])
    return {
        "dias": dias, "umbral": UMBRAL_OLVIDO, "ya_bajo": ya_bajo,
        "temas": [{"tema_id": tid, "tema": nombre, "n": len(cs), "curva": [round(sum(c[d] for c in cs) / len(cs), 1) for d in dias]}
                  for (tid, nombre), cs in por_tema.items()],
        "cruces": cruces[:8], "cruzan_7": sum(x["dia"] <= 7 for x in cruces), "cruzan_14": sum(x["dia"] <= 14 for x in cruces),
    }


def analytics(session: Session, asignatura_id: str, dias: int = 0, ahora: datetime | None = None) -> dict:
    """Todo lo que muestra el historial. `dias` = 0 usa todo el historial."""
    ahora = ahora or datetime.now(UTC).replace(tzinfo=None)
    desde = ahora - timedelta(days=dias) if dias else None
    q = (select(Intento, Pregunta, Concepto, Subtema, Tema)
         .join(Pregunta, Pregunta.id == Intento.pregunta_id).join(Concepto, Concepto.id == Intento.concepto_id)
         .join(Subtema, Subtema.id == Concepto.subtema_id).join(Tema, Tema.id == Subtema.tema_id)
         .join(Bloque, Bloque.id == Tema.bloque_id)
         .where(Bloque.asignatura_id == asignatura_id, Intento.deleted_at.is_(None), Pregunta.excluida.is_(False))
         .order_by(Intento.id))
    if desde:
        q = q.where(Intento.created_at >= desde)
    filas = session.execute(q).all()
    intentos = [f[0] for f in filas]
    n = len(intentos)
    ok = sum(i.correcta for i in intentos)

    dias_activos: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for i in intentos:
        d = dias_activos[_local(i.created_at).date().isoformat()]
        d[0] += 1
        d[1] += i.correcta
    actividad = [{"fecha": f, "n": v[0], "aciertos": v[1]} for f, v in sorted(dias_activos.items())]

    horas = _grupo(intentos, lambda i: i.hora_dia, list(range(24)))
    candidatas = [h for h in horas if h["n"] >= MIN_HORA]
    mejor = max(candidatas, key=lambda h: (h["aciertos_pct"], h["n"]))["clave"] if candidatas else None
    evo = _evolucion(session, asignatura_id, desde and _local(desde).date().isoformat())
    serie = evo["asignatura"]

    trampas: Counter = Counter()
    trampa_concepto: dict[str, Counter] = defaultdict(Counter)
    trampa_pregunta: dict[str, Counter] = defaultdict(Counter)  # pregunta en la que más cae con esa trampa
    for i, _, c, _, _ in filas:
        if i.trampa_elegida:
            trampas[i.trampa_elegida] += 1
            trampa_concepto[i.trampa_elegida][c.nombre] += 1
            trampa_pregunta[i.trampa_elegida][i.pregunta_id] += 1

    por_pregunta: dict[str, list] = defaultdict(list)
    for i, p, *_ in filas:
        por_pregunta[p.id].append((i, p))
    dificiles = sorted(
        ({"pregunta_id": pid, "enunciado": v[0][1].enunciado, "n": len(v), "fallos": sum(not x[0].correcta for x in v)}
         for pid, v in por_pregunta.items()),
        key=lambda d: (-d["fallos"], -d["n"]))
    dificiles = [d for d in dificiles if d["n"] >= 2 and d["fallos"] / d["n"] >= 0.5][:8]

    por_concepto: dict[str, list[Intento]] = defaultdict(list)
    nombres: dict[str, tuple[str, str]] = {}
    for i, _, c, s, _ in filas:
        por_concepto[c.id].append(i)
        nombres[c.id] = (c.nombre, s.nombre)
    debiles = []
    for dom in session.scalars(select(Dominio).where(Dominio.concepto_id.in_(list(por_concepto) or [""]),
                                                     Dominio.n_intentos > 0).order_by(Dominio.theta).limit(8)):
        xs = por_concepto[dom.concepto_id]
        debiles.append({"concepto_id": dom.concepto_id, "concepto": nombres[dom.concepto_id][0],
                        "subtema": nombres[dom.concepto_id][1], "percent": mastery.percent_de(session, dom),
                        "n": len(xs), "aciertos_pct": _pct(sum(x.correcta for x in xs), len(xs))})

    por_sesion: dict[str, list[Intento]] = defaultdict(list)
    for i in intentos:
        por_sesion[i.sesion_id].append(i)
    sesiones = []
    for sid, xs in por_sesion.items():
        ses = session.get(Sesion, sid)
        sesiones.append({"sesion_id": sid, "modo": ses.modo, "inicio": ses.inicio.replace(tzinfo=UTC).isoformat(),
                         "duracion_s": round((xs[-1].created_at - ses.inicio).total_seconds()),
                         "n": len(xs), "aciertos": sum(x.correcta for x in xs)})
    sesiones.sort(key=lambda s: s["inicio"], reverse=True)

    activo, ritmo = _tiempos_activos(session, filas)
    conceptos = [{"concepto_id": cid, "concepto": nombres[cid][0], "subtema": nombres[cid][1], "n": len(xs),
                  "aciertos_pct": _pct(sum(x.correcta for x in xs), len(xs)), "ritmo": round(_media([ritmo[x.id] for x in xs if x.id in ritmo]), 2)}
                 for cid, xs in por_concepto.items() if len(xs) >= 3 and any(x.id in ritmo for x in xs)]
    con_tiempo = [i for i in intentos if i.id in activo]
    return {
        "resumen": {
            "respondidas": n, "aciertos_pct": _pct(ok, n), "dias_estudiados": len(actividad),
            "tiempo_medio_s": _media([activo[i.id] for i in con_tiempo]),
            "ritmo": _media([ritmo[i.id] for i in con_tiempo]), "retencion": _retencion(intentos), "mejor_hora": mejor, "sesiones": len(por_sesion),
            "dominio_pct": mastery.percent_of(session, "asignatura", asignatura_id),
            "dominio_delta": serie[-1]["percent"] - serie[0]["percent"] if len(serie) > 1 else 0,
        },
        "actividad": actividad,
        "evolucion": evo,
        "confianza": [{"confianza": g["clave"], "n": g["n"], "aciertos_pct": g["aciertos_pct"]}
                      for g in _grupo(intentos, lambda i: i.confianza or "sin", [*CONFIANZAS, "sin"])],
        "horas": [{"hora": h["clave"], "n": h["n"], "aciertos_pct": h["aciertos_pct"]} for h in horas],
        "semana": [{"dia": g["clave"], "n": g["n"], "aciertos_pct": g["aciertos_pct"]}
                   for g in _grupo(intentos, lambda i: i.dia_semana, list(range(7)))],
        "fatiga": [{"tramo": t[2], "desde": t[0], "n": len(xs), "aciertos_pct": _pct(sum(x.correcta for x in xs), len(xs)),
                    "tiempo_medio_s": _media([activo[x.id] for x in xs if x.id in activo]),
                    "ritmo": _media([ritmo[x.id] for x in xs if x.id in ritmo])}
                   for t in TRAMOS_POSICION
                   for xs in [[i for i in intentos if i.posicion_sesion >= t[0] and (t[1] is None or i.posicion_sesion <= t[1])]]],
        "velocidad": [{"tramo": g["clave"], "n": g["n"], "aciertos_pct": g["aciertos_pct"]}
                      for g in _grupo(con_tiempo, lambda i: _tramo(activo[i.id], TRAMOS_TIEMPO), [t[2] for t in TRAMOS_TIEMPO])],
        "dificultad": [{"dificultad": g["clave"], "n": g["n"], "aciertos_pct": g["aciertos_pct"]}
                       for g in _grupo(intentos, lambda i: i.dificultad, [1, 2, 3, 4, 5])],
        "trampas": [{"trampa": t, "n": c, "concepto": trampa_concepto[t].most_common(1)[0][0],
                     "pregunta_id": trampa_pregunta[t].most_common(1)[0][0]}
                    for t, c in trampas.most_common(10)],
        "errores_escritura": _errores_escritura(session, filas),
        "conceptos": conceptos,
        "olvido": _olvido(session, asignatura_id, ahora),
        "debiles": debiles,
        "dificiles": dificiles,
        "sesiones_recientes": sesiones[:10],
    }
