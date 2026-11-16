"""Qué pregunta toca ahora. Criterios de aprendizaje (neuroeducación), todos medibles y ajustables aquí:

- Dificultad deseable: se busca acertar alrededor del TARGET (60 %), no lo cómodo. El esfuerzo al recuperar fija lo aprendido.
- Conocimiento previo: sin datos de un concepto se supone un dominio de PRIOR_THETA, así que empieza por preguntas difíciles;
  pasados PRIOR_ATTEMPTS intentos manda lo medido.
- Intercalado: nunca el mismo concepto seguido (salvo apartados de un mismo problema), se alternan subtemas y tipos de pregunta.
- Espaciado y recuperación: un concepto fallado vuelve enseguida con otra pregunta (FAIL_GAP); los conceptos que la repetición
  espaciada (FSRS) da por olvidados pesan más.
- Variedad: se sortea entre las TOP_K mejores en vez de elegir siempre la primera, para que no sea predecible.
- Saltar: una pregunta saltada vuelve después de SKIP_GAP respuestas (antes, solo si no queda otra).
- Problemas con apartados: se sirven seguidos y en orden; los apartados b, c... no entran por su cuenta.
"""
import json
import random
from collections import defaultdict
from dataclasses import dataclass, field

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from .mastery import expected_correct
from .models import Bloque, Concepto, Dominio, Evento, Intento, Opcion, Pregunta, Subtema, Tema, utcnow

TARGET = 0.6
PRIOR_THETA = 1.0
PRIOR_ATTEMPTS = 3
FAIL_GAP = 2  # respuestas intermedias antes de reintroducir un concepto fallado (siempre dentro de 5)
SKIP_GAP = 3
REINTENTO_GAP = 3  # respuestas intermedias antes de repetir una escrita fallada (la misma pregunta, una sola vez)
SEEN_PENALTY = 0.15
TOP_K = 5
SAME_CONCEPT = 1.0
SAME_SUBTEMA = 0.05
SAME_TIPO = 0.04  # si la última respuesta fue del mismo tipo (la anterior pesa la mitad)
DUE_BONUS = 0.08
SKIPPED_PENALTY = 2.0
SKIPPED_BONUS = 0.1


@dataclass
class Filtro:
    asignatura_id: str
    tema_id: str | None = None
    subtema_id: str | None = None
    solo_fallos: bool = False
    tipos: list[str] | None = None  # test, vf, problema; None = todos


@dataclass
class OpcionOut:
    letra: str  # letra original de la opción; la posición en pantalla la da el orden de la lista
    texto: str


@dataclass
class QuestionOut:
    pregunta_id: str
    concepto_id: str
    subtema_id: str
    enunciado: str
    opciones: list[OpcionOut]
    orden: list[str]
    dificultad: int
    ayuda_larga: str | None
    fuente_id: str | None
    fuente_pagina: int | None
    fuente_cara: int | None
    tema: str = ""
    subtema: str = ""
    tipo: str = "test"
    imagen: str | None = None
    grupo: str | None = None
    contexto: str | None = None
    apartado: str | None = None
    campos: list[str] = field(default_factory=list)  # etiquetas de los huecos de una escrita
    reintento: bool = False  # repetición de una escrita fallada hace un momento
    servida: dict = field(default_factory=dict)  # analítica: motivo, p_pred y días desde el concepto; no sale al cliente


def _candidates(filtro: Filtro) -> Select:
    q = (select(Pregunta, Concepto.subtema_id)
         .join(Concepto, Concepto.id == Pregunta.concepto_id)
         .join(Subtema, Subtema.id == Concepto.subtema_id)
         .join(Tema, Tema.id == Subtema.tema_id)
         .join(Bloque, Bloque.id == Tema.bloque_id)
         .where(Bloque.asignatura_id == filtro.asignatura_id, Pregunta.es_actual.is_(True),
                Pregunta.activa.is_(True), Pregunta.excluida.is_(False), Pregunta.deleted_at.is_(None),
                Concepto.deleted_at.is_(None)))
    if filtro.tema_id:
        q = q.where(Tema.id == filtro.tema_id)
    if filtro.subtema_id:
        q = q.where(Subtema.id == filtro.subtema_id)
    if filtro.tipos:
        q = q.where(Pregunta.tipo.in_(filtro.tipos))
    return q


