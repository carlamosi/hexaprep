from sqlalchemy import select, update

from conftest import make_bank
from hexaprep.auditoria import auditar
from hexaprep.events import start_session, submit_answer
from hexaprep.importer import import_bank
from hexaprep.models import Dominio, Pregunta


def test_auditoria_cuadra_y_detecta_un_dominio_alterado(session, bank):
    import_bank(session, make_bank(bank, [("q1", "A", "s", 3), ("q2", "A", "s", 3)]))
    sid = start_session(session, "practica", {})
    pid = session.scalar(select(Pregunta.id).where(Pregunta.clave == "q1"))
    submit_answer(session, sid, pid, ["a", "b", "c", "d"], "a", None, {})
    r = auditar(session)
    assert r["ok"] and r["intentos"] == r["eventos_respuesta"] == 1, f"auditoría sana: {r}"
    session.execute(update(Dominio).where(Dominio.n_intentos > 0).values(theta=5.0))
    session.commit()
    r = auditar(session)
    assert not r["ok"] and len(r["dominio_incoherente"]) == 1, f"debe detectar el dominio alterado: {r}"
