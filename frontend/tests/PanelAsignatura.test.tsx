import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type { Hex, MapResponse } from "../src/api";
import { PanelAsignatura } from "../src/components/PanelAsignatura";

const hex = (over: Partial<Hex>): Hex => ({
  concepto_id: "c1", nombre: "Coste", subtema_id: "s1", subtema: "Escasez", tema: "Decisiones", tema_id: "t1", color: "#000", percent: 40, ...over,
});
const MAP: MapResponse = {
  asignatura: "Economía", percent: 50,
  subtemas: [{ id: "s1", nombre: "Escasez", percent: 40 }, { id: "s2", nombre: "Agentes", percent: 80 }],
  hexes: [hex({}), hex({ concepto_id: "c2", nombre: "Mercado", subtema_id: "s2", subtema: "Agentes", tema: "Sistemas", tema_id: "t2", percent: 80 })],
};

it("shows_every_concept_as_an_ink_hexagon_in_one_mass_with_a_color_per_tema", () => {
  const { container } = render(<PanelAsignatura map={MAP} onClose={() => {}} />);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  const hexes = container.querySelectorAll<HTMLElement>(".pm-hex");
  expect(hexes).toHaveLength(2);
  for (const sel of [".shadow", ".level", ".line"]) expect(hexes[0].querySelector(sel)).not.toBeNull();
  expect(container.querySelectorAll(".pm-tema, .pm-cluster")).toHaveLength(1); // una sola masa, sin tarjetas por tema
  expect(new Set(Array.from(hexes).map((h) => h.style.getPropertyValue("--c"))).size).toBe(2);
  expect(screen.getByRole("button", { name: "Mercado, 80 por ciento de dominio" })).toBeInTheDocument();
});

it("the_first_tema_sits_below_the_newest", () => {
  const { container } = render(<PanelAsignatura map={{ ...MAP, hexes: [...MAP.hexes].map((h, i) => ({ ...h, concepto_id: `x${i}` })) }} onClose={() => {}} />);
  const top = (n: string) => parseFloat(container.querySelector<HTMLElement>(`[aria-label^="${n},"]`)!.style.top);
  // con 2 conceptos caben en una fila (14 columnas): se comprueba con 15, que obliga a una segunda fila
  expect(top("Coste")).toBeGreaterThanOrEqual(0);
  const muchos = Array.from({ length: 15 }, (_, i) => hex({ concepto_id: `m${i}`, nombre: `C${i}`, tema_id: i < 8 ? "t1" : "t2", tema: i < 8 ? "Primero" : "Segundo" }));
  const r = render(<PanelAsignatura map={{ ...MAP, hexes: muchos }} onClose={() => {}} />);
  const y = (n: string) => parseFloat(r.container.querySelector<HTMLElement>(`[aria-label^="${n},"]`)!.style.top);
  expect(y("C0"), "el primer concepto va en la fila de abajo").toBeGreaterThan(y("C14"));
});

it("lists_the_temas_with_their_percent_and_has_a_search", async () => {
  render(<PanelAsignatura map={MAP} onClose={() => {}} />);
  expect(screen.getByTestId("pm-tema-pct-t2")).toHaveTextContent("80");
  expect(screen.getByText("Sistemas")).toBeInTheDocument();
  expect(screen.getByText("2 conceptos · 2 temas · 2 subtemas")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument();
});

it("shows_the_concept_name_and_percent_on_hover_and_keyboard_focus", async () => {
  render(<PanelAsignatura map={MAP} onClose={() => {}} />);
  const coste = screen.getByRole("button", { name: /^Coste,/ });
  fireEvent.pointerEnter(coste);
  expect(document.querySelector(".hp-tip")).toHaveTextContent("40 %Coste");
  fireEvent.pointerLeave(coste);
  expect(document.querySelector(".hp-tip")).toBeNull();
  fireEvent.focus(coste);
  expect(document.querySelector(".hp-tip")).toHaveTextContent("Escasez");
});

it("closes_with_escape_and_button", async () => {
  const onClose = vi.fn();
  render(<PanelAsignatura map={MAP} onClose={onClose} />);
  await userEvent.keyboard("{Escape}");
  await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  expect(onClose).toHaveBeenCalledTimes(2);
});

it("a_hexagon_and_a_search_result_open_that_subtema", async () => {
  const onSelect = vi.fn();
  render(<PanelAsignatura map={MAP} onClose={() => {}} onSelectSubtema={onSelect} />);
  await userEvent.click(screen.getByRole("button", { name: /^Coste,/ }));
  expect(onSelect).toHaveBeenLastCalledWith("s1");
  await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
  await userEvent.type(screen.getByRole("searchbox"), "agentes");
  await userEvent.click(within(screen.getByRole("searchbox").closest("div")!).getByRole("button", { name: /Mercado/ }));
  expect(onSelect).toHaveBeenLastCalledWith("s2");
});
