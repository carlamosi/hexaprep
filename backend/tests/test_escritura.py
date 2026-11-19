"""Corrección de respuestas escritas: acentos exigidos, formas válidas múltiples y errores típicos con su regla."""
import pytest

from hexaprep.escritura import corregir, corregir_campo, normalizar

PARTICIPI = {"etiqueta": "Participi", "validas": ["complert", "complit"], "errores": {"complet": "Ojo: «complet» es el adjetivo."}}
ESTAT = {"etiqueta": "Participi", "validas": ["estat"], "errores": {"sigut": "«Sigut» es incorrecto: el participi de ésser es «estat»."}}
VENIR = {"etiqueta": "Gerundi", "validas": ["venint"]}


@pytest.mark.parametrize("escrito", ["Complert", "  complit ", "COMPLERT"])
def test_acepta_cualquier_forma_valida_sin_mayusculas_ni_espacios(escrito):
    assert corregir_campo(escrito, PARTICIPI)["correcto"] is True


def test_normaliza_apostrofe_y_ele_geminada():
    assert normalizar("l’home") == "l'home"
    assert normalizar("col.legi") == normalizar("col·legi") == "col·legi"
    assert normalizar("  Dos   espais ") == "dos espais"


def test_el_acento_es_obligatorio_y_se_avisa():
    r = corregir_campo("pomes", {"etiqueta": "x", "validas": ["pomés"]})
    assert r["correcto"] is False and "acento" in r["nota"].lower()
    assert corregir_campo("apareixent", {"etiqueta": "x", "validas": ["apareixent"]})["correcto"] is True


def test_error_tipico_devuelve_su_regla():
    r = corregir_campo("sigut", ESTAT)
    assert r["correcto"] is False and "estat" in r["nota"]


def test_fallo_sin_pista_lista_las_formas_validas():
    r = corregir_campo("vingut", VENIR)
    assert r == {"correcto": False, "esperado": ["venint"], "nota": None, "etiqueta": "Gerundi", "tipo_error": "letra_cambiada"}


def test_corregir_exige_todos_los_campos_y_el_mismo_numero_de_respuestas():
    campos = [VENIR, ESTAT]
    ok, detalle = corregir(campos, ["venint", "estat"])
    assert ok and [d["correcto"] for d in detalle] == [True, True]
    ok, detalle = corregir(campos, ["venint", "sigut"])
    assert not ok and [d["correcto"] for d in detalle] == [True, False]
    with pytest.raises(ValueError):
        corregir(campos, ["venint"])
    ok, _ = corregir(campos, ["", ""])
    assert not ok


def test_en_troba_l_error_vale_un_fragmento_algo_mas_largo_pero_no_uno_distinto():
    error = {"etiqueta": "Error", "validas": ["tinc que"]}
    for ok in ("tinc que", "Tinc que anar", "el tinc que"):
        assert corregir_campo(ok, error)["correcto"] is True
    for mal in ("tinc", "que", "tinc que anar a classe ara mateix", "tincque"):
        assert corregir_campo(mal, error)["correcto"] is False
    assert corregir_campo("tinc que anar", {"etiqueta": "Paraula", "validas": ["tinc que"]})["correcto"] is False  # solo en «Error»


@pytest.mark.parametrize("escrito,esperado", [("l'", True), ("L'", True), ("l'handbol", True), ("el", False), ("la", False)])
def test_en_un_hueco_con_articulo_vale_solo_el_articulo(escrito, esperado):
    campo = {"etiqueta": "Article i nom", "validas": ["l'handbol"], "errores": {}}
    ok, _ = corregir([campo], [escrito], "Escriu amb l'article masculí: «____ handbol».")
    assert ok is esperado, f"escrito {escrito!r}: esperado {esperado}, obtenido {ok}"


def test_el_articulo_solo_no_vale_fuera_de_un_hueco_de_articulo():
    campo = {"etiqueta": "Article i nom", "validas": ["l'handbol"], "errores": {}}
    assert corregir([campo], ["l'"], "Escriu amb l'article.")[0] is False
    contraccion = {"etiqueta": "a", "validas": ["de l'"], "errores": {}}
    assert corregir([contraccion], ["de"], "Parlarem «____ hotel»")[0] is False


from hexaprep.escritura import clasificar_error  # noqa: E402


@pytest.mark.parametrize("escrito,valida,esperado", [
    ("café", "cafè", "apertura"), ("cafè", "cafè", None), ("próleg", "pròleg", "apertura"),
    ("má", "mà", "acento_distinto"), ("ma", "mà", "acento_omitido"),
    ("vaca", "baca", "letra_cambiada"), ("pomo", "poma", "letra_cambiada"), ("pom", "pomes", "longitud"),
    ("pomesss", "pomes", "longitud"),
])
def test_clasifica_el_error_de_escritura(escrito, valida, esperado):
    assert clasificar_error(escrito, [valida]) == esperado, f"{escrito!r} frente a {valida!r}"


def test_clasifica_contra_la_forma_valida_mas_cercana():
    assert clasificar_error("complet", ["complert", "complit"]) == "longitud"
    assert clasificar_error("cafè", ["cafe", "cafè"]) is None


def test_un_fallo_de_apertura_lleva_la_pista_de_apertura_en_la_nota():
    campo = {"etiqueta": "Paraula", "validas": ["cafè"], "errores": {}}
    r = corregir_campo("café", campo)
    assert r["correcto"] is False and r["tipo_error"] == "apertura"
    assert "è" in r["nota"] and "abierta" in r["nota"], f"nota obtenida: {r['nota']}"
    assert corregir_campo("cafe", campo)["nota"].startswith("Casi")
    # un error típico del banco manda sobre la pista genérica
    tipico = {"etiqueta": "P", "validas": ["cafè"], "errores": {"café": "regla del banco"}}
    assert corregir_campo("café", tipico)["nota"] == "regla del banco"