def _to_out(session: Session, p: Pregunta, subtema_id: str, rng: random.Random, reintento: bool = False) -> QuestionOut:
    sub = session.get(Subtema, subtema_id)
    textos = {o.posicion: o.texto for o in session.scalars(select(Opcion).where(Opcion.pregunta_id == p.id))}
    etiquetas = [c.get("etiqueta", "") for c in json.loads(textos["a"])] if p.tipo == "escrita" else []
    if p.tipo in ("problema", "escrita"):
        textos = {}  # la solución no sale del servidor hasta que se responde
    orden = sorted(textos)
    rng.shuffle(orden)
    return QuestionOut(
        pregunta_id=p.id, concepto_id=p.concepto_id, subtema_id=subtema_id, enunciado=p.enunciado,
        opciones=[OpcionOut(l, textos[l]) for l in orden], orden=orden, dificultad=p.dificultad_base,
        ayuda_larga=p.ayuda_larga, fuente_id=p.fuente_id, fuente_pagina=p.fuente_pagina, fuente_cara=p.fuente_cara,
        tema=session.get(Tema, sub.tema_id).nombre, subtema=sub.nombre, tipo=p.tipo, imagen=p.imagen,
        grupo=p.grupo, contexto=p.contexto, apartado=p.apartado,
        campos=etiquetas, reintento=reintento)


def _seen_counts(session: Session) -> dict[str, int]:
    """Veces que se respondió cada pregunta (por clave, de cualquier versión)."""
    rows = session.execute(select(Pregunta.clave, func.count()).join(Intento, Intento.pregunta_id == Pregunta.id)
                           .group_by(Pregunta.clave)).all()
    return dict(rows)


def _theta_efectivo(dom: Dominio | None) -> float:
    """Habilidad que se supone en un concepto: el conocimiento previo hasta que hay datos suficientes."""
    if dom is None:
        return PRIOR_THETA
    w = min(dom.n_intentos / PRIOR_ATTEMPTS, 1.0)
    return w * dom.theta + (1 - w) * PRIOR_THETA


def _saltadas(session: Session, sesion_id: str) -> dict[str, int]:
    """Preguntas saltadas en la sesión y cuántas respuestas llevaba entonces (manda el último salto)."""
    cuenta, out = 0, {}
    for tipo, pid in session.execute(
            select(Evento.tipo, Evento.pregunta_id).where(
                Evento.sesion_id == sesion_id, Evento.tipo.in_(["respuesta_enviada", "pregunta_saltada"]))
            .order_by(Evento.id)):
        if tipo == "respuesta_enviada":
            cuenta += 1
        else:
            out[pid] = cuenta
    return out


def _anotar(session: Session, out: QuestionOut, p: Pregunta, motivo: str) -> QuestionOut:
    """Guarda por qué se sirvió la pregunta y la probabilidad de acierto que se esperaba (para calibrar el selector)."""
    dom = session.scalar(select(Dominio).where(Dominio.concepto_id == p.concepto_id))
    ultimo = session.scalar(select(func.max(Intento.created_at)).where(Intento.concepto_id == p.concepto_id))
    if motivo == "auto":
        if dom is not None and dom.proximo_repaso is not None and dom.proximo_repaso <= utcnow():
            motivo = "repaso_fsrs"
        else:
            motivo = "practica" if dom is not None and dom.n_intentos else "nuevo"
    out.servida = {"motivo": motivo, "p_pred": round(expected_correct(_theta_efectivo(dom), p.dificultad_base), 4),
                   "dias_concepto": round((utcnow() - ultimo).total_seconds() / 86400, 2) if ultimo else None}
    return out


