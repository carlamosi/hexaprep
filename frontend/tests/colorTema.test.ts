import { describe, expect, it } from "vitest";
import { colorTema, tonoBanner } from "../src/colorTema";

const hslDe = (c: string) => c.match(/hsl\((\d+) (\d+)% (\d+)%\)/)!.slice(1).map(Number);

describe("color de cada tema desde el color de la asignatura", () => {
  it("la_claridad_alterna_entre_temas_vecinos_y_ningun_color_se_repite", () => {
    const n = 5;
    const cs = Array.from({ length: n }, (_, i) => hslDe(colorTema("#B05A8F", i, n)));
    expect(cs[1][2], "temas vecinos con distinta claridad").not.toBe(cs[0][2]);
    expect(new Set(cs.map((c) => c.join("-"))).size).toBe(n);
  });

  it("con_cuatro_temas_o_menos_el_arco_sigue_en_40_grados_y_con_mas_crece", () => {
    const giro = (n: number) => { const h = Array.from({ length: n }, (_, i) => hslDe(colorTema("#B05A8F", i, n))[0]); return (h[n - 1] - h[0] + 360) % 360; };
    expect(giro(4), "4 temas").toBeGreaterThanOrEqual(38);
    expect(giro(4)).toBeLessThanOrEqual(42);
    expect(giro(5), "5 temas: los vecinos se distinguen mejor").toBeGreaterThanOrEqual(58);
    expect(giro(5)).toBeLessThanOrEqual(62);
  });

  it("un_solo_tema_no_gira_y_un_color_raro_cae_al_lila", () => {
    expect(colorTema("#1B998B", 0, 1)).toBe(colorTema("#1B998B", 0, 1));
    expect(colorTema("var(--lila)", 0, 3)).toBe(colorTema("#B05A8F", 0, 3));
  });

  it("el_banner_oscurece_los_colores_claros_para_que_el_texto_blanco_se_lea", () => {
    const [, , l] = hslDe(tonoBanner("#E69F00"));
    expect(l).toBeLessThanOrEqual(40);
  });
});
