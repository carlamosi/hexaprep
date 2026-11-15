from sqlalchemy import select, update

from hexaprep.bank import BankFile, PreguntaIn
from hexaprep.importer import import_bank
from hexaprep.models import Subtema, Tema

BASE = dict(bloque="B", dificultad=2, explicacion="E.", ayuda_larga="A.", fuente_pagina=1, fuente_cara=1, tipo="problema", solucion=1.0)
ASIG = {"nombre": "Mates", "idioma": "es", "color": "#111111", "acento": "#111111"}


def banco(*subtemas, tema="T1"):
    return BankFile(asignatura=ASIG, preguntas=[
        PreguntaIn(**{**BASE, "id": f"q-{tema}-{i}", "tema": tema, "subtema": s, "concepto": "C", "enunciado": f"e{i}"})
        for i, s in enumerate(subtemas)])


def nombres(session, modelo, tema=None):
    q = select(modelo).order_by(modelo.orden, modelo.nombre)
    if tema:  # los subtemas se ordenan dentro de su tema
        q = q.join(Tema, Tema.id == Subtema.tema_id).where(Tema.nombre == tema)
    return [x.nombre for x in session.scalars(q)]


def test_subtemas_and_temas_keep_the_order_of_the_bank_not_the_alphabet(session):
    import_bank(session, banco("Zeta", "Alfa", "Media"))
    import_bank(session, banco("Beta", tema="T2"))
    assert nombres(session, Subtema, "T1") == ["Zeta", "Alfa", "Media"]
    assert nombres(session, Subtema, "T2") == ["Beta"]
    assert nombres(session, Tema) == ["T1", "T2"]


def test_a_new_subtema_goes_last_even_in_a_later_import(session):
    import_bank(session, banco("Zeta", "Alfa"))
    import_bank(session, banco("Zeta", "Alfa", "Aaa"))
    assert nombres(session, Subtema, "T1") == ["Zeta", "Alfa", "Aaa"]


def test_banks_imported_before_the_order_existed_are_fixed_on_reimport(session):
    import_bank(session, banco("Zeta", "Alfa", "Media"))
    session.execute(update(Subtema).values(orden=0))  # como quedaron los bancos antiguos
    session.commit()
    assert nombres(session, Subtema, "T1") == ["Alfa", "Media", "Zeta"]
    import_bank(session, banco("Zeta", "Alfa", "Media"))
    assert nombres(session, Subtema, "T1") == ["Zeta", "Alfa", "Media"]


def test_an_order_already_set_is_never_overwritten(session):
    import_bank(session, banco("Zeta", "Alfa"))
    import_bank(session, banco("Alfa", "Zeta"))  # otro orden en un banco posterior: manda el primero
    assert nombres(session, Subtema, "T1") == ["Zeta", "Alfa"]
