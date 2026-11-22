"""Migración del catálogo de Català (hexaprep.reorganizar) sobre una base con el temario antiguo y progreso sintético.

La base se construye importando el banco de hoy con las rutas antiguas del snapshot (así las huellas coinciden con las que
tenía la base real). Cada fallo nombra el concepto con su ruta vieja y nueva.
"""
import json
import shutil
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hexaprep import mastery, scheduling
from hexaprep.auditoria import auditar
from hexaprep.bank import BankFile, load_bank
from hexaprep.db import get_engine, upgrade
from hexaprep.importer import import_bank
from hexaprep.models import (
    Bloque, Concepto, Dominio, DominioSnapshot, Evento, Intento, Pregunta, Sesion, Subtema, Tema,
)
from hexaprep.reorganizar import reorganizar

RAIZ = Path(__file__).resolve().parents[2]
FIX = Path(__file__).parent / "fixtures"
ESTRUCTURA = json.loads((RAIZ / "banks/catala/estructura.json").read_text(encoding="utf-8"))
ANTES: dict[str, list[str]] = json.loads((FIX / "catala_antes.json").read_text(encoding="utf-8"))
BANCOS = ("N2", "G1", "V1")  # orden de importación de tools/import_bank.py (por tema)
HOY = datetime(2026, 11, 22, 12, 0)


def banco_viejo(nombre: str) -> BankFile:
    data = json.loads((RAIZ / f"banks/catala/{nombre}.json").read_text(encoding="utf-8"))
    for q in data["preguntas"]:
        q["tema"], q["subtema"], q["concepto"] = ANTES[q["id"]]
    return BankFile.model_validate(data)


def ruta(session: Session, concepto_id: str) -> str:
    c = session.get(Concepto, concepto_id)
    s = session.get(Subtema, c.subtema_id)
    return f"{session.get(Tema, s.tema_id).nombre} > {s.nombre} > {c.nombre}"


def poner_progreso(session: Session) -> None:
    """Intentos sintéticos y deterministas en casi todos los conceptos (también en los que se fusionan y en la partición)."""
    sesiones = []
    for r in range(3):  # una pregunta se responde una vez por sesión
        sesiones.append(Sesion(modo="practica", filtro={}, inicio=HOY - timedelta(days=9 - r)))
        session.add(sesiones[-1])
    session.flush()
    claves = list(ANTES)
    n = 0
    for k, clave in enumerate(claves):
        if k % 3 == 1 and not clave.startswith("cat-v1"):
            continue  # unos conceptos quedan sin tocar
        if clave.startswith("cat-v1") and k % 4:
            continue
        p = session.scalar(select(Pregunta).where(Pregunta.clave == clave, Pregunta.es_actual.is_(True)))
        for rep in range(1 + k % 3):
            n += 1
            cuando = HOY - timedelta(days=9 - (k + rep) % 8)
            ses = sesiones[rep]
            ev = Evento(sesion_id=ses.id, tipo="respuesta_enviada", pregunta_id=p.id, payload={}, t_cliente=cuando)
            session.add(ev)
            session.flush()
            session.add(Intento(
                evento_id=ev.id, sesion_id=ses.id, pregunta_id=p.id, concepto_id=p.concepto_id, opcion_inicial="a",
                opcion_final="a", orden_opciones=["a", "b", "c", "d"], correcta=(k + rep) % 3 != 0, hora_dia=10,
                dia_semana=1, posicion_sesion=n, dificultad=1 + k % 5, created_at=cuando))
            session.flush()
    session.flush()
    for cid in session.scalars(select(Intento.concepto_id).distinct()).all():
        mastery.rebuild(session, cid)
        scheduling.rebuild(session, cid)
        for dias in (6, 3):  # snapshots antiguos de ejemplo
            fecha = (HOY - timedelta(days=dias)).date().isoformat()
            dom = session.scalar(select(Dominio).where(Dominio.concepto_id == cid))
            session.add(DominioSnapshot(concepto_id=cid, fecha=fecha, theta=dom.theta, sigma=dom.sigma))
    session.commit()


