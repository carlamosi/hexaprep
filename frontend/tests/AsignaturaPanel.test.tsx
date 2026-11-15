import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { api, type Hex } from "../src/api";
import { AsignaturaPanel } from "../src/components/AsignaturaPanel";

const hex = (over: Partial<Hex>): Hex => ({
  concepto_id: "c1", nombre: "Coste", subtema_id: "s1", subtema: "Escasez", tema: "Decisiones", tema_id: "t1", color: "#000", percent: 40, ...over,
});

afterEach(() => vi.restoreAllMocks());

it("opens_on_click_and_shows_every_concept_with_theme_color", async () => {
  vi.spyOn(api, "getMap").mockResolvedValue({
    asignatura: "Economía", percent: 10, subtemas: [],
    hexes: [hex({}), hex({ concepto_id: "c2", nombre: "Mercado", subtema_id: "s2", subtema: "Agentes", tema: "Sistemas", tema_id: "t2", percent: 80 })],
  });
  const { container } = render(<AsignaturaPanel asignatura="Economía" asignaturaId="a1" />);
  expect(screen.queryByRole("region")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: /Economía/ }));
  await screen.findByRole("heading", { name: "Sistemas" });
  expect(container.querySelectorAll(".mini-hex")).toHaveLength(2);
  const colors = Array.from(container.querySelectorAll<HTMLElement>("section")).map((s) => s.style.getPropertyValue("--tc"));
  expect(new Set(colors).size).toBe(2);
  await userEvent.unhover(screen.getByRole("button", { name: /Economía/ })); // clic fija el panel aunque el ratón salga
  expect(screen.getByRole("region")).toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("region")).toBeNull();
});

it("opens_on_hover", async () => {
  vi.spyOn(api, "getMap").mockResolvedValue({ asignatura: "Economía", percent: 0, subtemas: [], hexes: [hex({})] });
  render(<AsignaturaPanel asignatura="Economía" asignaturaId="a1" />);
  await userEvent.hover(screen.getByRole("button", { name: /Economía/ }));
  expect(await screen.findByRole("region")).toBeInTheDocument();
});