def next_question(session: Session, sesion_id: str, filtro: Filtro, rng: random.Random | None = None,
                  variedad: int | None = None) -> QuestionOut | None:
    rng = rng or random.Random()
    variedad = TOP_K if variedad is None else variedad
    answered = session.execute(
        select(Intento.pregunta_id, Intento.correcta, Intento.concepto_id).where(Intento.sesion_id == sesion_id)
        .order_by(Intento.id)).all()
    answered_ids = {a[0] for a in answered}
    todas = session.execute(_candidates(filtro)).all()
    # corrección activa: una escrita fallada (una sola vez en la sesión) vuelve a salir pasadas REINTENTO_GAP respuestas
    por_pregunta: dict[str, list[tuple[int, bool]]] = defaultdict(list)
    for idx, (pid, correcta, _) in enumerate(answered):
        por_pregunta[pid].append((idx, correcta))
    debidas = [(por_pregunta[p.id][0][0], p, sub) for p, sub in todas
               if p.tipo == "escrita" and len(por_pregunta.get(p.id, [])) == 1 and not por_pregunta[p.id][0][1]
               and len(answered) - 1 - por_pregunta[p.id][0][0] >= REINTENTO_GAP]
    if debidas:  # la fallada hace más tiempo primero
        _, p, sub = min(debidas, key=lambda d: d[0])
        return _anotar(session, _to_out(session, p, sub, rng, reintento=True), p, "reintento")
    cands = [(p, sub) for p, sub in todas if p.id not in answered_ids]
    # una pregunta ya respondida en esta sesión, en otra versión, tampoco se repite
    answered_claves = set(session.scalars(select(Pregunta.clave).where(Pregunta.id.in_(answered_ids)))) \
        if answered_ids else set()
    cands = [(p, s) for p, s in cands if p.clave not in answered_claves]

    if filtro.solo_fallos:
        failed = set(session.scalars(select(Intento.concepto_id).where(Intento.correcta.is_(False))))
        cands = [(p, s) for p, s in cands if p.concepto_id in failed]

    # grupos de apartados: saltar un apartado salta todo el grupo
    saltadas = _saltadas(session, sesion_id)
    grupo_saltado: dict[str, int] = {}
    for pid, n in saltadas.items():
        g = session.scalar(select(Pregunta.grupo).where(Pregunta.id == pid))
        if g:
            grupo_saltado[g] = n

    def saltada_en(p: Pregunta) -> int | None:
        return saltadas.get(p.id, grupo_saltado.get(p.grupo) if p.grupo else None)

    # continuación de un problema con apartados: el siguiente apartado va justo después
    if answered:
        ultimo = session.get(Pregunta, answered[-1][0])
        if ultimo.grupo:
            resto = sorted((c for c in cands if c[0].grupo == ultimo.grupo and saltada_en(c[0]) is None),
                           key=lambda c: c[0].apartado)
            if resto:
                return _anotar(session, _to_out(session, resto[0][0], resto[0][1], rng), resto[0][0], "apartado")
    # los apartados b, c... solo entran como continuación; la entrada es el primer apartado activo del grupo
    grupos = {p.grupo for p, _ in cands if p.grupo}
    if grupos:
        primero = dict(session.execute(select(Pregunta.grupo, func.min(Pregunta.apartado)).where(
            Pregunta.grupo.in_(grupos), Pregunta.es_actual.is_(True), Pregunta.activa.is_(True),
            Pregunta.excluida.is_(False), Pregunta.deleted_at.is_(None)).group_by(Pregunta.grupo)).all())
        cands = [(p, s) for p, s in cands if not p.grupo or p.apartado == primero.get(p.grupo)]
    if not cands:
        return None

    # conceptos fallados en esta sesión que ya toca reintroducir con otra pregunta
    last_fail: dict[str, int] = {}
    for idx, (_, correcta, concepto_id) in enumerate(answered):
        if correcta:
            last_fail.pop(concepto_id, None)
        else:
            last_fail[concepto_id] = idx
    due = [c for c, idx in last_fail.items() if len(answered) - 1 - idx >= FAIL_GAP]
    due_cands = [(p, s) for p, s in cands if p.concepto_id in due]
    pool = due_cands or cands

    dominios = {d.concepto_id: d for d in session.scalars(select(Dominio))}
    seen = _seen_counts(session)
    last_concept = answered[-1][2] if answered else None
    last_subtema = session.scalar(select(Concepto.subtema_id).where(Concepto.id == last_concept)) if answered else None
    ultimos_tipos = [session.scalar(select(Pregunta.tipo).where(Pregunta.id == a[0])) for a in answered[-2:]]
    ahora = utcnow()

    def score(item: tuple[Pregunta, str]) -> float:
        p, sub = item
        dom = dominios.get(p.concepto_id)
        s = abs(expected_correct(_theta_efectivo(dom), p.dificultad_base) - TARGET)
        s += SEEN_PENALTY * min(seen.get(p.clave, 0), 3)
        if p.concepto_id == last_concept:
            s += SAME_CONCEPT
        if not filtro.subtema_id and sub == last_subtema:
            s += SAME_SUBTEMA
        s += sum(w for t, w in zip(reversed(ultimos_tipos), (SAME_TIPO, SAME_TIPO / 2)) if t == p.tipo)
        if dom is not None and dom.proximo_repaso is not None and dom.proximo_repaso <= ahora:
            s -= DUE_BONUS  # el repaso espaciado dice que toca recordarlo
        salto = saltada_en(p)
        if salto is not None:
            s += SKIPPED_PENALTY if len(answered) - salto < SKIP_GAP else -SKIPPED_BONUS
        return s

    # una saltada espera fuera del sorteo hasta pasar SKIP_GAP respuestas; solo se sirve antes si no queda otra
    esperando = {p.id for p, _ in pool if saltada_en(p) is not None and len(answered) - saltada_en(p) < SKIP_GAP}
    ranking = sorted([it for it in pool if it[0].id not in esperando] or pool, key=score)[: max(variedad, 1)]
    p, sub = rng.choices(ranking, weights=[1 / (1 + i) ** 1.5 for i in range(len(ranking))])[0]
    return _anotar(session, _to_out(session, p, sub, rng), p, "fallo_sesion" if p.concepto_id in due else "auto")
