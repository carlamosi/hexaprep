import { colorTema } from "../src/colorTema";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/api";
import type { Analytics, BackupRow, Hex, MapResponse, QuestionContent } from "../src/api";
import { Columnas } from "../src/components/historial/Barras";
import { conclusionesMas, datosTema, estado, lineas, mejorGrupo, olvidoProximo, ordenPanal, pendientes, semanasActividad, titularDominio, titularMueve } from "../src/components/historial/datos";
import { Editor } from "../src/components/Editor";
import { History } from "../src/pages/History";
import { Settings } from "../src/pages/Settings";

const hex = (tema_id: string, tema: string, subtema_id: string, subtema: string, concepto_id: string): Hex => ({
  concepto_id, nombre: concepto_id, subtema_id, subtema, tema, tema_id, color: "#000", percent: 30,
});
// El mapa ordena T1 antes que T2; la analítica los devuelve al revés a propósito.
const MAP: MapResponse = {
  asignatura: "Economía", percent: 40, subtemas: [],
  hexes: [hex("t1", "Decisiones", "s1", "La escasez", "c1"), hex("t1", "Decisiones", "s2", "Cómo decidimos", "c2"), hex("t2", "Sistemas", "s3", "Mercado", "c3")],
};

function analytics(over: Partial<Analytics["resumen"]> = {}): Analytics {
  const g = (n: number, p: number | null) => ({ n, aciertos_pct: p });
  return {
    resumen: { respondidas: 120, aciertos_pct: 55, dias_estudiados: 9, tiempo_medio_s: 12.5, mejor_hora: 20, sesiones: 7, dominio_pct: 48, dominio_delta: 6, ...over },
    conceptos: [], olvido: { dias: [], umbral: 70, ya_bajo: 0, cruzan_7: 0, cruzan_14: 0, temas: [], cruces: [] },
    actividad: [{ fecha: "2026-11-03", n: 20, aciertos: 10 }, { fecha: "2026-11-10", n: 5, aciertos: 4 }],
    evolucion: {
      asignatura: [{ fecha: "2026-11-03", percent: 40 }, { fecha: "2026-11-10", percent: 46 }],
      temas: [
        { tema_id: "t2", tema: "Sistemas", puntos: [{ fecha: "2026-11-03", percent: 20 }, { fecha: "2026-11-10", percent: 30 }],
          subtemas: [{ subtema_id: "s3", subtema: "Mercado", puntos: [{ fecha: "2026-11-10", percent: 30 }] }] },
        { tema_id: "t1", tema: "Decisiones", puntos: [{ fecha: "2026-11-03", percent: 50 }, { fecha: "2026-11-10", percent: 60 }],
          subtemas: [
            { subtema_id: "s2", subtema: "Cómo decidimos", puntos: [{ fecha: "2026-11-10", percent: 55 }] },
            { subtema_id: "s1", subtema: "La escasez", puntos: [{ fecha: "2026-11-03", percent: 50 }, { fecha: "2026-11-10", percent: 65 }] },
          ] },
      ],
    },
    confianza: [{ confianza: "seguro", ...g(60, 70) }, { confianza: "dudo", ...g(40, 45) }, { confianza: "adivino", ...g(3, 33) }, { confianza: "sin", ...g(0, null) }],
    horas: Array.from({ length: 24 }, (_, hora) => ({ hora, ...(hora === 20 ? g(50, 70) : hora === 9 ? g(2, 50) : g(0, null)) })),
    semana: Array.from({ length: 7 }, (_, dia) => ({ dia, ...g(dia === 2 ? 30 : 10, dia === 2 ? 80 : 50) })),
    fatiga: [{ tramo: "1-5", desde: 1, ...g(60, 60), tiempo_medio_s: 12, ritmo: 1.2 }, { tramo: "6-10", desde: 6, ...g(40, 50), tiempo_medio_s: 11, ritmo: 0.9 }],
    velocidad: [{ tramo: "menos de 5 s", ...g(4, 25) }, { tramo: "5-10 s", ...g(80, 55) }],
    dificultad: [1, 2, 3, 4, 5].map((dificultad) => ({ dificultad, ...g(24, 70 - dificultad * 5) })),
    trampas: [{ trampa: "confunde escasez con pobreza", n: 4, concepto: "La escasez" }],
    debiles: [{ concepto_id: "c1", concepto: "Coste de oportunidad", subtema: "Cómo decidimos", percent: 12, ...g(3, 33) }],
    dificiles: [{ pregunta_id: "p1", enunciado: "¿Qué es la escasez?", n: 4, fallos: 3 }],
    sesiones_recientes: [{ sesion_id: "x", modo: "practica", inicio: "2026-11-10T18:00:00+00:00", duracion_s: 600, n: 20, aciertos: 12 }],
  };
}

