import json
import re
from collections import Counter
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

DASHES = ("—", "–")
RUTA_IMAGEN = re.compile(r"[\w\-]+(/[\w\-]+)*\.(png|jpg|jpeg|webp|svg)")  # relativa, sin «..»
MAX_VALORES = 6  # valores que puede pedir un problema (y que acepta la respuesta)


def _find_dashes(node, path="") -> list[str]:
    if isinstance(node, str):
        return [path] if any(d in node for d in DASHES) else []
    if isinstance(node, dict):
        return [e for k, v in node.items() for e in _find_dashes(v, f"{path}.{k}" if path else k)]
    if isinstance(node, list):
        return [e for i, v in enumerate(node) for e in _find_dashes(v, f"{path}.{i}")]
    return []


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AsignaturaIn(Strict):
    nombre: str
    idioma: str
    color: str
    acento: str


class FuenteIn(Strict):
    nombre: str
    archivo: str | None = None
    hash_pdf: str | None = None


class LoteIn(Strict):
    modelo: str | None = None
    version_prompt: str | None = None
    hash_material: str | None = None


class OpcionIn(Strict):
    texto: str = Field(min_length=1)
    trampa: str | None = None


class PreguntaIn(Strict):
    id: str = Field(min_length=1)
    bloque: str = "General"
    tema: str
    subtema: str
    concepto: str
    dificultad: int = Field(ge=1, le=5)
    enunciado: str = Field(min_length=1)
    opciones: list[OpcionIn] = []
    correcta: Literal["a", "b", "c", "d"] | None = None
    tipo: Literal["test", "vf", "problema"] = "test"
    # solo problemas: el número (o la lista de números) que hay que escribir, sin unidades
    solucion: float | list[float] | None = None
    ordenada: bool = False  # lista: ¿importa el orden en que se escriben los valores?
    imagen: str | None = None  # ruta relativa a banks/<asignatura>/img/: la imagen forma parte del enunciado
    # problema con apartados: mismo grupo y contexto en todos; el apartado es la letra
    grupo: str | None = None
    contexto: str | None = None
    apartado: str | None = None
    explicacion: str
    ayuda_larga: str
    fuente_pagina: int = Field(ge=1)
    fuente_cara: int = Field(ge=1)

    @model_validator(mode="before")
    @classmethod
    def _no_dashes(cls, data):
        bad = _find_dashes(data)
        if bad:
            raise ValueError(f"guion largo en {', '.join(bad)}")
        return data

    @model_validator(mode="after")
    def _imagen_y_grupo(self):
        if self.imagen is not None and not RUTA_IMAGEN.fullmatch(self.imagen):
            raise ValueError(f"ruta de imagen no válida: {self.imagen!r}")
        if (self.grupo is None) != (self.contexto is None) or (self.grupo is None) != (self.apartado is None):
            raise ValueError("grupo, contexto y apartado van juntos")
        if self.grupo is not None and self.tipo != "problema":
            raise ValueError("solo un problema puede tener apartados")
        return self

    @model_validator(mode="after")
    def _traps(self):
        if self.tipo == "problema":
            if self.solucion is None or self.opciones or self.correcta is not None:
                raise ValueError("un problema lleva solucion y no lleva opciones ni correcta")
            if isinstance(self.solucion, list) and not 1 <= len(self.solucion) <= MAX_VALORES:
                raise ValueError(f"la solución lleva entre 1 y {MAX_VALORES} valores")
            return self
        n = 4 if self.tipo == "test" else 2
        if len(self.opciones) != n or self.solucion is not None:
            raise ValueError(f"una pregunta {self.tipo} lleva exactamente {n} opciones y no lleva solucion")
        if self.correcta is None or "abcd".index(self.correcta) >= n:
            raise ValueError("falta la opción correcta o no existe")
        for i, o in enumerate(self.opciones):
            es_correcta = "abcd"[i] == self.correcta
            if es_correcta and o.trampa:
                raise ValueError(f"la opción correcta '{self.correcta}' no lleva trampa")
            if not es_correcta and not o.trampa:
                raise ValueError(f"falta trampa en la opción incorrecta '{'abcd'[i]}'")
        return self


class BankFile(Strict):
    asignatura: AsignaturaIn
    fuente: FuenteIn | None = None
    lote: LoteIn | None = None
    preguntas: list[PreguntaIn]

    @model_validator(mode="after")
    def _unique_ids(self):
        dup = sorted(i for i, n in Counter(p.id for p in self.preguntas).items() if n > 1)
        if dup:
            raise ValueError(f"ids duplicados: {', '.join(dup)}")
        return self


def load_bank(path: Path) -> BankFile:
    return BankFile.model_validate_json(Path(path).read_text(encoding="utf-8"))


def validate_bank(path: Path) -> list[str]:
    try:
        load_bank(path)
    except ValidationError as e:
        return [f"{'.'.join(str(x) for x in err['loc'])}: {err['msg']}".replace("\n", " ") for err in e.errors()]
    except (OSError, json.JSONDecodeError) as e:
        return [f"{Path(path).name}: {e}".replace("\n", " ")]
    return []
