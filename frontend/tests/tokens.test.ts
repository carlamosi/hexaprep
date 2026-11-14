import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "tokens.css"), "utf-8").toLowerCase();

const PALETTE = {
  azul: "#0072b2",
  ambar: "#e69f00",
  verde: "#009e73",
  rosa: "#cc79a7",
  naranja: "#d55e00",
  indigo: "#5854b0",
  marron: "#8a5c38",
  carmin: "#d12630",
};

describe("tokens de marca", () => {
  it("palette_matches_spec: los 8 colores de la paleta y el acento de Economía", () => {
    for (const [name, hex] of Object.entries(PALETTE)) {
      expect(css, name).toMatch(new RegExp(`--${name}:\\s*${hex}`));
    }
    expect(css).toMatch(/--lila:\s*#b05a8f/);
  });

  it("declara Lexend con los cuatro pesos de la marca", () => {
    expect(css).toMatch(/--font:[^;]*lexend/);
    for (const w of [400, 500, 600, 700]) {
      expect(css, `peso ${w}`).toContain(`@fontsource/lexend/${w}.css`);
    }
  });
});
