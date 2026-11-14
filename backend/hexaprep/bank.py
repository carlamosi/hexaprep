import json
from collections import Counter
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

DASHES = ("—", "–")


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
    opciones: list[OpcionIn] = Field(min_length=4, max_length=4)
    correcta: Literal["a", "b", "c", "d"]
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
    def _traps(self):
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
