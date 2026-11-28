import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Question } from "../src/api";
import { Practice, type PracticeClient } from "../src/components/Practice";
import { setLang } from "../src/i18n";
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

describe("flujo de la escrita", () => {
  beforeEach(() => setLang("ca"));
  afterEach(() => setLang("es"));
  const E: Question = { ...mk("e1"), tipo: "escrita", campos: ["Resposta"], opciones: [], orden: [], enunciado: "Escriu «ta_a»" };
  const KO = { correcta: false, opcion_correcta: "a", trampa: null, explicacion: "", trampas: {}, fuente_id: "f1", fuente_pagina: 1, fuente_cara: 1, percent: 5,
    campos: [{ etiqueta: "Resposta", correcto: false, esperado: ["taula"], nota: null }] };
  function montar() {
    const c = {
      nextQuestion: vi.fn().mockResolvedValueOnce(E).mockResolvedValue(mk("otra")), answer: vi.fn().mockResolvedValue(KO),
      reportQuestion: vi.fn(), markCorrect: vi.fn().mockResolvedValue({ percent: 9 }),
    } satisfies PracticeClient;
    render(<Practice sesionId="s9" client={c} />);
    return { c, user: userEvent.setup() };
  }

  it("comprobar_vacio_no_envia_y_pide_escribir_algo", async () => {
    const { c, user } = montar();
    await screen.findByLabelText("Resposta");
    await user.click(screen.getByRole("button", { name: /Comprov/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/lletra/i);
    expect(c.answer).not.toHaveBeenCalled();
  });

  it("continuar_sense_copiar_passa_a_la_seguent_pregunta", async () => {
    const { c, user } = montar();
    await user.type(await screen.findByLabelText("Resposta"), "tala{Enter}");
    await user.click(await screen.findByRole("button", { name: /sense copiar/i }));
    expect(await screen.findByText("Enunciado otra")).toBeInTheDocument();
    expect(c.nextQuestion).toHaveBeenCalledTimes(2); // la inicial y la precargada al responder (se reutiliza)
  });

  it("error_de_teclat_compta_com_a_bona_i_passa_a_la_seguent", async () => {
    const { c, user } = montar();
    await user.type(await screen.findByLabelText("Resposta"), "tala{Enter}");
    await user.click(await screen.findByRole("button", { name: /error de teclat/i }));
    expect(c.markCorrect).toHaveBeenCalledWith("s9", "e1");
    expect(await screen.findByText("Enunciado otra")).toBeInTheDocument();
  });
});
