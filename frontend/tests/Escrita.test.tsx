import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AnswerResult, Question } from "../src/api";
import { insertar } from "../src/components/Escrita";
import { Practice, type PracticeClient } from "../src/components/Practice";

const Q: Question = {
  pregunta_id: "p1", concepto_id: "c1", subtema_id: "s1", tipo: "escrita", campos: ["Gerundi", "Participi"],
  enunciado: "Escriu el gerundi i el participi del verb «admetre».", opciones: [], orden: [], dificultad: 3,
  ayuda_larga: "Regla general", fuente_id: "f1", fuente_pagina: 6, fuente_cara: 10,
};
const KO: AnswerResult = {
  correcta: false, opcion_correcta: "a", trampa: null, explicacion: "Explicació", trampas: {}, fuente_id: "f1",
  fuente_pagina: 6, fuente_cara: 10, percent: 10,
  campos: [{ etiqueta: "Gerundi", correcto: true, esperado: ["admetent"], nota: null },
           { etiqueta: "Participi", correcto: false, esperado: ["admès"], nota: "Compte: el participi no és «admetut»." }],
};

function setup(result: AnswerResult = KO) {
  const client = {
    nextQuestion: vi.fn().mockResolvedValueOnce(Q).mockResolvedValue(null),
    answer: vi.fn().mockResolvedValue(result), reportQuestion: vi.fn(),
  } satisfies PracticeClient;
  render(<Practice sesionId="s1" client={client} />);
  return { client, user: userEvent.setup() };
}

describe("pregunta escrita", () => {
  it("insertar_pone_el_caracter_en_el_cursor", () => {
    expect(insertar("ades", 3, 3, "è")).toEqual({ valor: "adeès", cursor: 4 });
    expect(insertar("pomes", 0, 5, "l·l")).toEqual({ valor: "l·l", cursor: 3 });
  });

  it("envia_un_texto_por_hueco_con_la_barra_de_letras_y_Enter_pasa_al_siguiente", async () => {
    const { client, user } = setup();
    const gerundi = await screen.findByLabelText("Gerundi");
    await user.type(gerundi, "admetent{Enter}");
    expect(screen.getByLabelText("Participi")).toHaveFocus();
    await user.type(screen.getByLabelText("Participi"), "adm");
    await user.click(screen.getByRole("button", { name: "è" }));
    await user.click(screen.getByRole("button", { name: "Comprobar" }));
    expect(client.answer).toHaveBeenCalledWith(expect.objectContaining({ respuestas: ["admetent", "admè"], elegida: "a" }));
  });

  it("no_envia_con_un_hueco_vacio", async () => {
    const { client, user } = setup();
    await user.type(await screen.findByLabelText("Gerundi"), "admetent");
    await user.click(screen.getByRole("button", { name: "Comprobar" }));
    expect(client.answer).not.toHaveBeenCalled();
  });

  it("al_fallar_muestra_la_forma_correcta_y_la_pista_y_no_avanza_sola", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { client, user } = setup();
    await user.type(await screen.findByLabelText("Gerundi"), "admetent");
    await user.type(screen.getByLabelText("Participi"), "admetut");
    await user.click(screen.getByRole("button", { name: "Comprobar" }));
    expect(await screen.findByText("admès")).toBeInTheDocument();
    expect(screen.getByText(/no és «admetut»/)).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(5000);
    expect(client.nextQuestion).toHaveBeenCalledTimes(1); // sigue en la misma pregunta hasta pulsar «Siguiente»
    vi.useRealTimers();
  });
});

describe("pregunta escrita: corrección letra a letra", () => {
  it("al_fallar_marca_donde_esta_la_diferencia_en_cada_hueco_fallado", async () => {
    const { user } = setup();
    await user.type(await screen.findByLabelText("Gerundi"), "admetent");
    await user.type(screen.getByLabelText("Participi"), "admes");
    await user.click(screen.getByRole("button", { name: "Comprobar" }));
    const dif = await screen.findByLabelText(/Escribiste admes, lo correcto es admès/);
    expect(dif).toBeInTheDocument();
    expect(screen.queryByLabelText(/Escribiste admetent/)).toBeNull(); // el hueco acertado no lleva diferencia
  });
});
