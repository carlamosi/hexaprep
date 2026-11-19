"""Las imágenes de las preguntas viajan con el frontend (carpeta pública), no con banks/: online no existe banks/."""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def test_cada_imagen_de_los_bancos_esta_en_la_carpeta_publica_del_frontend():
    faltan = []
    for banco in (RAIZ / "banks").glob("*/*.json"):
        if banco.parent.name == "src":
            continue
        for q in json.loads(banco.read_text(encoding="utf-8")).get("preguntas", []):
            if q.get("imagen") and not (RAIZ / "frontend" / "public" / "img" / q["imagen"]).is_file():
                faltan.append(f"{banco.name}: {q['imagen']}")
    assert not faltan, f"faltan en frontend/public/img (ejecuta tools/sync_imagenes.py): {sorted(set(faltan))[:5]}"
