"""Respaldo de Neon: se conservan solo las copias más recientes de cada persona."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tools"))
import respaldo_neon  # noqa: E402


def test_poda_deja_las_mas_recientes_y_no_toca_a_otros_perfiles(tmp_path):
    for dia in range(1, 13):
        (tmp_path / f"u_aaa-202611{dia:02d}.db").write_text("x")
    (tmp_path / "u_bbb-20261101.db").write_text("x")
    assert respaldo_neon.podar(tmp_path, "u_aaa") == 12 - respaldo_neon.KEEP
    quedan = sorted(p.name for p in tmp_path.glob("u_aaa-*.db"))
    assert len(quedan) == respaldo_neon.KEEP and quedan[-1] == "u_aaa-20261112.db" and quedan[0] == "u_aaa-20261105.db"
    assert (tmp_path / "u_bbb-20261101.db").exists()
    assert respaldo_neon.podar(tmp_path, "u_aaa") == 0
