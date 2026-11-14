"""Valida uno o varios bancos JSON. Uso: python tools/validate_bank.py banks/economia/T1.json ..."""
import sys
from collections import Counter
from pathlib import Path

from hexaprep.bank import load_bank, validate_bank


def main(paths: list[str]) -> int:
    errors = 0
    seen: Counter = Counter()
    for p in paths:
        errs = validate_bank(Path(p))
        for e in errs:
            print(f"ERROR {p}: {e}")
        errors += len(errs)
        if not errs:
            bank = load_bank(Path(p))
            ids = [q.id for q in bank.preguntas]
            seen.update(ids)
            por_tema = Counter(q.tema for q in bank.preguntas)
            print(f"OK {p}: {len(ids)} preguntas {dict(por_tema)}")
    dup = [i for i, n in seen.items() if n > 1]
    if dup:
        print(f"ERROR ids repetidos entre archivos: {dup[:5]}")
        errors += len(dup)
    print(f"{errors} errores")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
