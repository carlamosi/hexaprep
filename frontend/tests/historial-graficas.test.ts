import { describe, expect, it } from "vitest";
import type { Analytics } from "../src/api";
import { ordenPanal, pendientes, titularPendientes } from "../src/components/historial/datos";

type Evo = Analytics["evolucion"];
const tema = (id: string, nombre: string, ps: [string, number][]) => ({
  tema_id: id, tema: nombre, puntos: ps.map(([fecha, percent]) => ({ fecha, percent })), subtemas: [],
});
const evo = (temas: Evo["temas"]): Evo => ({ asignatura: [], temas });
const orden = ordenPanal([]);

describe("pendiente por tema", () => {
  it("compara el primer y el último punto de cada tema y ordena de más a menos subida", () => {
    const r = pendientes(evo([
      tema("a", "T1 Oferta", [["2026-11-01", 20], ["2026-11-10", 22], ["2026-11-20", 24]]),
      tema("b", "T2 Costes", [["2026-11-01", 10], ["2026-11-20", 40]]),
    ]), orden);
    expect(r.map((x) => [x.id, x.antes, x.ahora, x.delta])).toEqual([["b", 10, 40, 30], ["a", 20, 24, 4]]);
    expect(r[0].nombre).toBe("Costes"); // sin prefijo T<n>
  });

  it("descarta los temas con un solo punto o un solo día", () => {
    expect(pendientes(evo([tema("a", "Uno", [["2026-11-01", 50]])]), orden)).toEqual([]);
  });

  it("el titular dice la conclusión: quién sube, quién baja o se estanca", () => {
    const sube = { id: "b", nombre: "Química", color: "", antes: 10, ahora: 28, delta: 18, desde: "", hasta: "" };
    const quieto = { ...sube, id: "a", nombre: "Economía", antes: 30, ahora: 31, delta: 1 };
    const baja = { ...sube, id: "c", nombre: "Mates", antes: 50, ahora: 40, delta: -10 };
    expect(titularPendientes([sube, quieto])).toBe("Química sube 18 puntos y Economía se estanca");
    expect(titularPendientes([sube, quieto, baja])).toBe("Química sube 18 puntos y Mates baja 10 puntos");
    expect(titularPendientes([quieto])).toBe("Ningún tema se ha movido más de 5 puntos");
    expect(titularPendientes([])).toBe("");
  });
});