@pytest.fixture(scope="module")
def base_vieja(tmp_path_factory) -> Path:
    ruta_db = tmp_path_factory.mktemp("catala") / "vieja.db"
    engine = get_engine(ruta_db)
    upgrade(engine)
    with Session(engine) as s:
        for b in BANCOS:
            import_bank(s, banco_viejo(b))
        poner_progreso(s)
    engine.dispose()
    return ruta_db


@pytest.fixture
def db(base_vieja, tmp_path):
    copia = tmp_path / "t.db"
    shutil.copy(base_vieja, copia)
    engine = get_engine(copia)
    with Session(engine) as s:
        yield s
    engine.dispose()


def volcado(session: Session) -> dict:
    """Todo lo que la migración podría tocar, para comparar antes y después."""
    def filas(modelo, *cols):
        return sorted(tuple(getattr(r, c) for c in cols) for r in session.scalars(select(modelo)))
    return {
        "temas": filas(Tema, "id", "nombre", "orden", "deleted_at"),
        "subtemas": filas(Subtema, "id", "tema_id", "nombre", "orden", "deleted_at"),
        "conceptos": filas(Concepto, "id", "subtema_id", "nombre", "deleted_at"),
        "dominios": filas(Dominio, "concepto_id", "theta", "sigma", "n_intentos", "racha", "tendencia", "fsrs_state", "proximo_repaso"),
        "snapshots": filas(DominioSnapshot, "concepto_id", "fecha", "theta", "sigma"),
        "intentos": filas(Intento, "id", "concepto_id"),
        "preguntas": filas(Pregunta, "id", "concepto_id"),
    }


def migrar(session: Session):
    informe = reorganizar(session, ESTRUCTURA)
    session.commit()
    return informe


def vivos(session: Session, modelo):
    return list(session.scalars(select(modelo).where(modelo.deleted_at.is_(None))))


def test_base_de_prueba_tiene_el_temario_antiguo_y_progreso(db):
    temas = sorted(t.nombre for t in vivos(db, Tema))
    assert temas == ["T1 Normativa general", "T2 Gramàtica", "T3 Literatura", "Verbs"], f"la base de prueba no es la antigua: {temas}"
    assert db.scalar(select(func.count()).select_from(Intento)) > 40


def test_cada_concepto_vivo_cae_en_un_subtema_y_cada_subtema_en_un_tema(db):
    migrar(db)
    temas = {t.id: t for t in vivos(db, Tema)}
    subs = {s.id: s for s in vivos(db, Subtema)}
    problemas = []
    for c in vivos(db, Concepto):
        s = subs.get(c.subtema_id)
        if s is None:
            problemas.append(f"concepto vivo «{c.nombre}» cuelga de un subtema retirado o inexistente")
        elif s.tema_id not in temas:
            problemas.append(f"subtema «{s.nombre}» cuelga de un tema retirado")
    con_conceptos = {c.subtema_id for c in vivos(db, Concepto)}
    problemas += [f"subtema vivo vacío: «{s.nombre}»" for s in subs.values() if s.id not in con_conceptos]
    con_subtemas = {s.tema_id for s in subs.values()}
    problemas += [f"tema vivo vacío: «{t.nombre}»" for t in temas.values() if t.id not in con_subtemas]
    assert not problemas, "\n".join(problemas)
    assert len(temas) == 5 and len(subs) == 21 and len(vivos(db, Concepto)) == 78


def test_un_concepto_que_solo_se_mueve_conserva_id_y_dominio(db):
    antes = {c.id: ruta(db, c.id) for c in vivos(db, Concepto)}
    dom_antes = volcado(db)["dominios"]
    snaps_antes = volcado(db)["snapshots"]
    migrar(db)
    solo_mueven = {nombre for _, _, nombre in
                   [(t["nombre"], s["nombre"], c["nombre"]) for t in ESTRUCTURA["temas"] for s in t["subtemas"]
                    for c in s["conceptos"] if len(c["de"]) == 1 and "claves" not in c]}
    malos = []
    for cid, vieja in antes.items():
        nombre = vieja.rsplit(" > ", 1)[1]
        if nombre not in solo_mueven or nombre == "Adjectius invariables i variables":
            continue
        c = db.get(Concepto, cid)
        if c is None or c.deleted_at is not None:
            malos.append(f"«{vieja}» se retiró en vez de moverse (su id {cid} ya no está vivo)")
            continue
        d0 = next((d for d in dom_antes if d[0] == cid), None)
        d1 = db.scalar(select(Dominio).where(Dominio.concepto_id == cid))
        if d0 and (d1 is None or tuple(getattr(d1, k) for k in ("concepto_id", "theta", "sigma", "n_intentos", "racha", "tendencia",
                                                               "fsrs_state", "proximo_repaso")) != d0):
            malos.append(f"«{vieja}» → «{ruta(db, cid)}»: el dominio cambió (esperado {d0[1:4]}, obtenido "
                         f"{(d1.theta, d1.sigma, d1.n_intentos) if d1 else None})")
    snaps = volcado(db)["snapshots"]
    assert snaps_antes == [s for s in snaps if (s[0], s[1]) in {(x[0], x[1]) for x in snaps_antes}] or not malos
    assert not malos, "\n".join(malos)


