import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Hex } from "../src/api";
import { HexMap } from "../src/components/HexMap";

const hex = (over: Partial<Hex>): Hex => ({
  concepto_id: "c1", nombre: "Coste de oportunidad", subtema_id: "s1", subtema: "La escasez",
  tema: "Decisiones", tema_id: "t1", color: "#B05A8F", percent: 0, ...over,
});

const HEXES: Hex[] = [
  hex({ concepto_id: "c1", nombre: "Coste de oportunidad", percent: 40 }),
  hex({ concepto_id: "c2", nombre: "Frontera de posibilidades", percent: 75 }),
  hex({ concepto_id: "c3", nombre: "El mercado", subtema_id: "s2", subtema: "Agentes", tema: "Sistemas", tema_id: "t2", percent: 10 }),
];

describe("HexMap", () => {
  it("renders_zero_percent_hexes_on_first_run", () => {
    const zeros = HEXES.map((h) => ({ ...h, percent: 0 }));
    const { container } = render(<HexMap hexes={zeros} onSelect={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    for (const b of buttons) expect(b).toHaveAttribute("data-fill", "0");
    expect(screen.getByRole("button", { name: "Coste de oportunidad, 0 por ciento de dominio" })).toBeInTheDocument();
    // Sin mensajes: el único texto son títulos, nombres y porcentajes.
    expect(container.querySelector("[role=status], [role=alert], .message")).toBeNull();
    expect(container.textContent).not.toMatch(/empieza|todavía|aún|bienvenid|días/i);
  });

  it("fill_level_matches_percent", () => {
    render(<HexMap hexes={HEXES} onSelect={() => {}} />);
    const b = screen.getByRole("button", { name: "Coste de oportunidad, 40 por ciento de dominio" });
    expect(b).toHaveAttribute("data-fill", "40");
    expect(b.querySelector("rect.level")).toHaveAttribute("data-fill", "0.4");
    expect(within(b).getByText(/40/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Frontera de posibilidades, 75/ })).toHaveAttribute("data-fill", "75");
  });

  it("click_calls_onSelect_with_subtema", async () => {
    const onSelect = vi.fn();
    render(<HexMap hexes={HEXES} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /El mercado/ }));
    expect(onSelect).toHaveBeenCalledWith("s2");
  });

  it("practice_button_per_tema_calls_onPracticarTema", async () => {
    const onPracticarTema = vi.fn();
    render(<HexMap hexes={HEXES} onSelect={() => {}} onPracticarTema={onPracticarTema} />);
    await userEvent.click(screen.getByRole("button", { name: "Practicar tema Sistemas" }));
    expect(onPracticarTema).toHaveBeenCalledWith("t2");
  });

  it("subtemas_of_a_tema_share_color_in_different_tones", () => {
    const hexes = [...HEXES, hex({ concepto_id: "c4", subtema_id: "s3", subtema: "Otro", percent: 5 })];
    const { container } = render(<HexMap hexes={hexes} onSelect={() => {}} />);
    const [s1, s2] = Array.from(container.querySelectorAll<HTMLElement>(".tema:first-of-type .subtema"));
    expect(s1.style.getPropertyValue("--c")).not.toBe(s2.style.getPropertyValue("--c"));
    expect(s2.style.getPropertyValue("--c")).toContain("var(--tc)");
  });

  it("keyboard_focus_visible", async () => {
    const onSelect = vi.fn();
    render(<HexMap hexes={HEXES} onSelect={onSelect} />);
    const user = userEvent.setup();
    await user.tab();
    const first = screen.getByRole("button", { name: /Coste de oportunidad/ });
    expect(first).toHaveFocus();
    expect(first).toHaveClass("hex-tile");
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith("s1");
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
    // El estilo de foco de la marca vive en la hoja del componente.
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("src/components/hexmap.css", "utf-8");
    expect(css).toMatch(/\.hex-tile:focus-visible\s*\{[^}]*outline:[^}]*var\(--lila-ink\)/);
  });

  it("groups_by_tema_and_subtema_in_order", () => {
    render(<HexMap hexes={HEXES} onSelect={() => {}} />);
    const temas = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(temas).toEqual(["Decisiones", "Sistemas"]);
    const escasez = screen.getByRole("list", { name: "Conceptos de La escasez" });
    expect(within(escasez).getAllByRole("button")).toHaveLength(2);
    // % de subtema: media de sus conceptos cuando no llega del backend.
    expect(screen.getByTestId("subtema-pct-s1")).toHaveTextContent("58");
  });
});
