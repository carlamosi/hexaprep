"""Lanza las pruebas y muestra un resumen corto (máx. 40 líneas); la salida completa va a un archivo.

Uso: python tools/probar.py back|front|todo [-k expr] [--lento]
  back   pytest de backend (sin las pruebas marcadas «lento», salvo --lento)
  front  vitest (con -k filtra por nombre; sin -k solo lo cambiado respecto a HEAD, o todo con --todo)
  todo   back + front
La salida completa queda en data/probar-<parte>.txt (ignorado por git).
"""
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = RAIZ / "data"
MAX = 40


def correr(cmd, cwd, archivo):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", shell=sys.platform == "win32" and cmd[0] == "npx")
    texto = p.stdout + p.stderr
    SALIDA.mkdir(exist_ok=True)
    archivo.write_text(texto, encoding="utf-8")
    return p.returncode, texto


def resumen_pytest(texto):
    """Totales y, por cada fallo, test, línea y líneas «E» (esperado y obtenido)."""
    out = []
    fallos = re.split(r"^_{3,} (.+?) _{3,}$", texto, flags=re.M)
    for nombre, cuerpo in zip(fallos[1::2], fallos[2::2]):
        e = [l.strip() for l in cuerpo.splitlines() if l.startswith("E ")][:3]
        ubic = re.findall(r"^(\S+\.py):(\d+):", cuerpo, flags=re.M)
        out.append(f"FALLA {nombre}" + (f" ({ubic[-1][0]}:{ubic[-1][1]})" if ubic else ""))
        out += [f"   {l}" for l in e]
    tot = [l for l in texto.splitlines() if re.search(r"\d+ (passed|failed|error)", l)]
    return out + tot[-1:]


def resumen_vitest(texto):
    lin = texto.splitlines()
    out = [l for l in lin if re.search(r"FAIL|AssertionError|expected|Expected|Received|✗|×", l)][: MAX - 6]
    out += [l for l in lin if re.match(r"\s*(Test Files|Tests)\s", l)]
    return out


def main(args):
    if not args or args[0] not in ("back", "front", "todo"):
        print(__doc__)
        return 2
    parte, resto = args[0], args[1:]
    k = resto[resto.index("-k") + 1] if "-k" in resto else None
    lento = "--lento" in resto
    codigo, lineas = 0, []
    if parte in ("back", "todo"):
        py = RAIZ / ".venv" / ("Scripts" if sys.platform == "win32" else "bin") / "python"
        cmd = [str(py), "-m", "pytest", "-q", "--tb=short", "-p", "no:cacheprovider", "-W", "ignore"]
        if not lento:
            cmd += ["-m", "not lento"]
        if k:
            cmd += ["-k", k]
        c, t = correr(cmd, RAIZ / "backend", SALIDA / "probar-back.txt")
        codigo |= c
        lineas += ["[back]"] + resumen_pytest(t)
    if parte in ("front", "todo"):
        cmd = ["npx", "vitest", "run"]
        if k:
            cmd += ["-t", k]
        elif "--todo" not in resto and parte == "front":
            cmd += ["--changed"]
        c, t = correr(cmd, RAIZ / "frontend", SALIDA / "probar-front.txt")
        codigo |= c
        lineas += ["[front]"] + resumen_vitest(t)
    if len(lineas) > MAX:
        lineas = lineas[:MAX - 1] + [f"... recortado; completo en data/probar-*.txt"]
    print("\n".join(lineas))
    print("OK" if codigo == 0 else "HAY FALLOS")
    return codigo


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
