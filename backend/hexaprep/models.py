from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from .db import device_id
from .ids import new_id


def utcnow() -> datetime:
    """UTC ingenuo: SQLite no guarda zona horaria."""
    return datetime.now(UTC).replace(tzinfo=None)


class Base(DeclarativeBase):
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    device_id: Mapped[str] = mapped_column(String(100), default=device_id)


def fk(table: str, nullable: bool = False):
    return mapped_column(String(36), ForeignKey(f"{table}.id"), nullable=nullable, index=True)


class Asignatura(Base):
    __tablename__ = "asignatura"
    nombre: Mapped[str] = mapped_column(String(200))
    idioma: Mapped[str] = mapped_column(String(10))
    color: Mapped[str] = mapped_column(String(9))
    acento: Mapped[str] = mapped_column(String(9))
    tipos_pregunta: Mapped[list] = mapped_column(JSON, default=lambda: ["test"])


class Bloque(Base):
    __tablename__ = "bloque"
    asignatura_id: Mapped[str] = fk("asignatura")
    nombre: Mapped[str] = mapped_column(String(200))
    color: Mapped[str | None] = mapped_column(String(9))
    orden: Mapped[int] = mapped_column(Integer, default=0)


class Tema(Base):
    __tablename__ = "tema"
    bloque_id: Mapped[str] = fk("bloque")
    nombre: Mapped[str] = mapped_column(String(200))
    orden: Mapped[int] = mapped_column(Integer, default=0)


class Subtema(Base):
    __tablename__ = "subtema"
    tema_id: Mapped[str] = fk("tema")
    nombre: Mapped[str] = mapped_column(String(200))
    orden: Mapped[int] = mapped_column(Integer, default=0)


class Concepto(Base):
    __tablename__ = "concepto"
    subtema_id: Mapped[str] = fk("subtema")
    nombre: Mapped[str] = mapped_column(String(200))
    etiquetas: Mapped[list] = mapped_column(JSON, default=list)


class Fuente(Base):
    __tablename__ = "fuente"
    asignatura_id: Mapped[str] = fk("asignatura")
    nombre: Mapped[str] = mapped_column(String(200))
    archivo: Mapped[str | None] = mapped_column(String(500))
    hash_pdf: Mapped[str | None] = mapped_column(String(64))


class Lote(Base):
    __tablename__ = "lote"
    fecha: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    modelo: Mapped[str | None] = mapped_column(String(100))
    version_prompt: Mapped[str | None] = mapped_column(String(50))
    hash_material: Mapped[str | None] = mapped_column(String(64))


