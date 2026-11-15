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

it("shows_every_concept_as_an_ink_hexagon_with_a_color_per_tema", () => {
  const { container } = render(<PanelAsignatura map={MAP} onClose={() => {}} />);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  const hexes = container.querySelectorAll(".pm-hex");
  expect(hexes).toHaveLength(2);
  // hexágono SVG de la marca: sombra desplazada, relleno y contorno de tinta
  for (const sel of [".shadow", ".level", ".line"]) expect(hexes[0].querySelector(sel)).not.toBeNull();
  const colors = Array.from(container.querySelectorAll<HTMLElement>(".pm-tema")).map((s) => s.style.getPropertyValue("--tc"));
  expect(new Set(colors).size).toBe(2);
  expect(screen.getByRole("button", { name: "Mercado, 80 por ciento de dominio" })).toBeInTheDocument();
});

it("each_tema_is_a_card_with_title_percent_and_subtema_progress", () => {
  render(<PanelAsignatura map={MAP} onClose={() => {}} />);
  const tema = screen.getByRole("region", { name: "Sistemas" });
  expect(within(tema).getByText("Tema 2")).toBeInTheDocument();
  expect(within(tema).getByTestId("pm-tema-pct-t2")).toHaveTextContent("80");
  expect(within(tema).getByRole("button", { name: /Agentes.*80 %/ })).toBeInTheDocument();
  expect(screen.getByText("2 conceptos · 2 temas · 2 subtemas")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: /Relleno del hexágono = dominio del concepto/ })).toBeInTheDocument();
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

it("subtema_name_and_its_hexagons_open_that_subtema", async () => {
  const onSelect = vi.fn();
  render(<PanelAsignatura map={MAP} onClose={() => {}} onSelectSubtema={onSelect} />);
  await userEvent.click(screen.getByRole("button", { name: /Agentes/ }));
  expect(onSelect).toHaveBeenCalledWith("s2");
  await userEvent.click(screen.getByRole("button", { name: /^Coste,/ }));
  expect(onSelect).toHaveBeenLastCalledWith("s1");
});
