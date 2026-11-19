"""Corrección de respuestas escritas (tipo «escrita»). Un campo = {etiqueta, validas, errores}."""
import json
import re
import unicodedata
from pathlib import Path
from difflib import SequenceMatcher

_ELE_GEMINADA = re.compile(r"(?<=l)[.•∙‧·](?=l)")


def normalizar(texto: str) -> str:
    """Minúsculas, un solo espacio, apóstrofo recto y l·l unificados. Los acentos se conservan."""
    t = " ".join(texto.replace("’", "'").replace("‘", "'").split()).casefold()
    return _ELE_GEMINADA.sub("·", t)


def _sin_acentos(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def _contiene(n: str, valida: str) -> bool:
    """«Troba l'error»: vale marcar el fragmento con hasta dos palabras más alrededor (palabras enteras)."""
    return len(n.split()) <= len(valida.split()) + 2 and re.search(rf"(?<!\w){re.escape(valida)}(?!\w)", n) is not None


_APERTURA = {("é", "è"), ("è", "é"), ("ó", "ò"), ("ò", "ó")}
PISTA_APERTURA = {"e": "è es abierta (acento grave) y é es cerrada (acento agudo): fíjate en cómo suena la e.",
                  "o": "ò es abierta (acento grave) y ó es cerrada (acento agudo): fíjate en cómo suena la o."}


def clasificar_error(escrito: str, validas: list[str]) -> str | None:
    """Tipo de error de lo escrito frente a la forma válida más parecida: apertura (é/è, ó/ò), acento_omitido,
    acento_distinto, letra_cambiada (misma longitud: b/v, a/e...), longitud u otro. None si es correcto."""
    n = normalizar(escrito)
    vs = [normalizar(v) for v in validas]
    if not n or n in vs:
        return None
    v = max(vs, key=lambda x: SequenceMatcher(None, n, x).ratio())
    if len(n) != len(v):
        return "longitud"
    difs = [(a, b) for a, b in zip(n, v) if a != b]
    if all(d in _APERTURA for d in difs):
        return "apertura"
    if _sin_acentos(n) == _sin_acentos(v):
        return "acento_omitido" if sum(c != _sin_acentos(c) for c in n) < sum(c != _sin_acentos(c) for c in v) else "acento_distinto"
    return "letra_cambiada"


_ARTICULO = re.compile(r"^(l'|(?:el|la|els|les) )")


def _solo_articulo(validas: list[str], enunciado: str) -> list[str]:
    """En un hueco «____ nom» donde la respuesta empieza por artículo, el artículo solo también vale (el banco pide la frase)."""
    if not re.search(r"____ \w", enunciado):
        return []
    return [m.group(1).strip() if m.group(1) != "l'" else "l'" for v in validas if (m := _ARTICULO.match(v))]


def pista_apertura(escrito: str, validas: list[str]) -> str:
    """Regla de una línea tras fallar la apertura de e/o: la de `reglas_apertura.json` (revisada) si aplica, si no la genérica."""
    v = max(validas, key=lambda x: SequenceMatcher(None, escrito, x).ratio())
    vocal = next((("e" if b in "èé" else "o") for a, b in zip(escrito, v) if a != b), "e")
    for r in _reglas_apertura():
        if r["vocal"] == vocal and re.search(r["patron"], v):
            return r["regla"]
    return PISTA_APERTURA[vocal]


def _reglas_apertura() -> list[dict]:
    global _REGLAS
    if _REGLAS is None:
        f = Path(__file__).with_name("reglas_apertura.json")  # dentro de backend/: viaja con el despliegue
        try:
            _REGLAS = json.loads(f.read_text(encoding="utf-8"))["reglas"]
        except (OSError, ValueError, KeyError):
            _REGLAS = []
    return _REGLAS


_REGLAS: list[dict] | None = None


def corregir_campo(escrito: str, campo: dict, enunciado: str = "") -> dict:
    n = normalizar(escrito)
    validas = [normalizar(v) for v in campo["validas"]]
    validas_ok = validas + _solo_articulo(validas, enunciado)
    es_error = campo.get("etiqueta") == "Error"
    acierta = bool(n) and (n in validas_ok or es_error and any(_contiene(n, v) for v in validas))
    resultado = {"etiqueta": campo.get("etiqueta", ""), "correcto": acierta,
                 "esperado": campo["validas"], "nota": None}
    if resultado["correcto"] or not n:
        return resultado
    errores = {normalizar(k): v for k, v in campo.get("errores", {}).items()}
    resultado["tipo_error"] = clasificar_error(escrito, validas_ok)
    if n in errores:
        resultado["nota"] = errores[n]
    elif resultado["tipo_error"] == "apertura":
        resultado["nota"] = pista_apertura(n, validas)
    elif _sin_acentos(n) in [_sin_acentos(v) for v in validas]:
        resultado["nota"] = "Casi: revisa los acentos, en catalán cambian la palabra."
    return resultado


def corregir(campos: list[dict], escritos: list[str], enunciado: str = "") -> tuple[bool, list[dict]]:
    """Acierta solo si todos los campos son correctos."""
    if len(escritos) != len(campos):
        raise ValueError(f"se esperaban {len(campos)} respuestas y llegaron {len(escritos)}")
    detalle = [corregir_campo(e, c, enunciado) for e, c in zip(escritos, campos)]
    return all(d["correcto"] for d in detalle), detalle
