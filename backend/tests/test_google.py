"""Acceso con Google: token firmado, comprobación del token de Google, lista de permitidos y endpoints."""
import io
import json
import time

import pytest
from fastapi.testclient import TestClient

from hexaprep import auth
from hexaprep.api import create_app

CLIENT = "123.apps.googleusercontent.com"
SECRETO = "s" * 40


def claims_de_google(email="carla@gmail.com", **o):
    return {"aud": CLIENT, "iss": "https://accounts.google.com", "email": email, "email_verified": "true",
            "name": "Carla", "exp": str(int(time.time()) + 3000), **o}


def abrir_con(claims):
    return lambda url, timeout=None: io.BytesIO(json.dumps(claims).encode())


def test_la_cookie_de_sesion_va_firmada_y_caduca():
    t = auth.firmar(SECRETO, "carla@gmail.com", "u_abc", ahora=1000)
    assert auth.leer(SECRETO, t, ahora=1000 + 60)["e"] == "carla@gmail.com"
    assert auth.leer(SECRETO, t, ahora=1000 + auth.DURACION + 1) is None  # caducada
    assert auth.leer("otro" * 10, t, ahora=1000) is None  # otra clave
    cuerpo, firma = t.split(".")
    assert auth.leer(SECRETO, cuerpo + "." + firma[:-2] + "AA", ahora=1000) is None  # firma manipulada
    for basura in (None, "", "sin-punto", "a.b"):
        assert auth.leer(SECRETO, basura, ahora=1000) is None


def test_verifica_el_token_de_google():
    assert auth.verificar_google("tok", CLIENT, abrir_con(claims_de_google()))["email"] == "carla@gmail.com"
    malos = [claims_de_google(aud="otra.apps.googleusercontent.com"), claims_de_google(email_verified="false"),
             claims_de_google(iss="https://evil.example"), claims_de_google(exp=str(int(time.time()) - 5)),
             {k: v for k, v in claims_de_google().items() if k != "email"}]
    for c in malos:
        with pytest.raises(auth.AuthError):
            auth.verificar_google("tok", CLIENT, abrir_con(c))

    def falla(url, timeout=None):
        raise OSError("sin red")

    with pytest.raises(auth.AuthError):
        auth.verificar_google("tok", CLIENT, falla)


def test_lista_de_permitidos_no_distingue_mayusculas_ni_espacios():
    assert auth.permitido("Carla@Gmail.com", " carla@gmail.com , otra@gmail.com ")
    assert not auth.permitido("intruso@gmail.com", "carla@gmail.com")
    assert not auth.permitido("carla@gmail.com", "")