def test_una_fusion_deja_un_concepto_con_el_dominio_de_los_intentos_unidos(db):
    fusiones = [(s["nombre"], c) for t in ESTRUCTURA["temas"] for s in t["subtemas"] for c in s["conceptos"]
                if len(c["de"]) > 1 and "claves" not in c]
    assert {c["nombre"] for _, c in fusiones} >= {"Adjectius invariables i variables", "Contraccions"}
    antes_ids = {}
    for sub, c in fusiones:
        ids = [x.id for x in vivos(db, Concepto) if any(ruta(db, x.id) == " > ".join(r) for r in c["de"])]
        antes_ids[c["nombre"]] = (ids, sum(db.scalar(select(func.count()).select_from(Intento).where(Intento.concepto_id == i)) for i in ids))
    migrar(db)
    for nombre, (ids, n_intentos) in antes_ids.items():
        v = [c for c in vivos(db, Concepto) if c.nombre == nombre]
        assert len(v) == 1, f"fusión «{nombre}»: quedan {len(v)} conceptos vivos con ese nombre (esperado 1; antes {len(ids)}: " \
                            f"{[ruta(db, i) for i in ids]})"
        n_ahora = db.scalar(select(func.count()).select_from(Intento).where(Intento.concepto_id == v[0].id))
        assert n_ahora == n_intentos, f"fusión «{nombre}»: intentos esperados {n_intentos}, obtenidos {n_ahora}"
        theta, sigma, n, racha, tend = mastery.reconstruir(db, v[0].id)
        dom = db.scalar(select(Dominio).where(Dominio.concepto_id == v[0].id))
        assert (dom.n_intentos, round(dom.theta, 9), round(dom.sigma, 9), dom.racha) == (n, round(theta, 9), round(sigma, 9), racha), \
            f"fusión «{nombre}»: dominio guardado {dom.theta, dom.sigma, dom.n_intentos} ≠ reconstruido de los intentos unidos {theta, sigma, n}"
        if n:
            assert dom.fsrs_state and dom.proximo_repaso, f"fusión «{nombre}»: tiene {n} intentos y se perdió el estado FSRS o el próximo repaso"
        for i in ids:  # los que se retiran no se quedan con dominio, intentos ni preguntas
            if i != v[0].id:
                assert db.get(Concepto, i).deleted_at is not None
                assert not db.scalar(select(func.count()).select_from(Intento).where(Intento.concepto_id == i))
                assert not db.scalar(select(func.count()).select_from(Pregunta).where(Pregunta.concepto_id == i))
                d = db.scalar(select(Dominio).where(Dominio.concepto_id == i))
                assert d is None or (d.n_intentos == 0 and d.fsrs_state is None), f"el concepto retirado {i} conserva dominio"


