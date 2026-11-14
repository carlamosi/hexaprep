import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BackupRow, History as HistoryData, QuestionContent } from "../src/api";
import { Calendar } from "../src/components/Calendar";
import { Charts } from "../src/components/Charts";
import { Editor } from "../src/components/Editor";
import { History } from "../src/pages/History";
import { Settings } from "../src/pages/Settings";

const EVOLUCION: HistoryData["evolucion"] = [
  { subtema_id: "s1", subtema: "Cómo decidimos", puntos: [{ fecha: "2026-11-03", percent: 20 }, { fecha: "2026-11-10", percent: 45 }, { fecha: "2026-11-12", percent: 60 }] },
  { subtema_id: "s2", subtema: "La escasez", puntos: [{ fecha: "2026-11-10", percent: 30 }] },
];

describe("historial", () => {
  it("calendar_marks_studied_days_without_streaks", () => {
    render(<Calendar dias={["2026-11-03", "2026-11-10"]} mes="2026-11" />);
    expect(screen.getByText("noviembre de 2026")).toBeInTheDocument();
    expect(screen.getByLabelText("3 de noviembre, estudiado")).toBeInTheDocument();
    expect(screen.getByLabelText("10 de noviembre, estudiado")).toBeInTheDocument();
    expect(screen.getByLabelText("4 de noviembre")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/estudiado/)).toHaveLength(2);
    expect(screen.queryByText(/racha/i)).toBeNull();
  });

  it("calendar navigates between months", async () => {
    const user = userEvent.setup();
    render(<Calendar dias={["2026-10-30"]} mes="2026-11" />);
    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByText("octubre de 2026")).toBeInTheDocument();
    expect(screen.getByLabelText("30 de octubre, estudiado")).toBeInTheDocument();
  });

  it("chart_shows_mastery_evolution_per_subtopic", () => {
    const { container } = render(<Charts evolucion={EVOLUCION} />);
    const lines = container.querySelectorAll("polyline");
    expect(lines).toHaveLength(1); // solo hay línea con 2 o más puntos
    expect(lines[0].getAttribute("points")!.trim().split(/\s+/)).toHaveLength(3);
    expect(container.querySelectorAll("circle")).toHaveLength(4); // un punto por dato
    const legend = screen.getByRole("list", { name: "Subtemas" });
    expect(within(legend).getByText("Cómo decidimos")).toBeInTheDocument();
    expect(within(legend).getByText("60 %")).toBeInTheDocument();
    expect(within(legend).getByText("La escasez")).toBeInTheDocument();
  });

  it("history page loads days and evolution", async () => {
    const client = { history: vi.fn().mockResolvedValue({ dias: ["2026-11-03"], evolucion: EVOLUCION }) };
    render(<History client={client} mes="2026-11" />);
    expect(await screen.findByLabelText("3 de noviembre, estudiado")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Subtemas" })).toBeInTheDocument();
  });
});

const CONTENT: QuestionContent = {
  pregunta_id: "p1", version: 1, excluida: true, enunciado: "Enunciado original",
  opciones: [{ texto: "Correcta" }, { texto: "Mala B", trampa: "confunde B" }, { texto: "Mala C", trampa: "confunde C" }, { texto: "Mala D", trampa: "confunde D" }],
  correcta: "a", explicacion: "Explicación original", ayuda_larga: "Ayuda original", dificultad: 3, fuente_pagina: 3, fuente_cara: 2,
};

