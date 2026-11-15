import { render, screen } from "@testing-library/react";
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

it("shows_every_concept_with_a_color_per_tema_and_no_internal_scroll_needed", () => {
  const { container } = render(<PanelAsignatura map={MAP} onClose={() => {}} />);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(container.querySelectorAll(".mini-hex")).toHaveLength(2);
  const colors = Array.from(container.querySelectorAll<HTMLElement>(".pm-tema")).map((s) => s.style.getPropertyValue("--tc"));
  expect(new Set(colors).size).toBe(2);
  expect(screen.getByText("80 %", { selector: "b" })).toBeInTheDocument();
});

it("closes_with_escape_and_button", async () => {
  const onClose = vi.fn();
  render(<PanelAsignatura map={MAP} onClose={onClose} />);
  await userEvent.keyboard("{Escape}");
  await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  expect(onClose).toHaveBeenCalledTimes(2);
});

it("subtema_name_opens_that_subtema", async () => {
  const onSelect = vi.fn();
  render(<PanelAsignatura map={MAP} onClose={() => {}} onSelectSubtema={onSelect} />);
  await userEvent.click(screen.getByRole("button", { name: /Agentes/ }));
  expect(onSelect).toHaveBeenCalledWith("s2");
});
