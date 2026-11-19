import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Buscador, buscar } from "../src/components/Buscador";

const HEXES = [
  { concepto_id: "c1", nombre: "Gerundi de simultaneïtat", subtema_id: "s1", subtema: "Verbs", tema: "Gramàtica", tema_id: "t1", color: "#000", percent: 10 },
  { concepto_id: "c2", nombre: "La b i la v", subtema_id: "s2", subtema: "Ortografia", tema: "Normativa", tema_id: "t2", color: "#000", percent: 0 },
];

describe("buscador de temas, subtemas y conceptos", () => {
  it("busca_sin_acentos_ni_mayusculas_en_concepto_subtema_y_tema", () => {
    expect(buscar(HEXES, "SIMULTANEITAT").map((r) => r.concepto_id)).toEqual(["c1"]);
    expect(buscar(HEXES, "ortografia").map((r) => r.concepto_id)).toEqual(["c2"]);
    expect(buscar(HEXES, "gramatica").map((r) => r.concepto_id)).toEqual(["c1"]);
    expect(buscar(HEXES, "  ")).toEqual([]);
  });

  it("la_lupa_abre_el_cuadro_y_elegir_un_resultado_abre_su_subtema", async () => {
    const onElegir = vi.fn();
    render(<Buscador hexes={HEXES} onElegir={onElegir} />);
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar tema, subtema o concepto" }), "b i la");
    await userEvent.click(screen.getByRole("button", { name: /La b i la v/ }));
    expect(onElegir).toHaveBeenCalledWith("s2");
  });

  it("escape_cierra_el_cuadro", async () => {
    render(<Buscador hexes={HEXES} onElegir={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("el_cuadro_no_se_sale_de_la_pantalla_segun_donde_este_la_lupa", async () => {
    const rect = (left: number) => () => ({ left, right: left + 44, top: 0, bottom: 44, width: 44, height: 44, x: left, y: 0, toJSON() {} }) as DOMRect;
    vi.stubGlobal("innerWidth", 375);
    const abrir = async (left: number) => {
      const { unmount } = render(<Buscador hexes={HEXES} onElegir={vi.fn()} />);
      const boton = screen.getByRole("button", { name: "Buscar" });
      boton.getBoundingClientRect = rect(left);
      await userEvent.click(boton);
      const cuadro = screen.getByRole("searchbox").closest("div")!;
      const clase = cuadro.className;
      unmount();
      return clase;
    };
    expect(await abrir(16), "lupa pegada a la izquierda: el cuadro crece hacia la derecha").toContain("left-0");
    expect(await abrir(320), "lupa a la derecha: el cuadro crece hacia la izquierda").toContain("right-0");
    vi.unstubAllGlobals();
  });
});
