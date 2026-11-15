"""Retirar un banco: sus preguntas dejan de servirse y de contar, sin borrar nada, y la reimportación lo respeta."""
from sqlalchemy import select

from hexaprep.events import start_session, submit_answer
from hexaprep.importer import import_bank
from hexaprep.models import Concepto, Dominio, Pregunta
from hexaprep.quality import retire_claves
from hexaprep.selector import Filtro, next_question


def test_retirar_excluye_recalcula_y_sobrevive_a_reimportar(session, bank):
    import_bank(session, bank)
    p = session.scalars(select(Pregunta)).first()
    sid = start_session(session, "practica", {})
    submit_answer(session, sid, p.id, ["a", "b", "c", "d"], "a", None, {})
    assert session.scalar(select(Dominio.n_intentos).where(Dominio.concepto_id == p.concepto_id)) == 1

    n = retire_claves(session, [q.id for q in bank.preguntas])
    assert n == len(bank.preguntas)
    assert all(x.excluida for x in session.scalars(select(Pregunta)))
    assert session.scalar(select(Dominio.n_intentos).where(Dominio.concepto_id == p.concepto_id)) == 0
    assert session.scalar(select(Pregunta.id)) is not None  # nada se borra

    r = import_bank(session, bank)
    assert r.unchanged == len(bank.preguntas) and all(x.excluida for x in session.scalars(select(Pregunta)))
