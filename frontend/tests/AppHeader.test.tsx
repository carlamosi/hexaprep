import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AppHeader, tinte } from "../src/components/AppHeader";
import { elegirAsignatura } from "../src/hooks";

const SUBJECTS = [
  { id: "a1", nombre: "Economía", idioma: "es", color: "#1", acento: "#1", percent: 62 },
  { id: "a2", nombre: "Química", idioma: "ca", color: "#2", acento: "#2", percent: 44 },
];

afterEach(() => localStorage.clear());

it("tinte_mezcla_el_color_de_la_asignatura_con_blanco_y_rechaza_valores_raros", () => {
  expect(tinte("#000000", 0.3)).toBe("#b3b3b3");
  expect(tinte("#ffffff")).toBe("#ffffff");
  expect(tinte("rojo")).toBeUndefined();
});

function abierto(onCambiar = vi.fn(), onAbrir = vi.fn()) {
  render(<AppHeader asignatura="Economía" asignaturaId="a1" asignaturas={SUBJECTS} onCambiarAsignatura={onCambiar} onAbrirSelector={onAbrir} ruta="panal" />);
  return { onCambiar, onAbrir, boton: screen.getByRole("button", { name: /Asignatura: Economía/ }) };
}

it("selector_lists_every_subject_with_progress_and_marks_the_current_one", async () => {
  const a = abierto();
  expect(screen.queryByRole("listbox")).toBeNull();
  await userEvent.click(a.boton);
  expect(a.onAbrir).toHaveBeenCalled();
  const ops = screen.getAllByRole("option");
  expect(ops.map((o) => o.getAttribute("aria-selected"))).toEqual(["true", "false"]);
  expect(ops[1]).toHaveTextContent("Química");
  expect(ops[1]).toHaveTextContent("CA · 44 % dominio");
});

it("selector_picks_with_click_and_ignores_the_current_subject", async () => {
  const a = abierto();
  await userEvent.click(a.boton);
  await userEvent.click(screen.getByRole("option", { name: /Economía/ }));
  expect(a.onCambiar).not.toHaveBeenCalled();
  await userEvent.click(a.boton);
  await userEvent.click(screen.getByRole("option", { name: /Química/ }));
  expect(a.onCambiar).toHaveBeenCalledWith("a2");
  expect(screen.queryByRole("listbox")).toBeNull();
});

it("selector_works_with_keyboard_and_escape_returns_focus", async () => {
  const a = abierto();
  a.boton.focus();
  await userEvent.keyboard("{Enter}");
  expect(screen.getByRole("option", { name: /Economía/ })).toHaveFocus();
  await userEvent.keyboard("{ArrowDown}{Enter}");
  expect(a.onCambiar).toHaveBeenCalledWith("a2");
  await userEvent.click(a.boton);
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(a.boton).toHaveFocus();
});

it("single_subject_shows_plain_name", () => {
  render(<AppHeader asignatura="Economía" asignaturaId="a1" asignaturas={SUBJECTS.slice(0, 1)} ruta="panal" />);
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.getByText("Economía")).toBeInTheDocument();
});

it("elegirAsignatura_uses_the_saved_one_or_falls_back_to_the_first", () => {
  expect(elegirAsignatura(SUBJECTS)?.id).toBe("a1");
  localStorage.setItem("hexaprep.asignatura", "a2");
  expect(elegirAsignatura(SUBJECTS)?.id).toBe("a2");
  localStorage.setItem("hexaprep.asignatura", "borrada");
  expect(elegirAsignatura(SUBJECTS)?.id).toBe("a1");
});