const vacio = (): Analytics => ({
  ...analytics({ respondidas: 0, aciertos_pct: null, dias_estudiados: 0, tiempo_medio_s: null, mejor_hora: null, sesiones: 0, dominio_delta: 0 }),
  actividad: [], evolucion: { asignatura: [], temas: [] }, trampas: [], debiles: [], dificiles: [], sesiones_recientes: [],
});

const client = (a: Analytics = analytics()) => ({ analytics: vi.fn().mockResolvedValue(a), getMap: vi.fn().mockResolvedValue(MAP) });

describe("historial: agregados de presentación", () => {
  it("estado distingue sin datos, pocos datos y normal", () => {
    expect(estado(0)).toBe("vacio");
    expect(estado(6)).toBe("pocos");
    expect(estado(30)).toBe("normal");
  });

  it("activity_heatmap_scales_intensity_and_marks_future_days_without_streaks", () => {
    const grid = semanasActividad([{ fecha: "2026-11-03", n: 20, aciertos: 10 }, { fecha: "2026-11-10", n: 5, aciertos: 4 }], new Date(2026, 10, 12), 2);
    expect(grid).toHaveLength(2);
    expect(grid[0][0].fecha).toBe("2026-11-02"); // las semanas empiezan en lunes
    const dias = grid.flat();
    expect(dias.find((d) => d.fecha === "2026-11-03")!.nivel).toBe(4);
    expect(dias.find((d) => d.fecha === "2026-11-10")!.nivel).toBe(1);
    expect(dias.find((d) => d.fecha === "2026-11-04")!.nivel).toBe(0);
    expect(dias.filter((d) => d.futura).map((d) => d.fecha)).toEqual(["2026-11-13", "2026-11-14", "2026-11-15"]);
  });

  it("evolution_lines_follow_the_honeycomb_order_and_colors", () => {
    const orden = ordenPanal(MAP.hexes);
    const evo = analytics().evolucion;
    expect(lineas(evo, { nivel: "asignatura" }, orden)).toHaveLength(1);
    const temas = lineas(evo, { nivel: "temas" }, orden);
    expect(temas.map((l) => l.nombre)).toEqual(["Decisiones", "Sistemas"]);
    expect(temas.map((l) => l.color)).toEqual([colorTema("#000", 0, 2), colorTema("#000", 1, 2)]); // el color sale de la asignatura
    const subs = lineas(evo, { nivel: "subtemas", temaId: "t1" }, orden);
    expect(subs.map((l) => l.nombre)).toEqual(["La escasez", "Cómo decidimos"]);
    expect(subs[0].color).toBe(colorTema("#000", 0, 2));
    expect(subs[1].color).toContain(colorTema("#000", 0, 2)); // un tono del color del tema
    expect(subs[1].trazo).toBeDefined(); // y un trazo distinto: no depende solo del color
  });

  it("best_group_ignores_groups_with_too_few_answers", () => {
    expect(mejorGrupo([{ n: 2, aciertos_pct: 100 }, { n: 10, aciertos_pct: 60 }])).toEqual({ n: 10, aciertos_pct: 60 });
  });
});