@pytest.fixture
def cliente(tmp_path, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", CLIENT)
    monkeypatch.setenv("SESSION_SECRET", SECRETO)
    monkeypatch.setenv("HEXAPREP_EMAILS_PERMITIDOS", "carla@gmail.com,amiga@gmail.com")
    (tmp_path / "fuentes").mkdir()
    app = create_app(db_path=tmp_path / "d" / "h.db", data_dir=tmp_path / "d", booklet_dir=tmp_path / "fuentes")
    with TestClient(app) as c:
        yield c


def entrar(cliente, monkeypatch, email="carla@gmail.com"):
    monkeypatch.setattr(auth, "verificar_google", lambda cred, cid, abrir=None: claims_de_google(email))
    return cliente.post("/api/auth/google", json={"credential": "tok"})


def test_sin_sesion_la_api_responde_401_pero_la_configuracion_es_publica(cliente):
    assert cliente.get("/api/subjects").status_code == 401
    assert cliente.get("/api/auth/me").status_code == 401
    assert cliente.get("/api/auth/config").json() == {"google_client_id": CLIENT}


def test_entrar_con_un_email_permitido_abre_la_api_y_salir_la_cierra(cliente, monkeypatch):
    r = entrar(cliente, monkeypatch)
    assert r.status_code == 200 and r.json() == {"email": "carla@gmail.com", "nombre": "Carla"}
    assert "hp_session" in r.headers["set-cookie"] and "HttpOnly" in r.headers["set-cookie"]
    assert cliente.get("/api/subjects").status_code == 200
    assert cliente.get("/api/auth/me").json()["email"] == "carla@gmail.com"
    cliente.post("/api/auth/logout")
    assert cliente.get("/api/subjects").status_code == 401


def test_un_email_no_permitido_o_un_token_falso_no_entran(cliente, monkeypatch):
    assert entrar(cliente, monkeypatch, "intruso@gmail.com").status_code == 403
    assert cliente.get("/api/subjects").status_code == 401

    def rechaza(cred, cid, abrir=None):
        raise auth.AuthError("token no válido")

    monkeypatch.setattr(auth, "verificar_google", rechaza)
    assert cliente.post("/api/auth/google", json={"credential": "x"}).status_code == 401


def test_una_cookie_de_quien_ya_no_esta_en_la_lista_deja_de_valer(cliente, monkeypatch):
    entrar(cliente, monkeypatch)
    monkeypatch.setenv("HEXAPREP_EMAILS_PERMITIDOS", "amiga@gmail.com")
    assert cliente.get("/api/subjects").status_code == 401


def test_sin_google_configurado_la_api_sigue_abierta_como_en_local(tmp_path, monkeypatch):
    for k in ("GOOGLE_CLIENT_ID", "SESSION_SECRET", "HEXAPREP_PASSWORD"):
        monkeypatch.delenv(k, raising=False)
    (tmp_path / "f").mkdir()
    with TestClient(create_app(db_path=tmp_path / "d" / "h.db", data_dir=tmp_path / "d", booklet_dir=tmp_path / "f")) as c:
        assert c.get("/api/subjects").status_code == 200
        assert c.get("/api/auth/config").json() == {"google_client_id": None}


def test_con_google_pero_sin_secreto_de_sesion_la_app_no_arranca(tmp_path, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", CLIENT)
    monkeypatch.delenv("SESSION_SECRET", raising=False)
    with pytest.raises(RuntimeError):
        create_app(db_path=tmp_path / "h.db", data_dir=tmp_path)


@pytest.mark.parametrize("exp", ["no-es-un-numero", None, "", "1e99x"])
def test_un_exp_raro_en_el_token_se_rechaza_sin_romper(exp):
    c = claims_de_google()
    c["exp"] = exp
    with pytest.raises(auth.AuthError):
        auth.verificar_google("tok", CLIENT, abrir_con(c))


# ---------- flujo con redirección (app instalada en iPhone: la ventana emergente de Google no funciona allí) ----------
def enviar_redirect(cliente, monkeypatch, email="carla@gmail.com", csrf_cookie="abc", csrf_form="abc", valido=True):
    def verifica(cred, cid, abrir=None):
        if not valido:
            raise auth.AuthError("token no válido")
        return claims_de_google(email)

    monkeypatch.setattr(auth, "verificar_google", verifica)
    cliente.cookies.clear()
    if csrf_cookie is not None:
        cliente.cookies.set("g_csrf_token", csrf_cookie)
    return cliente.post("/api/auth/google/redirect", content=f"credential=tok&g_csrf_token={csrf_form}",
                        headers={"Content-Type": "application/x-www-form-urlencoded"}, follow_redirects=False)


def test_redirect_con_token_bueno_abre_sesion_y_vuelve_a_la_app(cliente, monkeypatch):
    r = enviar_redirect(cliente, monkeypatch)
    assert r.status_code == 303 and r.headers["location"] == "/"
    assert "hp_session" in r.headers["set-cookie"] and "HttpOnly" in r.headers["set-cookie"]
    assert cliente.get("/api/subjects").status_code == 200  # la cookie de sesión ya vale


def test_redirect_exige_el_token_csrf_de_google_en_cookie_y_formulario(cliente, monkeypatch):
    for cookie, form in ((None, "abc"), ("abc", "otro"), ("abc", ""), ("", "")):
        r = enviar_redirect(cliente, monkeypatch, csrf_cookie=cookie, csrf_form=form)
        assert r.status_code == 303 and r.headers["location"] == "/?acceso=error", (cookie, form)
        assert "hp_session" not in r.headers.get("set-cookie", "")
    assert cliente.get("/api/subjects").status_code == 401


def test_redirect_con_email_no_permitido_o_token_falso_vuelve_con_aviso_y_sin_sesion(cliente, monkeypatch):
    r = enviar_redirect(cliente, monkeypatch, email="intruso@gmail.com")
    assert r.headers["location"] == "/?acceso=denegado" and "hp_session" not in r.headers.get("set-cookie", "")
    r = enviar_redirect(cliente, monkeypatch, valido=False)
    assert r.headers["location"] == "/?acceso=error" and "hp_session" not in r.headers.get("set-cookie", "")
    assert cliente.get("/api/subjects").status_code == 401


# ---------- perfil: quién eres y reiniciar ----------
def test_la_cookie_lleva_tambien_el_nombre():
    t = auth.firmar(SECRETO, "carla@gmail.com", "u_abc", ahora=1000, nombre="Carla Monté")
    assert auth.leer(SECRETO, t, ahora=1001)["n"] == "Carla Monté"
    assert auth.leer(SECRETO, auth.firmar(SECRETO, "a@b.c", "u_x", ahora=1000), ahora=1001).get("n", "") == ""


def test_perfil_dice_quien_eres_y_si_se_puede_reiniciar(cliente, monkeypatch):
    assert cliente.get("/api/perfil").status_code == 401
    entrar(cliente, monkeypatch)
    r = cliente.get("/api/perfil").json()
    assert r == {"email": "carla@gmail.com", "nombre": "Carla", "online": False, "reiniciar": False}  # SQLite local: sin reinicio


def test_reiniciar_exige_confirmacion_y_solo_existe_online(cliente, monkeypatch):
    entrar(cliente, monkeypatch)
    assert cliente.post("/api/perfil/reiniciar", json={}).status_code == 422
    assert cliente.post("/api/perfil/reiniciar", json={"confirmar": False}).status_code == 422
    assert cliente.post("/api/perfil/reiniciar", json={"confirmar": True}).status_code == 501  # aquí no hay Postgres


def test_sin_google_perfil_responde_sin_email(tmp_path, monkeypatch):
    for k in ("GOOGLE_CLIENT_ID", "SESSION_SECRET", "HEXAPREP_PASSWORD", "DATABASE_URL", "POSTGRES_URL"):
        monkeypatch.delenv(k, raising=False)
    (tmp_path / "f").mkdir()
    with TestClient(create_app(db_path=tmp_path / "d" / "h.db", data_dir=tmp_path / "d", booklet_dir=tmp_path / "f")) as c:
        assert c.get("/api/perfil").json() == {"email": None, "nombre": "", "online": False, "reiniciar": False}
