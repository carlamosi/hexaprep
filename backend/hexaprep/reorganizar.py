"""Reorganiza el catálogo de una asignatura (temas, subtemas y conceptos) según un mapa declarativo, sin perder progreso.

Los conceptos que solo cambian de sitio conservan su fila (id, dominio, FSRS, snapshots, intentos). Una fusión reasigna
preguntas e intentos al concepto que queda y lo reconstruye; una partición reparte intentos y preguntas por la clave de la
pregunta. Es idempotente: con el catálogo ya en su sitio no cambia nada. No hace commit: quien llama confirma o revierte.
Formato del mapa: banks/catala/estructura.json.
"""
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from . import mastery, scheduling
from .models import (
    Asignatura, Bloque, Concepto, Dominio, DominioSnapshot, Intento, Pregunta, Subtema, Tema, utcnow,
)


@dataclass
class Informe:
    renombrados: list[str] = field(default_factory=list)
    creados: list[str] = field(default_factory=list)
    reordenados: int = 0
    movidos: list[str] = field(default_factory=list)
    fusionados: list[str] = field(default_factory=list)
    partidos: list[str] = field(default_factory=list)
    subtemas_retirados: list[str] = field(default_factory=list)
    temas_retirados: list[str] = field(default_factory=list)
    intentos_reasignados: int = 0
    dominios_reconstruidos: int = 0
    snapshots_regenerados: int = 0
    faltan: list[str] = field(default_factory=list)  # conceptos del mapa sin origen en esta base (el importador los creará)
    huerfanos: list[str] = field(default_factory=list)  # subtemas o temas fuera del mapa que aún tienen conceptos vivos

    @property
    def hubo_cambios(self) -> bool:
        return bool(self.renombrados or self.creados or self.reordenados or self.movidos or self.fusionados or self.partidos
                    or self.subtemas_retirados or self.temas_retirados or self.intentos_reasignados)

    def resumen(self) -> dict:
        return {k: (len(v) if isinstance(v, list) else v) for k, v in self.__dict__.items()}


def cargar_estructura(ruta: Path) -> dict:
    return json.loads(Path(ruta).read_text(encoding="utf-8"))


def _vivos(session: Session, modelo, *where):
    return list(session.scalars(select(modelo).where(*where, modelo.deleted_at.is_(None))))


def _n_intentos(session: Session, concepto_id: str) -> int:
    return session.scalar(select(func.count()).select_from(Intento).where(Intento.concepto_id == concepto_id))


def _reconstruir(session: Session, concepto_id: str, informe: Informe) -> None:
    """Dominio y FSRS desde sus intentos; un concepto sin intentos queda vacío (sin crear fila si no la tenía)."""
    if session.scalar(select(Dominio.id).where(Dominio.concepto_id == concepto_id)) or _n_intentos(session, concepto_id):
        mastery.rebuild(session, concepto_id)
        scheduling.rebuild(session, concepto_id)
        informe.dominios_reconstruidos += 1


def _regenerar_snapshots(session: Session, fechas: set[str], conceptos: list[str], informe: Informe) -> None:
    """Un snapshot por fecha repitiendo los intentos hasta ese día (como los que escribe snapshot_daily)."""
    session.execute(delete(DominioSnapshot).where(DominioSnapshot.concepto_id.in_(conceptos)))
    for cid in conceptos:
        if not session.get(Concepto, cid).deleted_at:
            for fecha in sorted(fechas):
                hasta = datetime.fromisoformat(fecha) + timedelta(days=1)
                theta, sigma, n, *_ = mastery.reconstruir(session, cid, hasta=hasta)
                if n:
                    session.add(DominioSnapshot(concepto_id=cid, fecha=fecha, theta=theta, sigma=sigma))
                    informe.snapshots_regenerados += 1
    session.flush()


def _fechas(session: Session, conceptos: list[str]) -> set[str]:
    return set(session.scalars(select(DominioSnapshot.fecha).where(DominioSnapshot.concepto_id.in_(conceptos))))


def _retirar(session: Session, concepto: Concepto) -> None:
    concepto.deleted_at = utcnow()
    session.flush()