def test_una_particion_reparte_cada_intento_por_la_clave_de_su_pregunta(db):
    pieza_de = {k: c["nombre"] for t in ESTRUCTURA["temas"] for s in t["subtemas"] for c in s["conceptos"] if "claves" in c
                for k in c["claves"]}
    por_clave_antes = {}
    for clave, intento_id in db.execute(select(Pregunta.clave, Intento.id).join(Intento, Intento.pregunta_id == Pregunta.id)
                                         .where(Pregunta.clave.in_(pieza_de))):
        por_clave_antes[intento_id] = clave
    total_antes = len(por_clave_antes)
    assert total_antes > 5, "la base de prueba debería tener intentos de verbos"
    migrar(db)
    nombre_de = {c.id: c.nombre for c in vivos(db, Concepto)}
    malos = []
    for intento_id, clave in por_clave_antes.items():
        i = db.get(Intento, intento_id)
        if nombre_de.get(i.concepto_id) != pieza_de[clave]:
            malos.append(f"intento de {clave}: esperado «{pieza_de[clave]}», obtenido «{nombre_de.get(i.concepto_id)}»")
    assert not malos, "\n".join(malos[:6])
    assert db.scalar(select(func.count()).select_from(Intento).where(Intento.id.in_(por_clave_antes))) == total_antes
    for p in db.scalars(select(Pregunta).where(Pregunta.clave.in_(pieza_de))):  # también las versiones antiguas
        assert nombre_de.get(p.concepto_id) == pieza_de[p.clave], f"pregunta {p.clave} v{p.version} quedó en otro concepto"
    for nombre in set(pieza_de.values()):
        cid = next(i for i, n in nombre_de.items() if n == nombre)
        theta, sigma, n, *_ = mastery.reconstruir(db, cid)
        dom = db.scalar(select(Dominio).where(Dominio.concepto_id == cid))
        n_real = db.scalar(select(func.count()).select_from(Intento).where(Intento.concepto_id == cid))
        assert dom is not None and dom.n_intentos == n == n_real, f"«{nombre}»: n_intentos guardado {dom and dom.n_intentos}, intentos {n_real}"
        assert abs(dom.theta - theta) < 1e-9, f"«{nombre}»: dominio no reconstruido de sus intentos"
        if n_real:
            assert dom.fsrs_state and dom.proximo_repaso, f"«{nombre}»: se perdió el FSRS"
    viejo = next(c for c in db.scalars(select(Concepto)) if c.nombre == "Gerundi i participi dels verbs irregulars")
    assert viejo.deleted_at is not None
    d = db.scalar(select(Dominio).where(Dominio.concepto_id == viejo.id))
    assert d is None or (d.n_intentos == 0 and d.fsrs_state is None), "el concepto partido conserva dominio y se contaría dos veces"


def test_ningun_snapshot_cuelga_de_un_concepto_retirado(db):
    migrar(db)
    muertos = {c.id for c in db.scalars(select(Concepto).where(Concepto.deleted_at.is_not(None)))}
    colgando = [s.concepto_id for s in db.scalars(select(DominioSnapshot)) if s.concepto_id in muertos]
    assert not colgando, f"{len(colgando)} snapshots de dominio cuelgan de conceptos retirados (inflarían la evolución del Historial)"


def test_el_orden_de_temas_y_subtemas_es_el_del_mapa(db):
    migrar(db)
    temas = sorted(vivos(db, Tema), key=lambda t: (t.orden, t.nombre))
    assert [t.nombre for t in temas] == [t["nombre"] for t in ESTRUCTURA["temas"]]
    assert [t.orden for t in temas] == list(range(len(temas))), f"orden de temas no explícito: {[t.orden for t in temas]}"
    for t, esperado in zip(temas, ESTRUCTURA["temas"]):
        subs = sorted((s for s in vivos(db, Subtema) if s.tema_id == t.id), key=lambda s: (s.orden, s.nombre))
        assert [s.nombre for s in subs] == [s["nombre"] for s in esperado["subtemas"]], f"orden de subtemas de «{t.nombre}»"
        assert [s.orden for s in subs] == list(range(len(subs)))


def test_ejecutarla_dos_veces_no_cambia_nada(db):
    primera = migrar(db)
    assert primera.hubo_cambios
    despues = volcado(db)
    segunda = migrar(db)
    assert not segunda.hubo_cambios, f"la segunda pasada aún cambió cosas: {segunda}"
    nuevo = volcado(db)
    difiere = [k for k in despues if despues[k] != nuevo[k]]
    assert not difiere, f"la segunda pasada modificó: {difiere}"


def test_dry_run_no_deja_rastro_pero_informa(db):
    antes = volcado(db)
    informe = reorganizar(db, ESTRUCTURA)
    assert informe.fusionados and informe.partidos and informe.intentos_reasignados > 0
    db.rollback()
    assert volcado(db) == antes


