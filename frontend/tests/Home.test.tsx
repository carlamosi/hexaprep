import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/api";
import { Home } from "../src/pages/Home";

afterEach(() => vi.restoreAllMocks());

describe("Home", () => {
  it("loads_first_subject_map_and_selects_subtema", async () => {
    vi.spyOn(api, "getSubjects").mockResolvedValue([
      { id: "eco", nombre: "Economía", idioma: "es", color: "#B05A8F", acento: "#B05A8F", percent: 39 },
    ]);
    const getMap = vi.spyOn(api, "getMap").mockResolvedValue({
      asignatura: "Economía", percent: 39,
      hexes: [{ concepto_id: "c1", nombre: "Coste de oportunidad", subtema_id: "s1", subtema: "La escasez", tema: "Decisiones", tema_id: "t1", color: "#B05A8F", percent: 40 }],
      subtemas: [{ id: "s1", nombre: "La escasez", percent: 67 }],
    });
    const onSelect = vi.fn();
    render(<Home onSelectSubtema={onSelect} />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    expect(await screen.findByRole("heading", { level: 1, name: "Economía" })).toBeInTheDocument();
    expect(getMap).toHaveBeenCalledWith("eco");
    expect(screen.getByTestId("subtema-pct-s1")).toHaveTextContent("67");
    await userEvent.click(screen.getByRole("button", { name: /Coste de oportunidad/ }));
    expect(onSelect).toHaveBeenCalledWith("s1");
  });

  it("shows_error_text_when_api_fails", async () => {
    vi.spyOn(api, "getSubjects").mockRejectedValue(new Error("x"));
    render(<Home />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se ha podido cargar");
  });
});
