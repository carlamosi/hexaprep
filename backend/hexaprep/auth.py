"""Acceso con Google (modo online): comprobación del token de Google y cookie de sesión propia firmada con HMAC."""
import base64
import hashlib
import hmac
import json
import re
import time
import urllib.parse
import urllib.request

DURACION = 30 * 24 * 3600  # la cookie vale 30 días
COOKIE = "hp_session"
TOKENINFO = "https://oauth2.googleapis.com/tokeninfo?id_token="
EMISORES = ("accounts.google.com", "https://accounts.google.com")


class AuthError(Exception):
    pass


def _b64(datos: bytes) -> str:
    return base64.urlsafe_b64encode(datos).rstrip(b"=").decode()


def _firma(secreto: str, cuerpo: str) -> str:
    return _b64(hmac.new(secreto.encode(), cuerpo.encode(), hashlib.sha256).digest())


def firmar(secreto: str, email: str, esquema: str, ahora: float | None = None, nombre: str = "") -> str:
    ahora = time.time() if ahora is None else ahora
    cuerpo = _b64(json.dumps({"e": email, "s": esquema, "x": int(ahora) + DURACION, "n": nombre}).encode())
    return f"{cuerpo}.{_firma(secreto, cuerpo)}"


def leer(secreto: str, token: str | None, ahora: float | None = None) -> dict | None:
    """Contenido de la cookie si la firma es buena y no ha caducado; si no, None."""
    if not token or token.count(".") != 1:
        return None
    cuerpo, firma = token.split(".")
    if not hmac.compare_digest(firma, _firma(secreto, cuerpo)):
        return None
    try:
        datos = json.loads(base64.urlsafe_b64decode(cuerpo + "=" * (-len(cuerpo) % 4)))
        return datos if datos["x"] >= (time.time() if ahora is None else ahora) else None
    except (ValueError, KeyError, TypeError):
        return None


def verificar_google(credential: str, client_id: str, abrir=urllib.request.urlopen) -> dict:
    """Comprueba el token de Google con su servicio `tokeninfo` y devuelve sus datos (email, nombre...)."""
    try:
        with abrir(TOKENINFO + urllib.parse.quote(credential, safe=""), timeout=10) as r:
            c = json.load(r)
    except (OSError, ValueError) as e:
        raise AuthError("Google no ha validado el token") from e
    try:
        caducado = int(c.get("exp")) < time.time()
    except (TypeError, ValueError):
        caducado = True
    if (c.get("aud") != client_id or c.get("iss") not in EMISORES or str(c.get("email_verified")).lower() != "true"
            or not c.get("email") or caducado):
        raise AuthError("token de Google no válido")
    return c


def nombre_de(c: dict) -> str:
    """El nombre de la persona según Google: `name`, o nombre y apellido si no viene entero; vacío si no hay."""
    return (c.get("name") or " ".join(x for x in (c.get("given_name"), c.get("family_name")) if x)).strip()


_PARTES = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]+")


def nombre_de_email(email: str) -> str:
    """Para sesiones abiertas antes de guardar el nombre: «carla.monte@x» es «Carla Monte». Solo si el correo se lee como
    nombre y apellido (letras separadas por punto, guion o guion bajo); con cifras o una sola palabra no se inventa nada."""
    local = email.split("@")[0]
    partes = re.split(r"[._-]+", local)
    if len(partes) < 2 or not all(_PARTES.fullmatch(x) for x in partes):
        return ""
    return " ".join(x.capitalize() for x in partes)


def permitido(email: str, lista: str) -> bool:
    """Lista de emails separados por comas, o `*` para que entre cualquier cuenta de Google. Vacía no deja entrar a nadie."""
    permitidos = {e.strip().lower() for e in lista.split(",") if e.strip()}
    return "*" in permitidos or email.strip().lower() in permitidos