describe("historial A: titulares y datos del tema", () => {
  it("el_titular_del_dominio_dice_cuanto_subes_en_el_periodo", () => {
    expect(titularDominio(6, 7)).toBe("Subes 6 puntos esta semana");
    expect(titularDominio(1, 30)).toBe("Subes 1 punto este mes");
    expect(titularDominio(-3, 0)).toBe("Bajas 3 puntos desde que empezaste");
    expect(titularDominio(0, 7)).toBe("Sin cambios esta semana");
  });

  it("el_titular_de_movimientos_cuenta_quien_sube_baja_o_se_estanca", () => {
    const p = (...d: number[]) => d.map((delta, i) => ({ id: String(i), nombre: "x", color: "#000", antes: 0, ahora: delta, delta, desde: "a", hasta: "b" }));
    expect(titularMueve(p(14, 12, 9, 1, -2))).toBe("3 temas suben y 2 se estancan");
    expect(titularMueve(p(10, -6, 0))).toBe("1 tema sube, 1 baja y 1 se estanca");
    expect(titularMueve(p(2, 1))).toBe("2 temas se estancan");
    expect(titularMueve(p(7))).toBe("1 tema sube");
    expect(titularMueve([])).toBe("");
  });

  it("olvido_proximo_ordena_los_temas_por_lo_que_recordaras_en_7_dias", () => {
    const o = { dias: [0, 7, 21], umbral: 70, ya_bajo: 0, cruzan_7: 0, cruzan_14: 0, cruces: [], temas: [
      { tema_id: "t2", tema: "Sistemas", n: 2, curva: [95, 92, 88] }, { tema_id: "t1", tema: "T1 Decisiones", n: 3, curva: [90, 66, 60] }] };
    expect(olvidoProximo(o)).toEqual([
      { id: "t1", nombre: "Decisiones", ahora: 90, d7: 66, cruza: true }, { id: "t2", nombre: "Sistemas", ahora: 95, d7: 92, cruza: false }]);
  });

  it("datos_del_tema_reune_evolucion_olvido_trampa_y_concepto_debil", () => {
    const a = analytics();
    a.conceptos = [{ concepto_id: "c1", concepto: "La escasez", subtema: "La escasez", n: 6, aciertos_pct: 40, ritmo: 1.2 }];
    a.olvido = { dias: [0, 7, 21], umbral: 70, ya_bajo: 0, cruzan_7: 1, cruzan_14: 0, temas: [{ tema_id: "t1", tema: "Decisiones", n: 2, curva: [90, 80, 60] }],
      cruces: [{ concepto_id: "c1", concepto: "La escasez", tema: "Decisiones", dia: 12 }, { concepto_id: "c2", concepto: "Otro", tema: "Sistemas", dia: 3 }] };
    const d = datosTema(a, "t1")!;
    expect(d).toMatchObject({ nombre: "Decisiones", ahora: 60, delta: 10, cruce: 12, recuerda: true });
    expect(d.puntos).toHaveLength(2);
    expect(d.trampa).toEqual({ trampa: "confunde escasez con pobreza", n: 4 });
    expect(d.debil).toEqual({ concepto: "Coste de oportunidad", percent: 12 });
    expect(datosTema(a, "t2")).toMatchObject({ cruce: 3, recuerda: false, trampa: null, debil: null });
    expect(datosTema(a, "nada")).toBeNull();
  });

  it("las_conclusiones_de_mas_analisis_salen_de_los_datos", () => {
    const c = conclusionesMas(analytics(), pendientes(analytics().evolucion, ordenPanal(MAP.hexes)));
    expect(c.dificultad).toBe("Aciertas el 65 % en el nivel 1 y el 45 % en el nivel 5");
    expect(c.horas).toBe("Tu mejor hora son las 20:00");
    expect(c.semana).toBe("Rindes mejor el miércoles");
    expect(c.debiles).toBe("Coste de oportunidad, con el 12 %");
    expect(c.trampas).toBe("confunde escasez con pobreza, 4 veces");
  });
});

