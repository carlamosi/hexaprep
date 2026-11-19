"""Tiempo que cabe esperar de una pregunta: lectura del texto y escritura de la respuesta (sin capturar nada más)."""
import json
import re

PALABRAS_POR_S = 3.3   # lectura atenta, ~200 palabras por minuto
CARACTERES_POR_S = 2.5  # escritura de palabras con acentos, ~150 caracteres por minuto
S_CLIC = 1.5            # elegir una opción
S_NUMERO = 4.0          # teclear un número
MINIMO_S = 3.0


def _palabras(*textos: str | None) -> int:
    return sum(len(re.findall(r"\w+", t or "")) for t in textos)


def carga_esperada(tipo: str, enunciado: str, contexto: str | None, textos_opciones: list[str]) -> float:
    """Segundos esperados para leer y responder. Para una escrita, `textos_opciones` lleva el JSON de sus campos."""
    if tipo == "escrita":
        try:
            escribir = sum(len(c["validas"][0]) for c in json.loads(textos_opciones[0])) / CARACTERES_POR_S
        except (IndexError, KeyError, TypeError, ValueError):
            escribir = 0.0
        leer = _palabras(enunciado, contexto)
    elif tipo == "problema":
        escribir, leer = S_NUMERO, _palabras(enunciado, contexto)
    else:
        escribir, leer = S_CLIC, _palabras(enunciado, contexto, *textos_opciones)
    return max(MINIMO_S, leer / PALABRAS_POR_S + escribir)
