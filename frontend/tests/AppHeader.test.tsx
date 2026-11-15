import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AppHeader } from "../src/components/AppHeader";
import { elegirAsignatura } from "../src/hooks";

const SUBJECTS = [
  { id: "a1", nombre: "Economía", idioma: "es", color: "#1", acento: "#1", percent: 0 },
  { id: "a2", nombre: "Química", idioma: "ca", color: "#2", acento: "#2", percent: 0 },
];

afterEach(() => localStorage.clear());

it("subject_selector_appears_with_two_subjects_and_reports_the_change", async () => {
  const onCambiar = vi.fn();
  render(<AppHeader asignatura="Economía" asignaturaId="a1" asignaturas={SUBJECTS} onCambiarAsignatura={onCambiar} ruta="panal" />);
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Asignatura" }), "a2");
  expect(onCambiar).toHaveBeenCalledWith("a2");
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
