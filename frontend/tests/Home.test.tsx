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

  const MAPA = {
    asignatura: "Química", percent: 10, subtemas: [{ id: "s1", nombre: "El mol", percent: 10 }],
    hexes: [{ concepto_id: "c1", nombre: "Massa molar", subtema_id: "s1", subtema: "El mol", tema: "T2", tema_id: "t1", color: "#1B998B", percent: 10 }],
  };
  const asignatura = (tipos: string[]) => ({ id: "q", nombre: "Química", idioma: "ca", color: "#1B998B", acento: "#1B998B", percent: 10, tipos });

  it("offers_test_only_and_problems_only_when_the_subject_has_both", async () => {
    vi.spyOn(api, "getSubjects").mockResolvedValue([asignatura(["problema", "test", "vf"])]);
    vi.spyOn(api, "getMap").mockResolvedValue(MAPA);
    const onTipo = vi.fn();
    const onPracticar = vi.fn();
    render(<Home onPracticar={onPracticar} onPracticarTipo={onTipo} />);
    await userEvent.click(await screen.findByRole("button", { name: "Solo test y V/F" }));
    await userEvent.click(screen.getByRole("button", { name: "Solo problemas" }));
    await userEvent.click(screen.getByRole("button", { name: "Practicar" }));
    expect(onTipo.mock.calls).toEqual([["test"], ["problemas"]]);
    expect(onPracticar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Test de nivel" })).toBeNull();
  });

  it("calls_the_vf_only_group_Literatura_when_the_subject_has_written_questions_too", async () => {
    vi.spyOn(api, "getSubjects").mockResolvedValue([asignatura(["escrita", "vf"])]);
    vi.spyOn(api, "getMap").mockResolvedValue(MAPA);
    render(<Home onPracticar={vi.fn()} onPracticarTipo={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Literatura" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Solo test y V/F" })).toBeNull();
  });

  it.each([[["test"]], [["problema"]], [["test", "vf"]], [[]]])("hides_the_type_buttons_when_the_subject_has_only_%j", async (tipos) => {
    vi.spyOn(api, "getSubjects").mockResolvedValue([asignatura(tipos)]);
    vi.spyOn(api, "getMap").mockResolvedValue(MAPA);
    render(<Home onPracticar={vi.fn()} />);
    await screen.findByRole("button", { name: "Practicar" });
    expect(screen.queryByRole("button", { name: "Solo problemas" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Solo test y V/F" })).toBeNull();
  });
});