class Pregunta(Base):
    """Una fila por (clave, version). La versión vigente tiene es_actual=True."""
    __tablename__ = "pregunta"
    __table_args__ = (UniqueConstraint("clave", "version"),)
    clave: Mapped[str] = mapped_column(String(100), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    es_actual: Mapped[bool] = mapped_column(Boolean, default=True)
    concepto_id: Mapped[str] = fk("concepto")
    fuente_id: Mapped[str | None] = fk("fuente", nullable=True)
    lote_id: Mapped[str | None] = fk("lote", nullable=True)
    tipo: Mapped[str] = mapped_column(String(20), default="test")
    enunciado: Mapped[str] = mapped_column(Text)
    ayuda_larga: Mapped[str | None] = mapped_column(Text)
    imagen: Mapped[str | None] = mapped_column(String(500))
    dificultad_base: Mapped[int] = mapped_column(Integer)
    dificultad_estimada: Mapped[float | None] = mapped_column(Float)
    origen: Mapped[str] = mapped_column(String(20), default="generada")
    estado_verificacion: Mapped[str] = mapped_column(String(20), default="pendiente")
    activa: Mapped[bool] = mapped_column(Boolean, default=True)
    excluida: Mapped[bool] = mapped_column(Boolean, default=False)
    fuente_pagina: Mapped[int | None] = mapped_column(Integer)
    fuente_cara: Mapped[int | None] = mapped_column(Integer)
    content_hash: Mapped[str | None] = mapped_column(String(64))


class Opcion(Base):
    __tablename__ = "opcion"
    pregunta_id: Mapped[str] = fk("pregunta")
    posicion: Mapped[str] = mapped_column(String(1))  # 'a'..'d'
    texto: Mapped[str] = mapped_column(Text)
    correcta: Mapped[bool] = mapped_column(Boolean, default=False)
    tipo_trampa: Mapped[str | None] = mapped_column(String(200))
    explicacion_trampa: Mapped[str | None] = mapped_column(Text)


class Explicacion(Base):
    __tablename__ = "explicacion"
    pregunta_id: Mapped[str] = fk("pregunta")
    texto: Mapped[str] = mapped_column(Text)


class Sesion(Base):
    __tablename__ = "sesion"
    modo: Mapped[str] = mapped_column(String(20))
    filtro: Mapped[dict] = mapped_column(JSON, default=dict)
    inicio: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    fin: Mapped[datetime | None] = mapped_column(DateTime)
    version_app: Mapped[str | None] = mapped_column(String(20))
    version_banco: Mapped[str | None] = mapped_column(String(64))
    zona_horaria: Mapped[str | None] = mapped_column(String(50))


class Evento(Base):
    """Inmutable: triggers de la migración impiden UPDATE y DELETE."""
    __tablename__ = "evento"
    sesion_id: Mapped[str] = fk("sesion")
    tipo: Mapped[str] = mapped_column(String(40))
    pregunta_id: Mapped[str | None] = fk("pregunta", nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    t_cliente: Mapped[datetime] = mapped_column(DateTime)
    t_servidor: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Intento(Base):
    __tablename__ = "intento"
    evento_id: Mapped[str] = fk("evento")
    sesion_id: Mapped[str] = fk("sesion")
    pregunta_id: Mapped[str] = fk("pregunta")
    concepto_id: Mapped[str] = fk("concepto")
    opcion_inicial: Mapped[str] = mapped_column(String(1))
    opcion_final: Mapped[str] = mapped_column(String(1))
    n_cambios: Mapped[int] = mapped_column(Integer, default=0)
    orden_opciones: Mapped[list] = mapped_column(JSON)
    trampa_elegida: Mapped[str | None] = mapped_column(String(200))
    correcta: Mapped[bool] = mapped_column(Boolean)
    confianza: Mapped[str | None] = mapped_column(String(10))
    t_primer_clic: Mapped[float | None] = mapped_column(Float)
    t_envio: Mapped[float | None] = mapped_column(Float)
    t_explicacion: Mapped[float | None] = mapped_column(Float)
    hora_dia: Mapped[int] = mapped_column(Integer)
    dia_semana: Mapped[int] = mapped_column(Integer)
    posicion_sesion: Mapped[int] = mapped_column(Integer)
    n_intento_previo: Mapped[int] = mapped_column(Integer, default=0)
    intervalo_desde_anterior: Mapped[float | None] = mapped_column(Float)  # segundos
    dificultad: Mapped[int] = mapped_column(Integer)
    dominio_antes: Mapped[float | None] = mapped_column(Float)
    dominio_despues: Mapped[float | None] = mapped_column(Float)


class Dominio(Base):
    """Derivado, reconstruible. Una fila por concepto."""
    __tablename__ = "dominio"
    concepto_id: Mapped[str] = mapped_column(String(36), ForeignKey("concepto.id"), unique=True)
    theta: Mapped[float] = mapped_column(Float, default=0.0)
    sigma: Mapped[float] = mapped_column(Float, default=1.5)
    n_intentos: Mapped[int] = mapped_column(Integer, default=0)
    racha: Mapped[int] = mapped_column(Integer, default=0)
    tendencia: Mapped[float] = mapped_column(Float, default=0.0)
    fsrs_state: Mapped[dict | None] = mapped_column(JSON)
    proximo_repaso: Mapped[datetime | None] = mapped_column(DateTime)


class DominioSnapshot(Base):
    __tablename__ = "dominio_snapshot"
    __table_args__ = (UniqueConstraint("concepto_id", "fecha"),)
    concepto_id: Mapped[str] = fk("concepto")
    fecha: Mapped[str] = mapped_column(String(10))  # ISO yyyy-mm-dd
    theta: Mapped[float] = mapped_column(Float)
    sigma: Mapped[float] = mapped_column(Float)


class ReporteCalidad(Base):
    __tablename__ = "reporte_calidad"
    pregunta_id: Mapped[str] = fk("pregunta")
    motivo: Mapped[str] = mapped_column(Text)


class Ajuste(Base):
    __tablename__ = "ajuste"
    clave: Mapped[str] = mapped_column(String(100), unique=True)
    valor: Mapped[dict | list | str | int | float | None] = mapped_column(JSON)


class Importacion(Base):
    __tablename__ = "importacion"
    archivo: Mapped[str] = mapped_column(String(500))
    hash: Mapped[str] = mapped_column(String(64))
    creadas: Mapped[int] = mapped_column(Integer, default=0)
    actualizadas: Mapped[int] = mapped_column(Integer, default=0)
    sin_cambios: Mapped[int] = mapped_column(Integer, default=0)


class CopiaSeguridad(Base):
    __tablename__ = "copia_seguridad"
    ruta: Mapped[str] = mapped_column(String(500))
    verificada: Mapped[bool] = mapped_column(Boolean, default=False)
    n_eventos: Mapped[int] = mapped_column(Integer, default=0)
