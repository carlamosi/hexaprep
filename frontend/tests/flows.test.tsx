import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnswerResult, MapResponse, Question, Suggestion } from "../src/api";
import { FreePractice } from "../src/pages/FreePractice";
import { Review } from "../src/pages/Review";
import { Subtopic } from "../src/pages/Subtopic";
import { Suggestions } from "../src/pages/Suggestions";

const q = (i: number): Question => ({
  pregunta_id: `p${i}`, concepto_id: "c1", subtema_id: "s1", enunciado: `Pregunta ${i}`,
  opciones: (["a", "b", "c", "d"] as const).map((l) => ({ letra: l, texto: `Opción ${l}` })),
  orden: ["a", "b", "c", "d"], dificultad: 3, ayuda_larga: null, fuente_id: "f1", fuente_pagina: 2, fuente_cara: 2,
});

const RES: AnswerResult = {
  correcta: true, opcion_correcta: "a", trampa: null, explicacion: "Explicación", trampas: {},
  fuente_id: "f1", fuente_pagina: 2, fuente_cara: 2, percent: 50,
};

const MAP: MapResponse = {
  asignatura: "Economía", percent: 37,
  hexes: [{ concepto_id: "c1", nombre: "Coste de oportunidad", subtema_id: "s1", subtema: "Cómo decidimos", tema: "T1", tema_id: "t1", color: "#B05A8F", percent: 37 }],
  subtemas: [{ id: "s1", nombre: "Cómo decidimos", percent: 37 }],
};

function fakeClient(n: number, answer: Partial<AnswerResult> = {}) {
  const nextQuestion = vi.fn();
  for (let i = 1; i <= n; i++) nextQuestion.mockResolvedValueOnce(q(i));
  nextQuestion.mockResolvedValue(null);
  return {
    createSession: vi.fn().mockResolvedValue({ sesion_id: "s1", aviso: null }),
    nextQuestion,
    answer: vi.fn().mockResolvedValue({ ...RES, ...answer }),
    reportQuestion: vi.fn().mockResolvedValue({ ok: true }),
    getMap: vi.fn().mockResolvedValue(MAP),
    suggestions: vi.fn(),
  };
}

beforeEach(() => localStorage.clear());

