import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnswerResult, Question } from "../src/api";
import { Practice, type PracticeClient } from "../src/components/Practice";

const Q: Question = {
  pregunta_id: "p1", concepto_id: "c1", subtema_id: "s1",
  enunciado: "¿Qué es el coste de oportunidad?",
  opciones: [
    { letra: "c", texto: "Texto C" }, { letra: "a", texto: "Texto A" },
    { letra: "d", texto: "Texto D" }, { letra: "b", texto: "Texto B" },
  ],
  orden: ["c", "a", "d", "b"], dificultad: 3, ayuda_larga: "Ayuda larga de prueba",
  fuente_id: "f1", fuente_pagina: 3, fuente_cara: 2,
};

const OK: AnswerResult = {
  correcta: true, opcion_correcta: "a", trampa: null, explicacion: "Explicación de prueba",
  trampas: { c: "confunde coste con precio" }, fuente_id: "f1", fuente_pagina: 3, fuente_cara: 2, percent: 62,
};
const KO: AnswerResult = { ...OK, correcta: false, trampa: "confunde coste con precio", opcion_correcta: "a" };

function setup(over: Partial<Question> = {}, result: AnswerResult = OK) {
  const client = {
    nextQuestion: vi.fn().mockResolvedValueOnce({ ...Q, ...over }).mockResolvedValue(null),
    answer: vi.fn().mockResolvedValue(result),
    reportQuestion: vi.fn().mockResolvedValue({ ok: true }),
  } satisfies PracticeClient;
  const onDone = vi.fn();
  const user = userEvent.setup();
  render(<Practice sesionId="s1" client={client} onDone={onDone} />);
  return { client, onDone, user };
}

afterEach(() => vi.unstubAllGlobals());