describe("historial: pantalla", () => {
  it("shows_the_summary_and_every_analysis_section", async () => {
    const c = client();
    render(<History asignaturaId="a1" client={c} mes="2026-11-12" />);
    expect(await screen.findByRole("heading", { name: "Historial", level: 1 })).toBeInTheDocument();
    expect(c.analytics).toHaveBeenCalledWith("a1", 0);
    const resumen = screen.getByRole("region", { name: "Resumen del periodo" });
    expect(within(resumen).getByText("120")).toBeInTheDocument();
    expect(within(resumen).getByRole("heading", { level: 2, name: "Subes 6 puntos desde que empezaste" })).toBeInTheDocument();
    expect(within(screen.getByRole("heading", { name: "Más cifras" }).closest("details")!).getByText("20:00")).toBeInTheDocument();
    for (const h of [/^Practicaste 2 de los últimos \d+ días$/, "Evolución del dominio", "Acierto por hora del día", "Acierto por día de la semana",
      "Fatiga dentro de la sesión", "Velocidad y acierto", "Acierto por dificultad", "Trampas en las que más caes", "Conceptos más débiles",
      "Preguntas que más fallas", "Sesiones recientes"]) {
      expect(screen.getByRole("heading", { name: h })).toBeInTheDocument();
    }
    expect(screen.getByRole("img", { name: /^Actividad: .*2 días con práctica, 25 respuestas/ })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Qué se mueve" })).toHaveTextContent("2 temas suben");
    expect(screen.queryByRole("heading", { name: "Calibración de la confianza" })).toBeNull(); // ya no se marca confianza
    expect(screen.getByText("confunde escasez con pobreza")).toBeInTheDocument();
    expect(screen.queryByText(/racha/i)).toBeNull();
    expect(screen.queryByRole("note")).toBeNull();
  }, 15000); // renderiza todas las secciones del análisis: con la suite en paralelo se acercaba al límite de 5 s

  it("marks_groups_with_few_answers_without_relying_on_color", async () => {
    const { container } = render(<History asignaturaId="a1" client={client()} mes="2026-11-12" />);
    await screen.findByRole("heading", { name: "Velocidad y acierto" });
    // «menos de 5 s» tiene 4 respuestas: rayada y con aviso escrito
    expect(container.querySelectorAll(".hp-bar.is-low")).toHaveLength(1);
    expect(screen.getAllByText(/n 4 · pocos datos/).length).toBeGreaterThan(0);
  });

  it("range_filter_refetches_and_view_selector_switches_series", async () => {
    const c = client();
    const user = userEvent.setup();
    render(<History asignaturaId="a1" client={c} mes="2026-11-12" />);
    await screen.findByRole("heading", { name: "Evolución del dominio" });
    await user.click(screen.getByRole("button", { name: "7 días" }));
    expect(c.analytics).toHaveBeenLastCalledWith("a1", 7);
    expect(screen.getByRole("button", { name: "7 días" })).toHaveAttribute("aria-pressed", "true");

    expect(screen.queryByRole("list", { name: "Leyenda" })).toBeNull(); // una sola serie: sin leyenda
    await user.click(screen.getByRole("button", { name: "Temas" }));
    let leyenda = await screen.findByRole("list", { name: "Leyenda" });
    expect(within(leyenda).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Decisiones60 %", "Sistemas30 %"]);
    await user.click(screen.getByRole("button", { name: "Subtemas" }));
    await user.click(within(screen.getByRole("group", { name: "Tema" })).getByRole("button", { name: "Sistemas" }));
    expect(screen.queryByRole("list", { name: "Leyenda" })).toBeNull();
    await user.click(within(screen.getByRole("group", { name: "Tema" })).getByRole("button", { name: "Decisiones" }));
    leyenda = screen.getByRole("list", { name: "Leyenda" });
    expect(within(leyenda).getByText("La escasez")).toBeInTheDocument();
  });

  it("low_data_state_is_honest_but_complete", async () => {
    render(<History asignaturaId="a1" client={client(analytics({ respondidas: 6, mejor_hora: null }))} mes="2026-11-12" />);
    const nota = await screen.findByRole("note");
    expect(nota).toHaveTextContent("6 respuestas.");
    expect(nota).toHaveTextContent(/menos de 5 respuestas/);
    expect(screen.getByText("Aún no")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Acierto por dificultad" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Estás empezando" })).toBeInTheDocument(); // y la cabecera no presume de una conclusión
    expect(screen.queryByRole("heading", { name: /^Subes/ })).toBeNull();
  });

  it("tocar_un_tema_abre_su_historia_y_escape_la_cierra_devolviendo_el_foco", async () => {
    const a = analytics();
    a.conceptos = [{ concepto_id: "c1", concepto: "La escasez", subtema: "La escasez", n: 6, aciertos_pct: 40, ritmo: 1.2 }];
    a.olvido = { dias: [0, 7, 21], umbral: 70, ya_bajo: 0, cruzan_7: 1, cruzan_14: 0, temas: [{ tema_id: "t1", tema: "Decisiones", n: 2, curva: [90, 80, 60] }],
      cruces: [{ concepto_id: "c1", concepto: "La escasez", tema: "Decisiones", dia: 12 }] };
    const user = userEvent.setup();
    render(<History asignaturaId="a1" client={client(a)} mes="2026-11-12" />);
    const mueve = await screen.findByRole("region", { name: "Qué se mueve" });
    const fila = within(mueve).getByRole("button", { name: /^Decisiones/ });
    await user.click(fila);
    const dlg = screen.getByRole("dialog", { name: "Decisiones" });
    expect(dlg).toHaveTextContent("Dominio 60 %, 10 puntos más");
    expect(dlg).toHaveTextContent("Bajará del 70 % en 12 días");
    expect(dlg).toHaveTextContent("confunde escasez con pobreza, 4 veces");
    expect(within(dlg).getByRole("button", { name: "Cerrar" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fila).toHaveFocus();
  });

  it("que_repasar_enseña_los_temas_que_mas_olvidaras_y_se_oculta_sin_curva", async () => {
    const a = analytics();
    a.olvido = { dias: [0, 7, 21], umbral: 70, ya_bajo: 0, cruzan_7: 1, cruzan_14: 0, cruces: [], temas: [
      { tema_id: "t1", tema: "Decisiones", n: 2, curva: [90, 66, 60] }, { tema_id: "t2", tema: "Sistemas", n: 2, curva: [95, 92, 88] }] };
    const { unmount } = render(<History asignaturaId="a1" client={client(a)} mes="2026-11-12" />);
    const r = await screen.findByRole("region", { name: "Qué repasar" });
    expect(within(r).getByRole("heading", { name: "En 7 días 1 concepto bajará del 70 %" })).toBeInTheDocument();
    expect(r).toHaveTextContent(/Decisiones.*90 % hoy, 66 % en 7 días/);
    unmount();
    render(<History asignaturaId="a1" client={client()} mes="2026-11-12" />);
    await screen.findByRole("region", { name: "Qué se mueve" });
    expect(screen.queryByRole("region", { name: "Qué repasar" })).toBeNull();
  });

  it("empty_state_without_answers_and_shortcut_to_full_history", async () => {
    const c = client(vacio());
    const user = userEvent.setup();
    render(<History asignaturaId="a1" client={c} />);
    expect(await screen.findByRole("heading", { name: "Todavía no hay respuestas" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Lo que verás aquí" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "30 días" }));
    expect(await screen.findByRole("heading", { name: "Sin respuestas en este periodo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver todo el historial" }));
    expect(c.analytics).toHaveBeenLastCalledWith("a1", 0);
  });

  it("shows_an_error_when_analytics_fail", async () => {
    render(<History asignaturaId="a1" client={{ analytics: vi.fn().mockRejectedValue(new Error("x")), getMap: vi.fn().mockResolvedValue(MAP) }} />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("columns_can_be_read_with_the_keyboard", async () => {
    const user = userEvent.setup();
    render(<Columnas titulo="Por día" filas={[
      { id: "a", etiqueta: "lunes", n: 10, valor: 50 }, { id: "b", etiqueta: "martes", n: 0, valor: null }, { id: "c", etiqueta: "miércoles", n: 8, valor: 75 },
    ]} />);
    const chart = screen.getByRole("img", { name: /Por día\. lunes: 50\s%, 10 respuestas/ });
    await user.tab();
    expect(chart).toHaveFocus();
    expect(screen.getByText(/^miércoles: 75\s%, 8 respuestas$/)).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}"); // salta el martes, sin datos
    expect(screen.getByText(/^lunes: 50\s%, 10 respuestas$/)).toBeInTheDocument();
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

  it("online_sin_copias_de_archivo_oculta_la_seccion_de_copia_de_seguridad", async () => {
    const c = client({ getBackup: vi.fn().mockRejectedValue(new ApiError(501, "No disponible online")) });
    render(<Settings asignaturaId="a1" client={c} />);
    await waitFor(() => expect(c.getBackup).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Copia de seguridad" })).toBeNull());
    expect(screen.queryByRole("heading", { name: "Exportar datos" })).toBeNull(); // online tampoco hay exportaciones de archivo
    expect(screen.getByRole("heading", { name: "Preguntas reportadas" })).toBeInTheDocument();
  });

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

describe("fallos clicables", () => {
  it("las_trampas_muestran_siempre_la_pregunta_y_su_respuesta_correcta_y_nada_de_lo_respondido", async () => {
    const { Trampas } = await import("../src/components/historial/Listas");
    const { Respuesta } = await import("../src/components/historial/Respuesta");
    const q = { pregunta_id: "p9", enunciado: "¿Qué es la escasez?", opciones: [{ texto: "Pobreza" }, { texto: "Recursos limitados" }], correcta: "b", explicacion: "Porque sí.", version: 1, excluida: false, ayuda_larga: "", dificultad: 3, fuente_pagina: 1, fuente_cara: 1 };
    const cargar = vi.fn().mockResolvedValue(q);
    render(<Trampas cargar={cargar} trampas={[{ trampa: "confunde escasez con pobreza", n: 4, concepto: "La escasez", pregunta_id: "p9" }]} />);
    expect(await screen.findByText("¿Qué es la escasez?")).toBeInTheDocument(); // sin pulsar nada
    expect(screen.getByText("Recursos limitados")).toBeInTheDocument();
    expect(screen.queryByText("Pobreza")).toBeNull();
    expect(screen.queryByText("Porque sí.")).toBeNull(); // en trampas solo pregunta y respuesta
    render(<Respuesta preguntaId="p9" cargar={cargar} />);
    expect(await screen.findByText("Porque sí.")).toBeInTheDocument(); // la vista completa sigue con explicación
  });
});

describe("errores de escritura por tipo", () => {
  it("lista_cada_tipo_con_su_recuento", async () => {
    const { ErroresEscritura } = await import("../src/components/historial/Listas");
    render(<ErroresEscritura errores={[{ tipo: "apertura", n: 5 }, { tipo: "letra_cambiada", n: 1 }]} />);
    expect(screen.getByText("Apertura de la vocal (é por è, ó por ò)")).toBeInTheDocument();
    expect(screen.getByText(/Letra cambiada/)).toBeInTheDocument();
  });
});

describe("retención real", () => {
  it("muestra_el_acierto_en_repasos_tras_1_y_7_dias", async () => {
    const a = analytics({ retencion: { d1: { n: 20, pct: 70 }, d7: { n: 5, pct: 60 } } } as never);
    render(<History asignaturaId="a1" client={{ analytics: vi.fn().mockResolvedValue(a), getMap: vi.fn().mockResolvedValue({ asignatura: "X", percent: 0, hexes: [], subtemas: [] }) }} />);
    expect(await screen.findByText("Retención real")).toBeInTheDocument();
    expect(screen.getByText("70 % · 60 %")).toBeInTheDocument();
  });
});
