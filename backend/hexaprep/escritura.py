"""Corrección de respuestas escritas (tipo «escrita»). Un campo = {etiqueta, validas, errores}."""
import re
import unicodedata

_ELE_GEMINADA = re.compile(r"(?<=l)[.•∙‧·](?=l)")


def normalizar(texto: str) -> str:
    """Minúsculas, un solo espacio, apóstrofo recto y l·l unificados. Los acentos se conservan."""
    t = " ".join(texto.replace("’", "'").replace("‘", "'").split()).casefold()
    return _ELE_GEMINADA.sub("·", t)


def _sin_acentos(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def corregir_campo(escrito: str, campo: dict) -> dict:
    n = normalizar(escrito)
    validas = [normalizar(v) for v in campo["validas"]]
    resultado = {"etiqueta": campo.get("etiqueta", ""), "correcto": bool(n) and n in validas,
                 "esperado": campo["validas"], "nota": None}
    if resultado["correcto"] or not n:
        return resultado
    errores = {normalizar(k): v for k, v in campo.get("errores", {}).items()}
    if n in errores:
        resultado["nota"] = errores[n]
    elif _sin_acentos(n) in [_sin_acentos(v) for v in validas]:
        resultado["nota"] = "Casi: revisa los acentos, en catalán cambian la palabra."
    return resultado


def corregir(campos: list[dict], escritos: list[str]) -> tuple[bool, list[dict]]:
    """Acierta solo si todos los campos son correctos."""
    if len(escritos) != len(campos):
        raise ValueError(f"se esperaban {len(campos)} respuestas y llegaron {len(escritos)}")
    detalle = [corregir_campo(e, c) for e, c in zip(escritos, campos)]
    return all(d["correcto"] for d in detalle), detalle
