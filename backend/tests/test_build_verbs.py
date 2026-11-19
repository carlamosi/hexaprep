"""Generador del banco de verbos (tools/build_verbs.py): lee la tabla infinitiu·gerundi·participi de los apuntes."""
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import build_verbs  # noqa: E402

from hexaprep.bank import BankFile  # noqa: E402

TEXTO = """Infinitiu Gerundi Participi Infinitiu Gerundi Participi
absoldre absolent absolt imprimir imprimint imprès
L'davantvocalohmuda,enmasculíifemení:l'amic,l'hora,
cloure cloent clos pertanyut,
cobrir cobrint cobert pertànyer pertanyent pertangut
plànyer planyent planyut, plangut
dir dient dit
"""


def test_parsea_filas_dobles_formas_multiples_y_la_forma_partida_en_dos_lineas():
    v = {inf: (ger, part) for inf, ger, part in build_verbs.parsear(TEXTO)}
    assert v["absoldre"] == ("absolent", ["absolt"]) and v["imprimir"] == ("imprimint", ["imprès"])
    assert v["pertànyer"] == ("pertanyent", ["pertanyut", "pertangut"])
    assert v["plànyer"] == ("planyent", ["planyut", "plangut"])
    assert v["dir"] == ("dient", ["dit"]) and v["cloure"] == ("cloent", ["clos"])
    assert len(v) == 7  # la línea de ruido no cuenta


def test_la_forma_regular_equivocada_es_un_error_tipico_con_su_regla():
    p = next(q for q in build_verbs.construir([("admetre", "admetent", ["admès"])]) if q["campos"][1]["etiqueta"] == "Participi")
    assert "admetut" in p["campos"][1]["errores"] and "admès" in p["campos"][1]["errores"]["admetut"]


def test_esser_avisa_de_sigut():
    q = build_verbs.construir([("ésser", "essent", ["estat"])])[0]
    assert list(q["campos"][1]["errores"]) == ["sigut"] and q["campos"][0]["errores"] == {}


def test_ningun_error_tipico_coincide_con_una_forma_valida():
    from hexaprep.escritura import normalizar
    for q in build_verbs.construir([("ésser", "essent", ["estat"]), ("dir", "dient", ["dit"]), ("conèixer", "coneixent", ["conegut"])]):
        for c in q["campos"]:
            assert not {normalizar(k) for k in c["errores"]} & {normalizar(v) for v in c["validas"]}


def test_el_banco_generado_valida_y_los_ids_son_estables():
    verbos = [("dir", "dient", ["dit"]), ("complir", "complint", ["complert", "complit"])]
    banco = build_verbs.banco(verbos, {"nombre": "Català", "idioma": "ca", "color": "#D9822B", "acento": "#D9822B"})
    BankFile.model_validate(banco)
    assert [q["id"] for q in banco["preguntas"]] == ["cat-v1-0001", "cat-v1-0002"]


@pytest.mark.lento
def test_la_tabla_real_de_los_apuntes():
    pdf = ROOT / "banks" / "catala" / "fuentes" / "Catala_Apunts_Gramatica.pdf"
    if not pdf.exists():
        pytest.skip("los PDF no están en git")
    verbos = {inf: part for inf, _, part in build_verbs.leer_pdf(pdf)}
    assert len(verbos) == 75 and verbos["dir"] == ["dit"] and "complit" in verbos["complir"]