describe("flujos", () => {
  it("subtopic_drill_has_no_batch_limit", async () => {
    const client = fakeClient(20);
    const user = userEvent.setup();
    render(<Subtopic asignaturaId="a1" subtemaId="s1" client={client} onBack={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Cómo decidimos" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Practicar este subtema" }));
    for (let i = 1; i <= 20; i++) {
      await screen.findByText(`Pregunta ${i}`);
      await user.keyboard("a");
      await screen.findByText("Ver explicación");
      await user.keyboard("{Enter}");
    }
    await screen.findByText(/Sin fallos/);
    expect(client.createSession).toHaveBeenCalledWith("repaso_subtema", { asignatura_id: "a1", subtema_id: "s1" });
    expect(client.nextQuestion).toHaveBeenCalledTimes(21); // 20 preguntas y la que dice que ya no quedan
  }, 20000); // son 20 preguntas con teclado simulado: solo tarda unos 3 s, pero con la suite en paralelo se acercaba al límite de 5 s

  it("review_groups_failures_by_trap_with_booklet_link", () => {
    const fallos = [
      { pregunta_id: "p1", enunciado: "Pregunta uno", trampa: "confunde coste con precio", fuente_id: "f1", fuente_pagina: 3, fuente_cara: 2 },
      { pregunta_id: "p2", enunciado: "Pregunta dos", trampa: "confunde coste con precio", fuente_id: "f1", fuente_pagina: 3, fuente_cara: 2 },
      { pregunta_id: "p3", enunciado: "Pregunta tres", trampa: "ignora el análisis marginal", fuente_id: "f1", fuente_pagina: 8, fuente_cara: 5 },
    ];
    render(<Review fallos={fallos} />);
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveTextContent("confunde coste con precio");
    expect(groups[0]).toHaveTextContent("2 fallos");
    expect(groups[0]).toHaveTextContent("Pregunta uno");
    expect(groups[1]).toHaveTextContent("1 fallo");
    expect(screen.getByRole("button", { name: /Abrir el booklet en la página 3/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Abrir el booklet en la página 8/ })).toBeInTheDocument();
  });

  it("review_without_failures_has_neutral_message", () => {
    render(<Review fallos={[]} />);
    expect(screen.getByText(/Sin fallos/)).toBeInTheDocument();
  });

  it("suggestions_page_lists_concepts_with_reason", async () => {
    const lista: Suggestion[] = [
      { tipo: "concepto", concepto_id: "c1", concepto: "Análisis marginal", subtema_id: "s1", motivo: "Hace tiempo que no lo repasas y se te puede olvidar", ganancia_por_minuto: 3, riesgo_olvido: 0.5, score: 0.9 },
      { tipo: "concepto", concepto_id: "c2", concepto: "Costes hundidos", subtema_id: "s1", motivo: "Aún tienes pocos datos de este concepto", ganancia_por_minuto: 2, riesgo_olvido: 0.1, score: 0.4 },
    ];
    const client = { suggestions: vi.fn().mockResolvedValue(lista) };
    const onPractice = vi.fn();
    const user = userEvent.setup();
    render(<Suggestions client={client} onPracticeSubtema={onPractice} />);
    expect(await screen.findByText("Análisis marginal")).toBeInTheDocument();
    expect(screen.getByText("Hace tiempo que no lo repasas y se te puede olvidar")).toBeInTheDocument();
    expect(screen.getByText("Costes hundidos")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Practicar su subtema" })[0]);
    expect(onPractice).toHaveBeenCalledWith("s1");
  });

  it("suggestions_without_history_say_to_practice_first", async () => {
    render(<Suggestions client={{ suggestions: vi.fn().mockResolvedValue([]) }} onPracticeSubtema={vi.fn()} />);
    expect(await screen.findByText(/practica un rato/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("reanudar una sesión interrumpida", () => {
  it("practice_resumes_the_saved_session_instead_of_starting_again", async () => {
    localStorage.setItem("hexaprep.sesion.practica.a1", "vieja");
    const client = { ...fakeClient(10), getSession: vi.fn().mockResolvedValue({ sesion_id: "vieja", respondidas: ["p1", "p2", "p3", "p4", "p5"] }) };
    render(<FreePractice asignaturaId="a1" client={client} onFinish={vi.fn()} />);
    expect(await screen.findByText("5 respondidas")).toBeInTheDocument();
    expect(client.getSession).toHaveBeenCalledWith("vieja");
    expect(client.createSession).not.toHaveBeenCalled();
  });

  it("practice_starts_a_new_session_when_the_saved_one_no_longer_exists", async () => {
    localStorage.setItem("hexaprep.sesion.practica.a1", "borrada");
    const client = { ...fakeClient(3), getSession: vi.fn().mockRejectedValue(new Error("Sesión desconocida")) };
    render(<FreePractice asignaturaId="a1" client={client} onFinish={vi.fn()} />);
    expect(await screen.findByText("0 respondidas")).toBeInTheDocument();
    expect(client.createSession).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("hexaprep.sesion.practica.a1")).toBe("s1");
  });

  it("each_theme_and_type_keeps_its_own_saved_session_and_sends_its_filter", async () => {
    const client = fakeClient(2);
    render(<FreePractice asignaturaId="a1" temaId="t7" tipos="problemas" client={client} onFinish={vi.fn()} />);
    await screen.findByText("Pregunta 1");
    expect(client.createSession).toHaveBeenCalledWith("practica", { asignatura_id: "a1", tema_id: "t7", tipos: ["problema"] });
    expect(localStorage.getItem("hexaprep.sesion.practica.a1.t7.problemas")).toBe("s1");
  });

  it("the test_button_asks_for_test_and_true_false_together", async () => {
    const client = fakeClient(1);
    render(<FreePractice asignaturaId="a1" tipos="test" client={client} onFinish={vi.fn()} />);
    await screen.findByText("Pregunta 1");
    expect(client.createSession).toHaveBeenCalledWith("practica", { asignatura_id: "a1", tipos: ["test", "vf"] });
  });
});

describe("fin de sesión", () => {
  it("muestra_lo_trabajado_con_hexagonos_y_los_errores_con_su_respuesta", async () => {
    const { Resumen } = await import("../src/pages/Resumen");
    const client = { resumenSesion: vi.fn().mockResolvedValue({ respondidas: 8, aciertos: 6, tiempo_activo_s: 300, percent_asignatura: 12,
      conceptos: [{ concepto_id: "c1", nombre: "Gerundi", tema: "Verbs", percent_antes: 10, percent_despues: 25 }, { concepto_id: "c2", nombre: "Hiats", tema: "Accents", percent_antes: 5, percent_despues: 5 }] }) };
    render(<Resumen sesionId="s1" client={client} onVolver={vi.fn()} onSeguir={vi.fn()}
      fallos={[{ pregunta_id: "p1", enunciado: "Escriu el gerundi", trampa: null, fuente_id: null, fuente_pagina: null, fuente_cara: null }]} />);
    expect(await screen.findByText("Has subido 1 concepto en esta sesión")).toBeInTheDocument();
    expect(screen.getByText(/8 preguntas · 5 min de tiempo activo · 75 % de acierto/)).toBeInTheDocument();
    expect(screen.getByText("Gerundi")).toBeInTheDocument();
    expect(screen.getByText("Escriu el gerundi")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir practicando" })).toBeInTheDocument();
    expect(screen.getByText(/repaso corto antes de dormir/)).toBeInTheDocument();
  });
});