def reorganizar(session: Session, estructura: dict) -> Informe:
    informe = Informe()
    asig = session.scalar(select(Asignatura).where(Asignatura.nombre == estructura["asignatura"], Asignatura.deleted_at.is_(None)))
    bloque = session.scalar(select(Bloque).where(Bloque.asignatura_id == asig.id, Bloque.nombre == estructura["bloque"],
                                                 Bloque.deleted_at.is_(None))) if asig else None
    if bloque is None:
        informe.faltan.append(f"asignatura o bloque «{estructura['asignatura']}» no existe en esta base")
        return informe

    temas_v = _vivos(session, Tema, Tema.bloque_id == bloque.id)
    subs_v = _vivos(session, Subtema, Subtema.tema_id.in_([t.id for t in temas_v]))
    nombre_tema = {t.id: t.nombre for t in temas_v}
    nombre_sub = {s.id: s.nombre for s in subs_v}
    # rutas ANTES de renombrar nada: así se localizan tanto los conceptos viejos como los que ya están en su sitio
    por_ruta: dict[tuple, list[Concepto]] = {}
    for c in _vivos(session, Concepto, Concepto.subtema_id.in_(list(nombre_sub))):
        s = next(s for s in subs_v if s.id == c.subtema_id)
        por_ruta.setdefault((nombre_tema[s.tema_id], s.nombre, c.nombre), []).append(c)

    sub_destino: dict[tuple, Subtema] = {}
    en_mapa_temas: set[str] = set()
    en_mapa_subs: set[str] = set()
    for i, t in enumerate(estructura["temas"]):
        tema = next((x for x in _vivos(session, Tema, Tema.bloque_id == bloque.id) if x.nombre == t["nombre"]), None)
        if tema is None and t.get("renombra"):
            tema = next((x for x in _vivos(session, Tema, Tema.bloque_id == bloque.id) if x.nombre == t["renombra"]), None)
            if tema:
                informe.renombrados.append(f"tema «{tema.nombre}» → «{t['nombre']}»")
                tema.nombre = t["nombre"]
        if tema is None:
            tema = Tema(bloque_id=bloque.id, nombre=t["nombre"], orden=i)
            session.add(tema)
            informe.creados.append(f"tema «{t['nombre']}»")
        if tema.orden != i:
            tema.orden = i
            informe.reordenados += 1
        session.flush()
        en_mapa_temas.add(tema.id)
        todos_subs = _vivos(session, Subtema, Subtema.tema_id.in_([x.id for x in _vivos(session, Tema, Tema.bloque_id == bloque.id)]))
        for j, s in enumerate(t["subtemas"]):
            sub = next((x for x in todos_subs if x.nombre == s["nombre"] and x.tema_id == tema.id), None)
            if sub is None and s.get("renombra"):
                sub = next((x for x in todos_subs if x.nombre == s["renombra"] and x.id not in en_mapa_subs), None)
                if sub:
                    informe.renombrados.append(f"subtema «{sub.nombre}» → «{s['nombre']}»"
                                               + ("" if sub.tema_id == tema.id else f" (pasa a «{t['nombre']}»)"))
                    sub.nombre, sub.tema_id = s["nombre"], tema.id
            if sub is None:
                sub = Subtema(tema_id=tema.id, nombre=s["nombre"], orden=j)
                session.add(sub)
                informe.creados.append(f"subtema «{s['nombre']}»")
            if sub.orden != j:
                sub.orden = j
                informe.reordenados += 1
            session.flush()
            en_mapa_subs.add(sub.id)
            sub_destino[(t["nombre"], s["nombre"])] = sub

    particiones: dict[str, list[tuple[Subtema, dict, str]]] = {}
    for t in estructura["temas"]:
        for s in t["subtemas"]:
            sub = sub_destino[(t["nombre"], s["nombre"])]
            for c in s["conceptos"]:
                nuevo = f"{t['nombre']} > {s['nombre']} > {c['nombre']}"
                if "claves" in c:  # las piezas de una partición comparten origen: se reparten juntas
                    particiones.setdefault(json.dumps(c["de"]), []).append((sub, c, nuevo))
                    continue
                rutas = [*c["de"], [t["nombre"], s["nombre"], c["nombre"]]]
                candidatos = list({x.id: x for r in rutas for x in por_ruta.get(tuple(r), [])}.values())
                if candidatos:
                    _mover_o_fusionar(session, c, sub, candidatos, nuevo, informe)
                else:
                    informe.faltan.append(nuevo)
    for piezas in particiones.values():
        rutas = piezas[0][1]["de"]
        candidatos = list({x.id: x for r in rutas for x in por_ruta.get(tuple(r), [])}.values())
        _partir(session, piezas, candidatos, informe)

    for s in _vivos(session, Subtema, Subtema.tema_id.in_([t.id for t in _vivos(session, Tema, Tema.bloque_id == bloque.id)])):
        if s.id not in en_mapa_subs:
            if _vivos(session, Concepto, Concepto.subtema_id == s.id):
                informe.huerfanos.append(f"subtema «{s.nombre}» fuera del mapa con conceptos vivos")
            else:
                s.deleted_at = utcnow()
                informe.subtemas_retirados.append(s.nombre)
    session.flush()
    for t in _vivos(session, Tema, Tema.bloque_id == bloque.id):
        if t.id not in en_mapa_temas:
            if _vivos(session, Subtema, Subtema.tema_id == t.id):
                informe.huerfanos.append(f"tema «{t.nombre}» fuera del mapa con subtemas vivos")
            else:
                t.deleted_at = utcnow()
                informe.temas_retirados.append(t.nombre)
    session.flush()
    return informe


