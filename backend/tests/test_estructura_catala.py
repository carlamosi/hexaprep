"""Los bancos de Català y banks/catala/estructura.json cuentan la misma historia.

El snapshot `fixtures/catala_antes.json` guarda la ruta antigua (tema, subtema, concepto) de cada clave: es el único dato
independiente del mapa. Un fallo aquí dice qué concepto o clave no cuadra y cuál era su ruta antigua.
"""
import difflib
import json
from collections import Counter, defaultdict
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[2]
BANCOS = ("G1", "N2", "V1")


def estructura() -> dict:
    return json.loads((RAIZ / "banks/catala/estructura.json").read_text(encoding="utf-8"))


def antes() -> dict[str, list[str]]:
    return json.loads((Path(__file__).parent / "fixtures/catala_antes.json").read_text(encoding="utf-8"))


def banco_nuevo() -> dict[str, list[str]]:
    """clave -> [tema, subtema, concepto] según los JSON de banco de hoy."""
    out = {}
    for b in BANCOS:
        for q in json.loads((RAIZ / f"banks/catala/{b}.json").read_text(encoding="utf-8"))["preguntas"]:
            assert q["id"] not in out, f"clave repetida entre bancos: {q['id']}"
            out[q["id"]] = [q["tema"], q["subtema"], q["concepto"]]
    return out


def conceptos_de_estructura():
    for t in estructura()["temas"]:
        for s in t["subtemas"]:
            for c in s["conceptos"]:
                yield t["nombre"], s["nombre"], c


def test_ninguna_clave_se_pierde_ni_se_duplica():
    viejas, nuevas = set(antes()), set(banco_nuevo())
    assert nuevas == viejas, (f"claves que faltan en el banco nuevo: {sorted(viejas - nuevas)[:5]}; "
                              f"claves nuevas que no existían: {sorted(nuevas - viejas)[:5]} (los ids salen de la posición)")


def test_cada_concepto_antiguo_va_a_exactamente_un_concepto_nuevo():
    destinos = defaultdict(list)
    for t, s, c in conceptos_de_estructura():
        for ruta in c["de"]:
            destinos[tuple(ruta)].append(f"{t} > {s} > {c['nombre']}")
    for ruta in {tuple(r) for r in antes().values()}:
        d = destinos.get(ruta, [])
        # una partición reparte un origen en varios destinos; en ese caso las claves de las piezas deben cubrirlo entero
        if len(d) != 1:
            piezas = [c for _, _, c in conceptos_de_estructura() if list(ruta) in c["de"] and "claves" in c]
            assert piezas and len(piezas) == len(d), f"el concepto antiguo {' > '.join(ruta)} tiene {len(d)} destinos: {d}"


def test_las_claves_de_la_particion_son_exactamente_las_del_concepto_partido():
    for t, s, c in conceptos_de_estructura():
        if "claves" not in c:
            continue
        origen = {k for k, r in antes().items() if r in c["de"]}
        asignadas = [k for _, _, p in conceptos_de_estructura() if "claves" in p and p["de"] == c["de"] for k in p["claves"]]
        assert len(asignadas) == len(set(asignadas)), f"claves en dos piezas de la partición de {c['de'][0][2]}"
        assert set(asignadas) == origen, (f"la partición de «{c['de'][0][2]}» reparte {len(set(asignadas))} claves y el concepto "
                                          f"tiene {len(origen)}: sobran {sorted(set(asignadas) - origen)[:3]}, "
                                          f"faltan {sorted(origen - set(asignadas))[:3]}")


def test_rutas_de_estructura_y_de_bancos_coinciden_caracter_a_caracter():
    declaradas = {(t, s, c["nombre"]) for t, s, c in conceptos_de_estructura()}
    reales = {tuple(r) for r in banco_nuevo().values()}
    msgs = []
    for r in sorted(reales - declaradas):
        cerca = difflib.get_close_matches(" > ".join(r), [" > ".join(d) for d in declaradas], n=1, cutoff=0.6)
        msgs.append(f"el banco usa «{' > '.join(r)}» y estructura.json no lo declara (¿tilde u otro carácter?; parecido: {cerca})")
    for d in sorted(declaradas - reales):
        msgs.append(f"estructura.json declara «{' > '.join(d)}» y ningún banco lo usa")
    assert not msgs, "\n".join(msgs)


def test_no_hay_nombres_de_concepto_repetidos_en_la_asignatura():
    nombres = Counter(c["nombre"] for _, _, c in conceptos_de_estructura())
    assert not [n for n, k in nombres.items() if k > 1], f"conceptos repetidos en estructura.json: {[n for n, k in nombres.items() if k > 1]}"
    por_ruta = defaultdict(set)
    for t, s, c in banco_nuevo().values():
        por_ruta[c].add((t, s))
    assert not {c: r for c, r in por_ruta.items() if len(r) > 1}, "un mismo concepto vive en dos subtemas en los bancos"


def test_preguntas_por_subtema_nuevo_salen_de_las_antiguas_y_el_mapa():
    # esperado: cada pregunta antigua cuenta en el subtema al que el mapa lleva su concepto
    destino = {}
    for t, s, c in conceptos_de_estructura():
        for ruta in c["de"]:
            destino.setdefault(tuple(ruta), (t, s))
    esperado = Counter(destino[tuple(r)] for r in antes().values())
    obtenido = Counter((t, s) for t, s, _ in banco_nuevo().values())
    malos = {k: (esperado[k], obtenido[k]) for k in set(esperado) | set(obtenido) if esperado[k] != obtenido[k]}
    assert not malos, "subtema: (preguntas esperadas por el mapa, preguntas en el banco) " + json.dumps(
        {" > ".join(k): v for k, v in malos.items()}, ensure_ascii=False)


@pytest.mark.parametrize("n_temas,n_subtemas", [(5, 21)])
def test_forma_aprobada_por_carla(n_temas, n_subtemas):
    e = estructura()
    assert [t["nombre"] for t in e["temas"]] == [
        "Ortografia i accentuació", "El nom, l'adjectiu i l'article", "El verb", "Pronoms, preposicions i lèxic", "Literatura"]
    assert sum(len(t["subtemas"]) for t in e["temas"]) == n_subtemas
    assert not [t["nombre"] for t in e["temas"] if t["nombre"].startswith(("T1", "T2", "T3", "T4", "T5"))]