def test_no_falta_ningun_concepto_antiguo_en_la_base_de_prueba(db):
    assert not reorganizar(db, ESTRUCTURA).faltan


def test_importar_los_bancos_nuevos_tras_migrar_no_crea_conceptos_y_solo_versiona_lo_movido(db):
    cambia = {k for k, r in ANTES.items() if r != banco_nuevo(k)}
    migrar(db)
    conceptos_antes = db.scalar(select(func.count()).select_from(Concepto))
    auditoria_antes = auditar(db)
    creadas = actualizadas = 0
    for b in BANCOS:
        r = import_bank(db, load_bank(RAIZ / f"banks/catala/{b}.json"))
        creadas += r.created
        actualizadas += r.updated
    nuevos = db.scalar(select(func.count()).select_from(Concepto)) - conceptos_antes
    assert nuevos == 0, f"el importador creó {nuevos} conceptos nuevos: los conceptos no estaban ya en su sitio"
    assert creadas == 0, f"el importador creó {creadas} preguntas nuevas (no debía añadir ninguna)"
    assert actualizadas == len(cambia), f"versiones nuevas: esperado {len(cambia)} (preguntas con ruta distinta), obtenido {actualizadas}"
    versionadas = {p.clave for p in db.scalars(select(Pregunta).where(Pregunta.version > 1))}
    assert versionadas == cambia, f"claves versionadas sin haberse movido: {sorted(versionadas - cambia)[:4]}"
    despues = auditar(db)
    assert auditoria_antes["ok"], f"la base de prueba ya llegaba incoherente: { {k: v for k, v in auditoria_antes.items() if v and k != 'intentos'} }"
    assert despues["ok"], f"la auditoría quedó incoherente tras importar: { {k: v for k, v in despues.items() if v and k != 'intentos'} }"
    assert despues["dominio_incoherente"] == [] and despues["huerfanos"] == []
    for q in db.scalars(select(Pregunta).where(Pregunta.es_actual.is_(True))):  # cada pregunta vigente apunta a un concepto vivo
        assert db.get(Concepto, q.concepto_id).deleted_at is None, f"{q.clave} apunta a un concepto retirado"
    muertos = [c.nombre for c in db.scalars(select(Concepto).where(Concepto.deleted_at.is_not(None)))]
    assert sorted(muertos) == sorted(set(muertos)) and len(muertos) <= 3


def test_si_los_bancos_nuevos_se_importaron_antes_el_progreso_se_recupera(db):
    """Orden equivocado (importar y luego migrar): el importador retira los conceptos viejos con sus intentos."""
    total_antes = db.scalar(select(func.count()).select_from(Intento))
    por_clave = dict(db.execute(select(Pregunta.id, Pregunta.clave).join(Intento, Intento.pregunta_id == Pregunta.id)).all())
    for b in BANCOS:
        import_bank(db, load_bank(RAIZ / f"banks/catala/{b}.json"))
    informe = migrar(db)
    assert not informe.huerfanos, informe.huerfanos
    perdidos = []
    for c in vivos(db, Concepto):
        n = _n_intentos(db, c.id)
        dom = db.scalar(select(Dominio).where(Dominio.concepto_id == c.id))
        if n and (dom is None or dom.n_intentos != n):
            perdidos.append(f"«{ruta(db, c.id)}»: {n} intentos y dominio {dom and dom.n_intentos}")
    assert not perdidos, " | ".join(perdidos)
    total = db.scalar(select(func.count()).select_from(Intento).join(Concepto, Concepto.id == Intento.concepto_id)
                      .where(Concepto.deleted_at.is_(None)))
    assert total == total_antes, f"intentos en conceptos vivos: esperado {total_antes}, obtenido {total}"
    assert len(vivos(db, Concepto)) == 78


def _n_intentos(session, cid):
    return session.scalar(select(func.count()).select_from(Intento).where(Intento.concepto_id == cid))


def banco_nuevo(clave: str) -> list[str]:
    cache = banco_nuevo.__dict__.setdefault("cache", {})
    if not cache:
        for b in BANCOS:
            for q in json.loads((RAIZ / f"banks/catala/{b}.json").read_text(encoding="utf-8"))["preguntas"]:
                cache[q["id"]] = [q["tema"], q["subtema"], q["concepto"]]
    return cache[clave]
