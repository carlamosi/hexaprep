import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Question } from "../src/api";
import { Practice, type PracticeClient } from "../src/components/Practice";
import { guardarPregunta, guardarRuta, rutaGuardada } from "../src/session";

const mk = (id: string): Question => ({
  pregunta_id: id, concepto_id: "c1", subtema_id: "s1", tipo: "test", enunciado: `Enunciado ${id}`,
  opciones: [{ letra: "a", texto: "Uno" }, { letra: "b", texto: "Dos" }], orden: ["a", "b"], dificultad: 3,
  ayuda_larga: null, fuente_id: "f1", fuente_pagina: 1, fuente_cara: 1,
});

function client(pendiente: string | null) {
  return {
    nextQuestion: vi.fn().mockResolvedValue(mk("nueva")), answer: vi.fn(), reportQuestion: vi.fn(),
    getSession: vi.fn().mockResolvedValue({ sesion_id: "s1", modo: "practica", filtro: {}, respondidas: [], pendiente: pendiente }),
  } satisfies PracticeClient;
}

beforeEach(() => localStorage.clear());

describe("reanudar tras cerrar la app", () => {
  it("muestra_la_misma_pregunta_si_sigue_pendiente_en_el_servidor", async () => {
    guardarPregunta("s1", mk("vieja"));
    const c = client("vieja");
    render(<Practice sesionId="s1" client={c} />);
    expect(await screen.findByText("Enunciado vieja")).toBeInTheDocument();
    expect(c.nextQuestion).not.toHaveBeenCalled();
  });

  it("pide_otra_si_la_guardada_ya_no_esta_pendiente", async () => {
    guardarPregunta("s1", mk("vieja"));
    render(<Practice sesionId="s1" client={client(null)} />);
    expect(await screen.findByText("Enunciado nueva")).toBeInTheDocument();
  });

  it("terminar_sesion_esta_en_la_pregunta_y_tras_responder", async () => {
    const onTerminar = vi.fn();
    render(<Practice sesionId="s1" client={client(null)} onTerminar={onTerminar} />);
    await userEvent.setup().click(await screen.findByRole("button", { name: /Terminar sesión/ }));
    expect(onTerminar).toHaveBeenCalledOnce();
  });

  it("la_ruta_de_practica_se_guarda_y_se_borra", () => {
    guardarRuta("practica/_/test");
    expect(rutaGuardada()).toBe("practica/_/test");
    guardarRuta(null);
    expect(rutaGuardada()).toBeNull();
  });
});
