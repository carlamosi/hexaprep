import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/api";
import { CLAVE_NOVEDAD, NovedadTemario, debeMostrarse } from "../src/components/NovedadTemario";
import { Home } from "../src/pages/Home";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("aviso del temario de Català", () => {
  it("solo_sale_en_Catala_con_progreso_y_sin_haberlo_cerrado", () => {
    expect(debeMostrarse("Català", true), "Català con progreso").toBe(true);
    expect(debeMostrarse("Química", true), "Química también es en catalán pero no cambió").toBe(false);
    expect(debeMostrarse("Català", false), "quien no ha empezado no conocía el temario anterior").toBe(false);
    localStorage.setItem(CLAVE_NOVEDAD, "1");
    expect(debeMostrarse("Català", true), "ya cerrado").toBe(false);
  });

  it("al_cerrar_se_guarda_y_no_vuelve", async () => {
    const { unmount } = render(<NovedadTemario temas={["Ortografia", "El verb"]} base="#D9822B" />);
    expect(screen.getByRole("region", { name: /por materias/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(localStorage.getItem(CLAVE_NOVEDAD)).toBe("1");
    await waitFor(() => expect(screen.queryByRole("region")).toBeNull());
    unmount();
    expect(debeMostrarse("Català", true)).toBe(false);
  });

  it("el_botón_cerrar_mide_al_menos_44_px_de_alto_en_el_css", async () => {
    const css = (await import("node:fs")).readFileSync("src/components/novedad.css", "utf8");
    expect(css).toMatch(/\.novedad-ok\s*\{[^}]*min-height:\s*44px/);
  });

  it("Home_lo_muestra_en_Catala_con_progreso", async () => {
    vi.spyOn(api, "getSubjects").mockResolvedValue([{ id: "ca", nombre: "Català", idioma: "ca", color: "#D9822B", acento: "#D9822B", percent: 3 }]);
    vi.spyOn(api, "getMap").mockResolvedValue({
      asignatura: "Català", percent: 3, subtemas: [{ id: "s1", nombre: "Accentuació", percent: 3 }],
      hexes: [{ concepto_id: "c1", nombre: "Paraules agudes", subtema_id: "s1", subtema: "Accentuació", tema: "Ortografia i accentuació", tema_id: "t1", color: "#D9822B", percent: 3 }],
    });
    render(<Home />);
    expect(await screen.findByRole("region", { name: /por materias/ })).toBeInTheDocument();
  });
});
