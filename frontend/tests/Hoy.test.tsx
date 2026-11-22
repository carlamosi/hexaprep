import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Examen as ExamenDatos, Suggestion } from "../src/api";
import { Suggestions } from "../src/pages/Suggestions";

const LISTA: Suggestion[] = [
  { tipo: "concepto", concepto_id: "c1", concepto: "Casos especials de dièresi", subtema_id: "s1", motivo: "Hace tiempo que no lo repasas y se te puede olvidar", ganancia_por_minuto: 17, riesgo_olvido: 0.42, score: 0.9, razon: "olvido" },
  { tipo: "concepto", concepto_id: "c2", concepto: "Substantius masculins i femenins", subtema_id: "s2", motivo: "x", ganancia_por_minuto: 16.4, riesgo_olvido: 0.4, score: 0.8, razon: "olvido" },
  { tipo: "concepto", concepto_id: "c3", concepto: "Adjectius invariables i variables", subtema_id: "s3", motivo: "y", ganancia_por_minuto: 19.8, riesgo_olvido: 0.19, score: 0.5, razon: "pocos_datos" },
];
const SIN: ExamenDatos = { fecha: null, dias: null, por_dia: null, total: 77, tocados: 10, sin_tocar: 67 };
const CON: ExamenDatos = { fecha: "2026-12-12", dias: 20, por_dia: 3, total: 77, tocados: 36, sin_tocar: 41 };
const HEXES = [{ concepto_id: "c", nombre: "n", subtema_id: "s", subtema: "S", tema: "Verbs irregulars", tema_id: "t1", color: "#000", percent: 0 }];

function cliente(examen: ExamenDatos = SIN, foco: string | null = null) {
  return {
    suggestions: vi.fn().mockResolvedValue(LISTA),
    getExamen: vi.fn().mockResolvedValue(examen), setExamen: vi.fn().mockResolvedValue(examen),
    getMap: vi.fn().mockResolvedValue({ asignatura: "X", percent: 0, subtemas: [], hexes: HEXES }),
    getFoco: vi.fn().mockResolvedValue({ tema_id: foco }), setFoco: vi.fn().mockResolvedValue({ tema_id: foco }),
  };
}

describe("Hoy: empieza por aquí", () => {
  it("la_primera_sugerencia_es_la_accion_principal_y_el_resto_una_lista_que_tambien_practica", async () => {
    const onPractice = vi.fn();
    const user = userEvent.setup();
    render(<Suggestions client={cliente()} asignaturaId="a1" onPracticeSubtema={onPractice} />);
    const hero = await screen.findByRole("region", { name: "Empieza por aquí" });
    expect(within(hero).getByRole("heading", { name: "Casos especials de dièresi" })).toBeInTheDocument();
    expect(within(hero).getByText("Se te puede olvidar")).toBeInTheDocument();
    expect(within(hero).getByText("42 %")).toBeInTheDocument();
    await user.click(within(hero).getByRole("button", { name: "Practicar ahora" }));
    expect(onPractice).toHaveBeenLastCalledWith("s1");

    const despues = screen.getByRole("region", { name: "Después" });
    expect(within(despues).getAllByRole("button")).toHaveLength(2);
    expect(despues).toHaveTextContent("Se te puede olvidar, olvido 40 %");
    expect(despues).toHaveTextContent("Pocos datos, olvido 19 %");
    await user.click(within(despues).getByRole("button", { name: /Adjectius invariables/ }));
    expect(onPractice).toHaveBeenLastCalledWith("s3");
  });

  it("el_subtitulo_cuenta_los_conceptos_y_con_una_sola_sugerencia_no_hay_despues", async () => {
    const c = { ...cliente(), suggestions: vi.fn().mockResolvedValue(LISTA.slice(0, 1)) };
    render(<Suggestions client={c} asignaturaId="a1" onPracticeSubtema={vi.fn()} />);
    expect(await screen.findByText("1 concepto que conviene repasar.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Después" })).toBeNull();
  });

  it("sin_sugerencias_explica_que_aqui_aparecera_y_enlaza_al_panal", async () => {
    render(<Suggestions client={{ suggestions: vi.fn().mockResolvedValue([]) }} onPracticeSubtema={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Aquí aparecerá qué repasar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al panal" })).toHaveAttribute("href", "#panal");
  });
});

describe("Hoy: tu plan", () => {
  it("las_filas_resumen_examen_y_tema_sin_ponerlos_y_con_ellos_puestos", async () => {
    const { unmount } = render(<Suggestions client={cliente()} asignaturaId="a1" onPracticeSubtema={vi.fn()} />);
    const plan = await screen.findByRole("region", { name: "Tu plan" });
    expect(await within(plan).findByText(/Sin fecha/)).toBeInTheDocument();
    expect(within(plan).getByText(/Ninguno/)).toBeInTheDocument();
    unmount();
    render(<Suggestions client={cliente(CON, "t1")} asignaturaId="a1" onPracticeSubtema={vi.fn()} />);
    const plan2 = await screen.findByRole("region", { name: "Tu plan" });
    expect(await within(plan2).findByText("Examen, 12 de diciembre")).toBeInTheDocument();
    expect(plan2).toHaveTextContent("Faltan 20 días");
    expect(await within(plan2).findByText("Tema en curso: Verbs irregulars")).toBeInTheDocument();
  });

  it("tocar_una_fila_abre_la_hoja_con_examen_y_tema_y_escape_la_cierra_devolviendo_el_foco", async () => {
    const c = cliente();
    const user = userEvent.setup();
    render(<Suggestions client={c} asignaturaId="a1" onPracticeSubtema={vi.fn()} />);
    const fila = await screen.findByRole("button", { name: /^Examen/ });
    await user.click(fila);
    const hoja = screen.getByRole("dialog", { name: "Tu plan" });
    expect(await within(hoja).findByRole("button", { name: "Poner fecha de examen" })).toBeInTheDocument();
    expect(within(hoja).getByRole("button", { name: "Cerrar" })).toHaveFocus(); // el foco entra en la hoja
    await user.selectOptions(await within(hoja).findByLabelText("Tema en curso (opcional)"), "t1");
    expect(c.setFoco).toHaveBeenCalledWith("a1", "t1");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fila).toHaveFocus();
  });
});
