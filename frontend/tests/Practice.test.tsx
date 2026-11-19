import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnswerResult, Question } from "../src/api";
import { Practice, respuestaValida, type PracticeClient } from "../src/components/Practice";

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

  it("sends_split_times_context_and_explanation_time_without_breaking_practice", async () => {
    const evento = vi.fn().mockRejectedValue(new Error("red")); // una señal que falla no debe afectar
    const client = {
      nextQuestion: vi.fn().mockResolvedValueOnce(Q).mockResolvedValueOnce({ ...Q, pregunta_id: "p2" }).mockResolvedValue(null),
      answer: vi.fn().mockResolvedValue(KO), reportQuestion: vi.fn(), evento,
    } satisfies PracticeClient;
    const user = userEvent.setup();
    render(<Practice sesionId="s1" client={client} />);
    await user.click(await screen.findByRole("button", { name: /Opción B: Texto A/ }));
    await waitFor(() => expect(client.answer).toHaveBeenCalled());
    const t = client.answer.mock.calls[0][0].tiempos;
    expect(Object.keys(t).sort()).toEqual(["t_activo", "t_envio", "t_oculto", "t_primer_clic", "t_sin_foco"]);
    expect(t.t_primer_clic).toBeLessThanOrEqual(t.t_envio);
    expect(evento).toHaveBeenCalledWith("s1", "contexto", null, expect.objectContaining({ tactil: expect.any(Boolean) }));
    await user.click(await screen.findByRole("button", { name: /Siguiente/ })); // pasa a la siguiente pregunta
    await waitFor(() => expect(evento).toHaveBeenCalledWith("s1", "explicacion_cerrada", "p1", { t: expect.any(Number) }));
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

  it("there_are_no_confidence_buttons_and_no_confidence_is_sent", async () => {
    const a = setup();
    await a.user.click(await screen.findByRole("button", { name: /Opción A: Texto C/ }));
    await waitFor(() => expect(a.client.answer).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Confianza/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Dudo" })).toBeNull();
    expect(a.client.answer.mock.calls[0][0].confianza).toBeUndefined();
  });

  function setupMenu(result: AnswerResult = OK) {
    const client = {
      nextQuestion: vi.fn().mockResolvedValueOnce(Q).mockResolvedValue(null),
      answer: vi.fn().mockResolvedValue(result), reportQuestion: vi.fn().mockResolvedValue({ ok: true }),
      facil: vi.fn().mockResolvedValue({ ok: true }), ocultar: vi.fn().mockResolvedValue({}), alternativa: vi.fn().mockResolvedValue({ ok: true }),
    } satisfies PracticeClient;
    render(<Practice sesionId="s1" client={client} onDone={vi.fn()} />);
    return { client, user: userEvent.setup() };
  }

  it("report_menu_mal_o_dudosa_marks_question", async () => {
    const a = setupMenu();
    await screen.findByText(Q.enunciado);
    await a.user.click(screen.getByText("Reportar"));
    await a.user.click(screen.getByRole("button", { name: "Está mal o dudosa" }));
    expect(a.client.reportQuestion).toHaveBeenCalledWith("p1", "Está mal o dudosa", "s1");
    expect(await screen.findByText(/Pregunta reportada/)).toBeInTheDocument();
  });

  it("report_menu_facil_only_notes_it_and_keeps_the_question", async () => {
    const a = setupMenu();
    await screen.findByText(Q.enunciado);
    await a.user.click(screen.getByText("Reportar"));
    await a.user.click(screen.getByRole("button", { name: "Demasiado fácil u obvia" }));
    expect(a.client.facil).toHaveBeenCalledWith("p1", "s1");
    expect(await screen.findByText("Anotado. Gracias.")).toBeInTheDocument();
    expect(screen.getByText(Q.enunciado)).toBeInTheDocument();
    expect(a.client.reportQuestion).not.toHaveBeenCalled();
  });

  it.each([["Solo esta pregunta", "pregunta"], ["Todo este concepto", "concepto"], ["Todo este tema", "tema"]])("report_menu_aun_no_lo_hemos_dado_%s", async (boton, alcance) => {
    const a = setupMenu();
    await screen.findByText(Q.enunciado);
    await a.user.click(screen.getByText("Reportar"));
    await a.user.click(screen.getByText("Aún no lo hemos dado"));
    await a.user.click(screen.getByRole("button", { name: boton }));
    expect(a.client.ocultar).toHaveBeenCalledWith("p1", alcance);
    expect(await screen.findByText(/No volverá a salir/)).toBeInTheDocument();
  });

  it("mi_respuesta_tambien_valia_saves_what_was_chosen_without_changing_the_grade", async () => {
    const a = setupMenu(KO);
    await a.user.click(await screen.findByRole("button", { name: /Opción B: Texto A/ }));
    await a.user.click(await screen.findByRole("button", { name: "Mi respuesta también valía" }));
    expect(a.client.alternativa).toHaveBeenCalledWith("p1", "Texto A");
    expect(await screen.findByText(/La nota no cambia/)).toBeInTheDocument();
    expect(screen.getByText(/confunde coste con precio/)).toBeInTheDocument(); // sigue marcado como fallo
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

  it("long_help_is_hidden_until_the_question_is_answered", async () => {
    const a = setup();
    await screen.findByText(Q.enunciado);
    expect(screen.queryByText(/Ayuda: entender el concepto/)).toBeNull(); // podría desvelar la respuesta
    await a.user.click(screen.getByRole("button", { name: /Texto A/ }));
    expect(await screen.findByText(/Ayuda: entender el concepto/)).toBeInTheDocument();
  });

  it("long_help_shown_on_demand", async () => {
    const a = setup();
    await screen.findByText(Q.enunciado);
    await a.user.click(screen.getByRole("button", { name: /Texto A/ }));
    const summary = await screen.findByText(/Ayuda: entender el concepto/);
    expect(summary.closest("details")).not.toHaveAttribute("open");
    await a.user.click(summary);
    expect(screen.getByText("Ayuda larga de prueba")).toBeVisible();
  });

  async function responderConRelojFalso(a: ReturnType<typeof setup>, ms: number, antes?: () => Promise<void> | void) {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      fireEvent.click(screen.getByRole("button", { name: /Opción B: Texto A/ }));
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      await antes?.();
      await act(async () => { vi.advanceTimersByTime(ms); });
    } finally {
      vi.useRealTimers();
    }
  }

  it("a_correct_answer_moves_on_by_itself_at_3s_and_the_next_question_was_already_requested", async () => {
    const a = setup({}, OK);
    await screen.findByText(Q.enunciado);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      fireEvent.click(screen.getByRole("button", { name: /Opción B: Texto A/ }));
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(a.client.nextQuestion, "la siguiente se pide al recibir la corrección").toHaveBeenCalledTimes(2);
      await act(async () => { vi.advanceTimersByTime(2999); });
      expect(a.onDone, "a los 2,999 s aún no debe pasar").not.toHaveBeenCalled();
      expect(screen.getByRole("progressbar", { name: /Siguiente pregunta/ })).toBeInTheDocument();
      await act(async () => { vi.advanceTimersByTime(1); await Promise.resolve(); await Promise.resolve(); });
      expect(a.onDone, "a los 3 s pasa a la siguiente (que era null)").toHaveBeenCalled();
      expect(a.client.nextQuestion, "no se vuelve a pedir: se usa la ya pedida").toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("sends_the_load_latency_event_with_prefetch_and_skeleton_flags", async () => {
    const evento = vi.fn().mockResolvedValue({ ok: true });
    const client = {
      nextQuestion: vi.fn().mockResolvedValueOnce(Q).mockResolvedValueOnce({ ...Q, pregunta_id: "p2" }).mockResolvedValue(null),
      answer: vi.fn().mockResolvedValue(KO), reportQuestion: vi.fn(), evento,
    } satisfies PracticeClient;
    const user = userEvent.setup();
    render(<Practice sesionId="s1" client={client} />);
    await user.click(await screen.findByRole("button", { name: /Opción B: Texto A/ }));
    await user.click(await screen.findByRole("button", { name: /Siguiente/ }));
    await waitFor(() => expect(evento).toHaveBeenCalledWith("s1", "carga", "p2", expect.objectContaining({ prefetch: true, esqueleto: false, t_resp_ms: expect.any(Number) })));
    expect(evento).toHaveBeenCalledWith("s1", "carga", "p1", expect.objectContaining({ prefetch: false, esqueleto: true }));
  });

  it("a_wrong_answer_never_moves_on_by_itself", async () => {
    const a = setup({}, KO);
    await screen.findByText(Q.enunciado);
    await responderConRelojFalso(a, 60000);
    expect(a.onDone).not.toHaveBeenCalled();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("opening_the_explanation_cancels_the_auto_advance_even_after_a_correct_answer", async () => {
    const evento = vi.fn().mockResolvedValue({ ok: true });
    const client = {
      nextQuestion: vi.fn().mockResolvedValueOnce(Q).mockResolvedValue(null),
      answer: vi.fn().mockResolvedValue(OK), reportQuestion: vi.fn(), evento,
    } satisfies PracticeClient;
    const onDone = vi.fn();
    render(<Practice sesionId="s1" client={client} onDone={onDone} />);
    await screen.findByText(Q.enunciado);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      fireEvent.click(screen.getByRole("button", { name: /Opción B: Texto A/ }));
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      fireEvent.click(screen.getByText("Ver explicación"));
      await act(async () => { vi.advanceTimersByTime(10); }); // jsdom entrega «toggle» en un temporizador
      await act(async () => { vi.advanceTimersByTime(10000); });
    } finally {
      vi.useRealTimers();
    }
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(evento).toHaveBeenCalledWith("s1", "explicacion_abierta", "p1", {});
  });

  it("shows_a_skeleton_never_the_loading_text_when_the_next_question_is_slow", async () => {
    let soltar: (q: Question) => void = () => {};
    const client = {
      nextQuestion: vi.fn().mockResolvedValueOnce(Q).mockReturnValueOnce(new Promise<Question>((r) => { soltar = r; })),
      answer: vi.fn().mockResolvedValue(KO), reportQuestion: vi.fn(),
    } satisfies PracticeClient;
    const user = userEvent.setup();
    render(<Practice sesionId="s1" client={client} />);
    await user.click(await screen.findByRole("button", { name: /Opción B: Texto A/ }));
    await user.click(await screen.findByRole("button", { name: /Siguiente/ }));
    expect(screen.queryByText("Cargando")).toBeNull();
    expect(screen.getByTestId("esqueleto")).toBeInTheDocument();
    soltar({ ...Q, pregunta_id: "p2", enunciado: "Otra pregunta" });
    expect(await screen.findByText("Otra pregunta")).toBeInTheDocument();
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
    expect(await screen.findByRole("alert")).toHaveTextContent("solo números o fracciones");
    expect(a.client.answer).not.toHaveBeenCalled();
  });

  it("wrong_problem_waits_and_lo_he_hecho_bien_marks_it_correct", async () => {
    const a = setupProblem(RES_KO);
    await a.user.type(await screen.findByLabelText(/Tu respuesta/), "5{Enter}");
    expect(await screen.findByText("2", { selector: "strong" })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 3200)); // más que el avance automático
    expect(a.client.nextQuestion, "un problema fallado no pide la siguiente hasta marcarlo").toHaveBeenCalledTimes(1);
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

describe("respuesta con fracciones y varios valores", () => {
  it.each(["2", "2,5", "-3/4", "−3", "1; 4", "1 y 4", "1/2; -3; 0,25", "6,022e23"])("accepts %s", (v) => expect(respuestaValida(v)).toBe(true));
  it.each(["", "dos", "1/0", "1/", "x=3", "1;2;3;4;5;6;7", "1,,2"])("rejects %s", (v) => expect(respuestaValida(v)).toBe(false));

  it("sends the list as typed and shows every solution when wrong", async () => {
    const PR2: Question = { ...Q, pregunta_id: "p7", tipo: "problema", opciones: [], orden: [], enunciado: "Resuelve x^2-5x+4=0" };
    const client = {
      nextQuestion: vi.fn().mockResolvedValueOnce(PR2).mockResolvedValue(null),
      answer: vi.fn().mockResolvedValue({ ...KO, trampa: null, solucion: [1, 4] }),
      reportQuestion: vi.fn(),
    } satisfies PracticeClient;
    render(<Practice sesionId="s1" client={client} />);
    await userEvent.type(await screen.findByLabelText(/Tu respuesta/), "1/2; 4{Enter}");
    await waitFor(() => expect(client.answer.mock.calls[0][0].respuesta).toBe("1/2; 4"));
    expect(await screen.findByText("1; 4", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Casi. Compara con la solución y revisa tus pasos:")).toBeInTheDocument();
  });
});

describe("saltar, imagen y problemas con apartados", () => {
  function conSkip(q: Question, siguientes: (Question | null)[] = [null]) {
    const nextQuestion = vi.fn().mockResolvedValueOnce(q);
    for (const n of siguientes) nextQuestion.mockResolvedValueOnce(n);
    const client = {
      nextQuestion, answer: vi.fn().mockResolvedValue(OK), reportQuestion: vi.fn(), skip: vi.fn().mockResolvedValue({ ok: true }),
    } satisfies PracticeClient;
    const onDone = vi.fn();
    render(<Practice sesionId="s1" client={client} onDone={onDone} />);
    return { client, onDone, user: userEvent.setup() };
  }

  it("skip_button_and_key_s_skip_without_answering_and_load_the_next_question", async () => {
    const a = conSkip(Q, [{ ...Q, pregunta_id: "p2", enunciado: "Otra pregunta" }, null]);
    await a.user.click(await screen.findByRole("button", { name: "Saltar" }));
    expect(a.client.skip).toHaveBeenCalledWith("s1", "p1");
    expect(a.client.answer).not.toHaveBeenCalled();
    expect(await screen.findByText("Otra pregunta")).toBeInTheDocument();
    await a.user.keyboard("s");
    await waitFor(() => expect(a.client.skip).toHaveBeenCalledWith("s1", "p2"));
    await waitFor(() => expect(a.onDone).toHaveBeenCalled());
  });

  it("skip_is_not_offered_once_the_question_is_answered", async () => {
    const a = conSkip(Q);
    await a.user.click(await screen.findByRole("button", { name: /Opción B: Texto A/ }));
    await screen.findByText("Ver explicación");
    expect(screen.queryByRole("button", { name: "Saltar" })).toBeNull();
    await a.user.keyboard("s");
    expect(a.client.skip).not.toHaveBeenCalled();
  });

  it("shows_the_image_with_a_generic_alt_that_does_not_give_the_answer_away", async () => {
    conSkip({ ...Q, imagen: "pictogrames/corrosiu.png", enunciado: "Quin pictograma és aquest?" });
    const img = await screen.findByRole("img", { name: "Imagen de la pregunta" });
    expect(img).toHaveAttribute("src", "/api/imagen/pictogrames/corrosiu.png");
  });

  it("shows_the_common_statement_and_the_part_letter", async () => {
    conSkip({ ...Q, tipo: "problema", opciones: [], orden: [], grupo: "g1", apartado: "b", contexto: "Tenim 5 g de CuCl₂", enunciado: "Calcula els àtoms de clor" });
    expect(await screen.findByText("Enunciado común")).toBeInTheDocument();
    expect(screen.getByText("Tenim 5 g de CuCl₂")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("b) Calcula els àtoms de clor");
  });
});
