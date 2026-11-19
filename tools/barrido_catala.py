"""Barrido de contenido de Català por reglas (sin agentes), idempotente. Los ids no cambian: dependen de la posición.

1. Quita «(masculí)» o «(femení)» de «Escriu la vocal que falta»: el género da la pista de la vocal.
2. Los verbos (V1) ya no repiten «Escriu el gerundi i el participi» (los huecos ya se llaman Gerundi y Participi):
   el enunciado pasa a «Verb: «x».» (cambio en tools/build_verbs.py, que regenera V1.json).
Uso: python tools/barrido_catala.py   (luego reconstruye N2.json y V1.json como indica ESTADO)
"""
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
PISTA = re.compile(r"(Escriu (?:la|les) vocals? (?:tònica )?que (?:falta|falten): «[^»]*»)\s*\((?:masculí|femení)\)")

n = 0
for f in sorted((RAIZ / "banks" / "catala" / "src").glob("*/*.json")):
    texto = f.read_text(encoding="utf-8")
    nuevo, k = PISTA.subn(r"\1", texto)
    if k:
        f.write_text(nuevo, encoding="utf-8")
        n += k
print(f"{n} enunciados sin la pista de género")
