import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Examen as ExamenDatos } from "../src/api";
import { Examen, type ExamenClient } from "../src/components/Examen";

const SIN: ExamenDatos = { fecha: null, dias: null, por_dia: null, total: 77, tocados: 10, sin_tocar: 67 };
const CON: ExamenDatos = { fecha: "2026-12-03", dias: 18, por_dia: 4, total: 77, tocados: 10, sin_tocar: 67 };

function cliente(datos: ExamenDatos): ExamenClient {
  return { getExamen: vi.fn().mockResolvedValue(datos), setExamen: vi.fn().mockResolvedValue(datos) };
}

describe("fecha de examen opcional", () => {
  it("sin_fecha_ofrece_ponerla_y_la_guarda", async () => {
    const c = cliente(SIN);
    const user = userEvent.setup();
    render(<Examen asignaturaId="a1" client={c} />);
    await user.click(await screen.findByRole("button", { name: "Poner fecha de examen" }));
    await user.type(screen.getByLabelText("Fecha del examen"), "2026-12-03");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(c.setExamen).toHaveBeenCalledWith("a1", "2026-12-03");
  });

  it("con_fecha_dice_los_dias_y_el_ritmo_sin_dramatismo_y_se_puede_quitar", async () => {
    const c = cliente(CON);
    const user = userEvent.setup();
    render(<Examen asignaturaId="a1" client={c} />);
    expect(await screen.findByText(/Faltan 18 días/)).toBeInTheDocument();
    expect(screen.getByText(/67 conceptos sin empezar: 4 al día/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar fecha" }));
    expect(c.setExamen).toHaveBeenCalledWith("a1", null);
  });

  it("casos_hoy_manana_y_pasado", async () => {
    for (const [dias, texto] of [[1, /Es mañana/], [0, /El examen es hoy/], [-3, /La fecha ya pasó/]] as const) {
      const { unmount } = render(<Examen asignaturaId="a1" client={cliente({ ...CON, dias, por_dia: dias < 0 ? null : 5 })} />);
      expect(await screen.findByText(texto)).toBeInTheDocument();
      if (dias < 0) expect(screen.queryByText(/al día/)).toBeNull();
      unmount();
    }
  });

  it("si_ya_ha_empezado_todo_el_temario_lo_dice", async () => {
    render(<Examen asignaturaId="a1" client={cliente({ ...CON, por_dia: 0, sin_tocar: 0, tocados: 77 })} />);
    expect(await screen.findByText(/Ya has empezado todo el temario/)).toBeInTheDocument();
  });
});
