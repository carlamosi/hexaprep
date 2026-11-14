import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from extract_booklet import extract, imposition, to_markdown  # noqa: E402

MINI = Path(__file__).parent / "fixtures" / "mini_booklet.pdf"


def test_extract_keeps_accents():
    text = "\n".join(b.texto for b in extract(MINI))
    assert "Economía" in text and "cómo decidimos" in text and "Monté" in text and "�" not in text


def test_landscape_face_splits_into_two_a5_pages_without_interleaving():
    for b in extract(MINI):
        lines = [l for l in b.texto.splitlines() if l.strip()]
        if b.pagina == 1:  # la portada no lleva marcador, pero no debe colarse nada de la contraportada
            assert lines and "[p" not in b.texto and "Contraportada" not in b.texto
        else:
            assert lines and all(l.startswith(f"[p{b.pagina - 1}]") for l in lines), (b.pagina, lines)


def test_imposition_maps_faces_to_a5_pages():
    faces = imposition(8)  # T = 16
    assert faces[0] == (15, 0) and faces[1] == (1, 14) and faces[2] == (13, 2) and faces[3] == (3, 12)
    assert sorted(p for pair in faces for p in pair) == list(range(16))


def test_pages_are_1_based():
    blocks = extract(MINI)
    assert [b.pagina for b in blocks] == list(range(1, 9))
    assert (blocks[0].pagina, blocks[0].cara) == (1, 1)  # portada: cara 1, mitad derecha
    assert (blocks[1].pagina, blocks[1].cara) == (2, 2)  # [1|6] en la cara 2
    assert (blocks[7].pagina, blocks[7].cara) == (8, 1)  # contraportada: cara 1, mitad izquierda


def test_blocks_follow_index_order():
    blocks = extract(MINI)
    assert [b.bloque for b in blocks] == ["Portada", "Intro", "Intro", "Segundo bloque", "Segundo bloque",
                                          "Segundo bloque", "Tercero", "Contraportada"]
    md = to_markdown(blocks)
    assert md.index("## Intro") < md.index("## Segundo bloque") < md.index("## Tercero")
    assert "pagina 4" in md and "cara 4" in md
