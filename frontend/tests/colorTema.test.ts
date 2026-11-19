import { describe, expect, it } from "vitest";
import { colorTema, tonoBanner } from "../src/colorTema";

const hslDe = (c: string) => c.match(/hsl\((\d+) (\d+)% (\d+)%\)/)!.slice(1).map(Number);

describe("color de cada tema desde el color de la asignatura", () => {
  it("el_tono_avanza_unos_40_grados_en_todo_el_temario_y_la_claridad_alterna", () => {
    const n = 5;
    const cs = Array.from({ length: n }, (_, i) => hslDe(colorTema("#B05A8F", i, n)));
    const giro = (cs[n - 1][0] - cs[0][0] + 360) % 360;
    expect(giro, `tonos: ${cs.map((c) => c[0])}`).toBeGreaterThanOrEqual(38);
    expect(giro).toBeLessThanOrEqual(42);
    expect(cs[1][2], "temas vecinos con distinta claridad").not.toBe(cs[0][2]);
    expect(new Set(cs.map((c) => c.join("-"))).size).toBe(n);
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