describe("pantalla de práctica", () => {
  it("answers_with_keys_a_to_d_and_1_to_4", async () => {
    const a = setup();
    await screen.findByText(Q.enunciado);
    await a.user.keyboard("b"); // B = segunda opción mostrada = letra original «a»
    await waitFor(() => expect(a.client.answer).toHaveBeenCalledTimes(1));
    expect(a.client.answer.mock.calls[0][0]).toMatchObject({ sesion_id: "s1", pregunta_id: "p1", elegida: "a" });
    expect(a.client.answer.mock.calls[0][0].orden_opciones).toEqual(["c", "a", "d", "b"]);
  });

  it("answers_with_number_keys", async () => {
    const a = setup();
    await screen.findByText(Q.enunciado);
    await a.user.keyboard("3"); // 3 = tercera opción mostrada = letra original «d»
    await waitFor(() => expect(a.client.answer).toHaveBeenCalled());
    expect(a.client.answer.mock.calls[0][0].elegida).toBe("d");
  });

  it("first_click_is_final", async () => {
    const a = setup({}, KO);
    await a.user.click(await screen.findByRole("button", { name: /Opción A: Texto C/ }));
    await screen.findByText(/confunde coste con precio/);
    await a.user.click(screen.getByRole("button", { name: /Opción B: Texto A/ }));
    await a.user.keyboard("d");
    expect(a.client.answer).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Opción B: Texto A/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("explanation_collapsed_by_default", async () => {
    const a = setup();
    await a.user.click(await screen.findByRole("button", { name: /Opción B: Texto A/ }));
    const summary = await screen.findByText("Ver explicación");
    const details = summary.closest("details")!;
    expect(details).not.toHaveAttribute("open");
    await a.user.click(summary);
    expect(details).toHaveAttribute("open");
    expect(screen.getByText("Explicación de prueba")).toBeVisible();
  });

  it("confidence_buttons_optional: se puede responder sin marcar confianza", async () => {
    const a = setup();
    await a.user.click(await screen.findByRole("button", { name: /Opción A: Texto C/ }));
    await waitFor(() => expect(a.client.answer).toHaveBeenCalledTimes(1));
    expect(a.client.answer.mock.calls[0][0].confianza ?? null).toBeNull();
  });

  it("confidence_buttons_optional: la confianza marcada antes se envía con la respuesta", async () => {
    const a = setup();
    await a.user.click(await screen.findByRole("button", { name: "Dudo" }));
    await a.user.click(screen.getByRole("button", { name: /Opción A: Texto C/ }));
    await waitFor(() => expect(a.client.answer).toHaveBeenCalled());
    expect(a.client.answer.mock.calls[0][0].confianza).toBe("dudo");
  });

  it("report_button_marks_question", async () => {
    const a = setup();
    await screen.findByText(Q.enunciado);
    await a.user.click(screen.getByText("Reportar"));
    await a.user.click(screen.getByRole("button", { name: "Está mal formulada" }));
    expect(a.client.reportQuestion).toHaveBeenCalledWith("p1", "Está mal formulada", "s1");
    expect(await screen.findByText(/Pregunta reportada/)).toBeInTheDocument();
  });

  it("invalid_latex_falls_back_to_plain_text", async () => {
    setup({ enunciado: "Calcula $\\frac{1}{$ y también $x^2$" });
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Calcula $\\frac{1}{$ y también");
    expect(heading.querySelector(".katex")).not.toBeNull(); // la fórmula válida sí se renderiza
  });

  it("missing_booklet_pdf_shows_clear_message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 404, json: async () => ({ detail: "No encuentro el PDF Economia_T1.pdf" }),
    }));
    const a = setup();
    await a.user.click(await screen.findByRole("button", { name: /Opción B: Texto A/ }));
    await a.user.click(await screen.findByRole("button", { name: /Abrir el booklet en la página 3/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No encuentro el PDF Economia_T1.pdf");
  });

  it("long_help_shown_on_demand", async () => {
    const a = setup();
    await screen.findByText(Q.enunciado);
    const summary = screen.getByText(/Ayuda: entender el concepto/);
    expect(summary.closest("details")).not.toHaveAttribute("open");
    await a.user.click(summary);
    expect(screen.getByText("Ayuda larga de prueba")).toBeVisible();
  });

  it.each([[OK, 1000], [KO, 2500]])("auto_advances_after_the_delay_of_the_result", async (result, ms) => {
    const a = setup({}, result);
    await screen.findByText(Q.enunciado);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      fireEvent.click(screen.getByRole("button", { name: /Opción B: Texto A/ }));
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      await act(async () => { vi.advanceTimersByTime(ms - 1); });
      expect(a.client.nextQuestion).toHaveBeenCalledTimes(1);
      await act(async () => { vi.advanceTimersByTime(1); });
      expect(a.client.nextQuestion).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("enter_goes_to_next_question_and_finishes_with_onDone", async () => {
    const a = setup();
    await a.user.click(await screen.findByRole("button", { name: /Opción B: Texto A/ }));
    await screen.findByText("Ver explicación");
    await a.user.keyboard("{Enter}");
    await waitFor(() => expect(a.onDone).toHaveBeenCalledTimes(1));
    expect(a.client.nextQuestion).toHaveBeenCalledTimes(2);
  });
});

describe("problemas numéricos y verdadero/falso", () => {
  const PR: Question = { ...Q, pregunta_id: "p9", tipo: "problema", opciones: [], orden: [], enunciado: "Quants mols són 36 g d'aigua?" };
  const RES_KO: AnswerResult = { ...KO, trampa: null, solucion: 2, opcion_correcta: "a" };
  function setupProblem(result: AnswerResult) {
    const client = {
      nextQuestion: vi.fn().mockResolvedValueOnce(PR).mockResolvedValue(null),
      answer: vi.fn().mockResolvedValue(result),
      reportQuestion: vi.fn(),
      markCorrect: vi.fn().mockResolvedValue({ percent: 70 }),
    } satisfies PracticeClient;
    render(<Practice sesionId="s1" client={client} onDone={vi.fn()} />);
    return { client, user: userEvent.setup() };
  }

  it("problem_sends_the_typed_number_and_shows_no_options", async () => {
    const a = setupProblem(OK);
    const input = await screen.findByLabelText(/Tu respuesta/);
    expect(screen.queryByRole("list", { name: "Opciones de respuesta" })).toBeNull();
    await a.user.type(input, "2,0");
    await a.user.click(screen.getByRole("button", { name: "Comprobar" }));
    await waitFor(() => expect(a.client.answer).toHaveBeenCalledTimes(1));
    expect(a.client.answer.mock.calls[0][0]).toMatchObject({ pregunta_id: "p9", respuesta: "2,0", orden_opciones: [] });
  });

  it("problem_rejects_text_without_calling_the_server", async () => {
    const a = setupProblem(OK);
    await a.user.type(await screen.findByLabelText(/Tu respuesta/), "dos mols{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("solo un número");
    expect(a.client.answer).not.toHaveBeenCalled();
  });

  it("wrong_problem_waits_and_lo_he_hecho_bien_marks_it_correct", async () => {
    const a = setupProblem(RES_KO);
    await a.user.type(await screen.findByLabelText(/Tu respuesta/), "5{Enter}");
    expect(await screen.findByText("2", { selector: "strong" })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 2700)); // más que el avance automático de un fallo
    expect(a.client.nextQuestion).toHaveBeenCalledTimes(1);
    await a.user.click(screen.getByRole("button", { name: "Lo he hecho bien" }));
    await waitFor(() => expect(a.client.markCorrect).toHaveBeenCalledWith("s1", "p9"));
    expect(await screen.findByText("Bien. Lo tienes.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lo he hecho bien" })).toBeNull();
  }, 10000);

  it("vf_with_two_options_answers_with_key_2", async () => {
    const VF: Question = { ...Q, pregunta_id: "p8", tipo: "vf", opciones: [{ letra: "b", texto: "Fals" }, { letra: "a", texto: "Vertader" }], orden: ["b", "a"] };
    const client = { nextQuestion: vi.fn().mockResolvedValueOnce(VF).mockResolvedValue(null), answer: vi.fn().mockResolvedValue(OK), reportQuestion: vi.fn() };
    render(<Practice sesionId="s1" client={client} />);
    await screen.findByText(/Vertader/);
    await userEvent.keyboard("2");
    await waitFor(() => expect(client.answer).toHaveBeenCalled());
    expect(client.answer.mock.calls[0][0]).toMatchObject({ elegida: "a", orden_opciones: ["b", "a"] });
  });
});
