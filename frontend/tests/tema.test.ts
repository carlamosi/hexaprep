import { afterEach, describe, expect, it } from "vitest";
import { aplicarTema, esOscuro, leerTema } from "../src/tema";

afterEach(() => { localStorage.clear(); document.documentElement.removeAttribute("data-theme"); });

describe("tema de color", () => {
  it("por_defecto_sigue_al_sistema_y_oscuro_y_claro_se_recuerdan", () => {
    expect(leerTema()).toBe("sistema");
    aplicarTema("oscuro");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(leerTema()).toBe("oscuro");
    expect(esOscuro()).toBe(true);
    aplicarTema("claro");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(esOscuro()).toBe(false);
    aplicarTema("sistema");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(leerTema()).toBe("sistema");
  });
});