describe("editor de preguntas", () => {
  it("editor_saves_new_version_and_exports", async () => {
    const client = {
      getQuestion: vi.fn().mockResolvedValue(CONTENT),
      editQuestion: vi.fn().mockResolvedValue({ version: 2 }),
      exportBank: vi.fn().mockResolvedValue({ ruta: "C:/data/exports/banco.json" }),
    };
    const user = userEvent.setup();
    render(<Editor preguntaId="p1" asignaturaId="a1" client={client} />);
    const enunciado = await screen.findByLabelText("Enunciado");
    await user.clear(enunciado);
    await user.type(enunciado, "Enunciado corregido");
    await user.click(screen.getByRole("button", { name: "Guardar como versión nueva" }));
    expect(client.editQuestion).toHaveBeenCalledWith("p1", { enunciado: "Enunciado corregido" });
    expect(await screen.findByText("Versión 2 guardada")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Exportar banco" }));
    expect(client.exportBank).toHaveBeenCalledWith("a1");
    expect(await screen.findByText(/C:\/data\/exports\/banco\.json/)).toBeInTheDocument();
  });

  it("editor can reinstate a reported question", async () => {
    const client = { getQuestion: vi.fn().mockResolvedValue(CONTENT), editQuestion: vi.fn().mockResolvedValue({ version: 2 }), exportBank: vi.fn() };
    const user = userEvent.setup();
    render(<Editor preguntaId="p1" asignaturaId="a1" client={client} />);
    await user.click(await screen.findByLabelText("Volver a incluirla en las estadísticas"));
    await user.click(screen.getByRole("button", { name: "Guardar como versión nueva" }));
    expect(client.editQuestion).toHaveBeenCalledWith("p1", { excluida: false });
    expect(await screen.findByText(/incluida de nuevo/)).toBeInTheDocument();
  });

  it("editor shows the API error when the edit is invalid", async () => {
    const client = {
      getQuestion: vi.fn().mockResolvedValue({ ...CONTENT, excluida: false }),
      editQuestion: vi.fn().mockRejectedValue(Object.assign(new Error("enunciado: guion largo"), { status: 422 })),
      exportBank: vi.fn(),
    };
    const user = userEvent.setup();
    render(<Editor preguntaId="p1" asignaturaId="a1" client={client} />);
    const enunciado = await screen.findByLabelText("Enunciado");
    await user.type(enunciado, " x");
    await user.click(screen.getByRole("button", { name: "Guardar como versión nueva" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("enunciado: guion largo");
  });
});

describe("ajustes", () => {
  const BACKUP: BackupRow = { ruta: "C:/data/backups/viejo.db", verificada: true, n_eventos: 12, fecha: "2026-11-01T10:00:00" };

  function client(over = {}) {
    return {
      getBackup: vi.fn().mockResolvedValue(BACKUP),
      makeBackup: vi.fn().mockResolvedValue({ ruta: "C:/data/backups/nuevo.db", verificada: true, n_eventos: 15, fecha: "2026-11-14T09:00:00" }),
      restoreBackup: vi.fn().mockResolvedValue({ ok: true }),
      exportWeak: vi.fn().mockResolvedValue({ ruta: "C:/data/exports/weak.json" }),
      exportEvents: vi.fn().mockResolvedValue({ ruta: "C:/data/exports/eventos.csv" }),
      exportBank: vi.fn(),
      reportedQuestions: vi.fn().mockResolvedValue([]),
      getQuestion: vi.fn(),
      editQuestion: vi.fn(),
      ...over,
    };
  }

  it("settings_triggers_backup_and_shows_last_one", async () => {
    const c = client();
    const user = userEvent.setup();
    render(<Settings asignaturaId="a1" client={c} />);
    expect(await screen.findByText(/viejo\.db/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hacer copia ahora" }));
    expect(c.makeBackup).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/nuevo\.db/)).toBeInTheDocument();
    expect(screen.queryByText(/viejo\.db/)).toBeNull();
  });

  it("settings_restore_asks_for_confirmation_first", async () => {
    const c = client();
    const user = userEvent.setup();
    render(<Settings asignaturaId="a1" client={c} />);
    await user.click(await screen.findByRole("button", { name: "Restaurar esta copia" }));
    expect(c.restoreBackup).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/reemplaza/i);
    await user.click(screen.getByRole("button", { name: "Sí, restaurar" }));
    await waitFor(() => expect(c.restoreBackup).toHaveBeenCalledWith("C:/data/backups/viejo.db"));
  });

  it("settings_exports_weak_json_and_events_csv", async () => {
    const c = client();
    const user = userEvent.setup();
    render(<Settings asignaturaId="a1" client={c} />);
    await user.click(await screen.findByRole("button", { name: "Exportar weak.json" }));
    expect(c.exportWeak).toHaveBeenCalledWith(20);
    expect(await screen.findByText(/weak\.json/, { selector: "p" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Exportar eventos (CSV)" }));
    expect(c.exportEvents).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/eventos\.csv/)).toBeInTheDocument();
  });

  it("settings lists reported questions and opens the editor", async () => {
    const c = client({
      reportedQuestions: vi.fn().mockResolvedValue([{ pregunta_id: "p1", enunciado: "Enunciado reportado", motivo: "Está mal formulada" }]),
      getQuestion: vi.fn().mockResolvedValue(CONTENT),
    });
    const user = userEvent.setup();
    render(<Settings asignaturaId="a1" client={c} />);
    expect(await screen.findByText("Enunciado reportado")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(await screen.findByLabelText("Enunciado")).toHaveValue("Enunciado original");
  });

  it("settings shows the interface language with Catalan prepared but not active", async () => {
    render(<Settings asignaturaId="a1" client={client()} />);
    const select = await screen.findByLabelText("Idioma de la interfaz");
    expect(within(select).getByRole("option", { name: "Castellano" })).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: /Catalán/ })).toBeDisabled();
  });
});
