"""Perfiles online: cada persona tiene su propio esquema de Postgres (catálogo copiado + su progreso).

La app no cambia sus consultas: cada petición usa `engine.execution_options(schema_translate_map={None: esquema})`,
que no depende del estado de la sesión y por eso funciona con el pooler de Neon.
"""
import hashlib
import re

from sqlalchemy import Connection, Engine, text

# Tablas de catálogo: se copian a cada perfil. El resto (sesión, eventos, intentos, dominio...) empieza vacío.
CATALOGO = ("asignatura", "importacion", "lote", "bloque", "fuente", "tema", "subtema", "concepto", "pregunta",
            "explicacion", "opcion")
PLANTILLA = "plantilla"
_NOMBRE = re.compile(r"[a-z0-9_]{1,40}")


def esquema_de(email: str) -> str:
    return "u_" + hashlib.sha256(email.strip().lower().encode()).hexdigest()[:12]


def _q(nombre: str) -> str:
    if not _NOMBRE.fullmatch(nombre):
        raise ValueError(f"nombre de esquema no válido: {nombre!r}")
    return f'"{nombre}"'


def clonar_esquema(conn: Connection, origen: str, destino: str, datos: str = "catalogo") -> int:
    """Crea `destino` con las tablas de `origen` (sin claves ajenas) y copia datos: «todo», «catalogo» o «nada»."""
    if datos not in ("todo", "catalogo", "nada"):
        raise ValueError(datos)
    o, d = _q(origen), _q(destino)
    conn.execute(text(f"CREATE SCHEMA {d}"))
    tablas = [r[0] for r in conn.execute(text(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = :s AND table_type = 'BASE TABLE'"),
        {"s": origen})]
    copiadas = 0
    for t in tablas:
        conn.execute(text(f'CREATE TABLE {d}."{t}" (LIKE {o}."{t}" INCLUDING ALL)'))
        # alembic_version viaja siempre: cada esquema sabe en qué versión de las tablas está
        if t == "alembic_version" or datos == "todo" or (datos == "catalogo" and t in CATALOGO):
            copiadas += conn.execute(text(f'INSERT INTO {d}."{t}" SELECT * FROM {o}."{t}"')).rowcount
    if "evento" in tablas:  # el evento es de solo añadir: los triggers no viajan con LIKE
        for op in ("update", "delete"):
            conn.execute(text(f"CREATE TRIGGER evento_no_{op} BEFORE {op.upper()} ON {d}.evento "
                              "FOR EACH ROW EXECUTE FUNCTION public.evento_solo_anadir()"))
    return copiadas


def existe(conn: Connection, esquema: str) -> bool:
    return bool(conn.scalar(text("SELECT 1 FROM information_schema.schemata WHERE schema_name = :s"), {"s": esquema}))


def asegurar_perfil(engine: Engine, email: str) -> str:
    """Esquema del perfil de `email`; lo crea desde la plantilla si es la primera vez."""
    esquema = esquema_de(email)
    with engine.begin() as conn:
        conn.execute(text("SELECT pg_advisory_xact_lock(hashtext(:e))"), {"e": esquema})  # dos primeros accesos a la vez no chocan
        if not existe(conn, esquema):
            if not existe(conn, PLANTILLA):
                raise RuntimeError("falta la plantilla de perfiles: ejecuta tools/perfiles.py plantilla")
            clonar_esquema(conn, PLANTILLA, esquema, "todo")
    return esquema


def engine_de(engine: Engine, esquema: str) -> Engine:
    return engine.execution_options(schema_translate_map={None: esquema})