def _mover_o_fusionar(session: Session, c: dict, sub: Subtema, candidatos: list[Concepto], nuevo: str, informe: Informe) -> None:
    # el que queda es el que más intentos tiene (su historial es el que cuenta); a igualdad, el de nombre ya correcto
    candidatos.sort(key=lambda x: (-_n_intentos(session, x.id), x.nombre != c["nombre"]))
    quedan, otros = candidatos[0], candidatos[1:]
    if quedan.subtema_id != sub.id or quedan.nombre != c["nombre"]:
        informe.movidos.append(f"{quedan.nombre} → {nuevo}")
        quedan.subtema_id, quedan.nombre = sub.id, c["nombre"]
    if not otros:
        session.flush()
        return
    ids = [o.id for o in otros]
    tocaba = bool(_fechas(session, ids)) or any(_n_intentos(session, i) for i in ids)
    fechas = _fechas(session, [quedan.id, *ids])
    informe.intentos_reasignados += session.execute(update(Intento).where(Intento.concepto_id.in_(ids)).values(concepto_id=quedan.id)).rowcount
    session.execute(update(Pregunta).where(Pregunta.concepto_id.in_(ids)).values(concepto_id=quedan.id))
    for o in otros:
        _retirar(session, o)
    informe.fusionados.append(f"{' + '.join(sorted({o.nombre for o in otros} | {quedan.nombre}))} → {nuevo}")
    for i in ids:
        _reconstruir(session, i, informe)
    _reconstruir(session, quedan.id, informe)
    if tocaba:
        _regenerar_snapshots(session, fechas, [quedan.id, *ids], informe)
    session.flush()


def _partir(session: Session, piezas: list[tuple[Subtema, dict, str]], candidatos: list[Concepto], informe: Informe) -> None:
    """Reparte el concepto de origen entre sus piezas por la clave de cada pregunta."""
    existentes = {}
    for sub, c, nuevo in piezas:
        existentes[c["nombre"]] = next((x for x in _vivos(session, Concepto, Concepto.subtema_id == sub.id) if x.nombre == c["nombre"]), None)
    if not candidatos:
        informe.faltan += [nuevo for _, c, nuevo in piezas if existentes[c["nombre"]] is None]
        return
    fechas = _fechas(session, [x.id for x in candidatos])
    ids = []
    for sub, c, nuevo in piezas:
        pieza = existentes[c["nombre"]]
        if pieza is None:
            pieza = Concepto(subtema_id=sub.id, nombre=c["nombre"])
            session.add(pieza)
            session.flush()
            informe.creados.append(f"concepto «{c['nombre']}»")
        ids.append(pieza.id)
        for origen in candidatos:
            ids_p = select(Pregunta.id).where(Pregunta.clave.in_(c["claves"]), Pregunta.concepto_id == origen.id)
            informe.intentos_reasignados += session.execute(
                update(Intento).where(Intento.pregunta_id.in_(ids_p)).values(concepto_id=pieza.id)).rowcount
            session.execute(update(Pregunta).where(Pregunta.clave.in_(c["claves"]), Pregunta.concepto_id == origen.id)
                            .values(concepto_id=pieza.id))
    session.flush()
    informe.partidos.append(f"{candidatos[0].nombre} → {', '.join(n for _, _, n in piezas)}")
    for origen in candidatos:
        if not session.scalar(select(func.count()).select_from(Pregunta).where(Pregunta.concepto_id == origen.id)):
            _retirar(session, origen)
        _reconstruir(session, origen.id, informe)
    for i in ids:
        _reconstruir(session, i, informe)
    _regenerar_snapshots(session, fechas, [*ids, *[o.id for o in candidatos]], informe)
