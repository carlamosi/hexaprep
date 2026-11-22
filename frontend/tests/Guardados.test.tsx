import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, type Guardado } from "../src/api";
import { BotonGuardar, olvidarGuardados } from "../src/components/BotonGuardar";
import { Explanation } from "../src/components/Explanation";
import { Guardados } from "../src/pages/Guardados";

const g = (o: Partial<Guardado> = {}): Guardado => ({ id: "g1", tipo: "ayuda", asignatura_id: "a", concepto_id: "c", titulo: "Paraules agudes", subtema: "Accentuació", tema: "Ortografia i accentuació", texto: "Regla de les agudes.", enunciado: null, fecha: "2026-11-22T10:00:00", ...o });
beforeEach(() => olvidarGuardados());
afterEach(() => vi.restoreAllMocks());

describe("botón Guardar", () => {
  it("guarda_y_al_pulsar_otra_vez_lo_quita", async () => {
    vi.spyOn(api, "guardados").mockResolvedValue([]);
    const guardar = vi.spyOn(api, "guardar").mockResolvedValue(g());
    const quitar = vi.spyOn(api, "quitarGuardado").mockResolvedValue({ ok: true });
    render(<BotonGuardar preguntaId="p1" tipo="ayuda" huella="Regla de les agudes." />);
    const b = await screen.findByRole("button", { name: /Guardar esta ayuda/ });
    await waitFor(() => expect(b).toBeEnabled());
    await userEvent.click(b);
    expect(guardar).toHaveBeenCalledWith("p1", "ayuda");
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardado" })).toHaveAttribute("aria-pressed", "true"));
    await userEvent.click(screen.getByRole("button", { name: "Guardado" }));
    expect(quitar).toHaveBeenCalledWith("g1");
    await waitFor(() => expect(screen.getByRole("button", { name: /Guardar esta ayuda/ })).toHaveAttribute("aria-pressed", "false"));
  });

  it("reconoce_lo_ya_guardado_por_su_texto", async () => {
    vi.spyOn(api, "guardados").mockResolvedValue([g({ tipo: "ejemplo", enunciado: "Escriu l'accent", texto: "Explicació" })]);
    render(<BotonGuardar preguntaId="p9" tipo="ejemplo" huella="Escriu l'accent" />);
    expect(await screen.findByRole("button", { name: "Guardado" })).toBeInTheDocument();
  });
});

describe("Explanation", () => {
  const result = { correcta: true, opcion_correcta: "a", trampa: null, explicacion: "Porque sí.", trampas: {}, fuente_id: "f", fuente_pagina: 3, fuente_cara: 3, percent: 10 } as never;
  it("no_ofrece_abrir_el_booklet_aunque_haya_fuente", () => {
    vi.spyOn(api, "guardados").mockResolvedValue([]);
    render(<Explanation result={result} onNext={() => {}} />);
    expect(screen.queryByText(/booklet/i)).toBeNull();
  });
  it("la_explicacion_se_puede_guardar", async () => {
    vi.spyOn(api, "guardados").mockResolvedValue([]);
    render(<Explanation result={result} preguntaId="p1" enunciado="Enunciat" onNext={() => {}} />);
    expect(await screen.findByRole("button", { name: /Guardar esta explicación/ })).toBeInTheDocument();
  });
});

describe("pantalla Guardados", () => {
  it("lista_filtra_y_quita", async () => {
    vi.spyOn(api, "guardados").mockResolvedValue([g(), g({ id: "g2", tipo: "ejemplo", titulo: "Hiats", enunciado: "Divideix en síl·labes", texto: "Hi-at" })]);
    const quitar = vi.spyOn(api, "quitarGuardado").mockResolvedValue({ ok: true });
    render(<Guardados asignaturaId="a" />);
    expect(await screen.findByRole("heading", { name: "Paraules agudes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hiats" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ejemplos" }));
    expect(screen.queryByRole("heading", { name: "Paraules agudes" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Quitar de guardados" }));
    expect(quitar).toHaveBeenCalledWith("g2");
    await waitFor(() => expect(screen.getByText(/Aún no has guardado nada/)).toBeInTheDocument());
  });
});
