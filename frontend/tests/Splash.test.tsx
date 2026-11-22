import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { marcarListo } from "../src/arranque";
import { Splash, SPLASH_MS } from "../src/components/Splash";

beforeEach(() => sessionStorage.clear());
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("pantalla de arranque", () => {
  // Este test va primero: el estado de «listo» es del módulo y no se reinicia entre tests.
  it("si_algo_no_llega_se_cierra_sola_a_los_cinco_segundos", () => {
    vi.useFakeTimers();
    render(<Splash />);
    act(() => { vi.advanceTimersByTime(SPLASH_MS + 1000); });
    expect(screen.getByTestId("splash")).toBeInTheDocument(); // sigue esperando al acceso
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByTestId("splash")).toBeNull();
  });

  it("dura_el_minimo_y_se_cierra_en_cuanto_la_app_esta_lista", () => {
    vi.useFakeTimers();
    marcarListo("acceso");
    render(<Splash />);
    act(() => { vi.advanceTimersByTime(SPLASH_MS - 1); });
    expect(screen.getByTestId("splash")).toBeInTheDocument(); // la entrada se ve entera aunque todo esté listo
    expect(SPLASH_MS).toBeLessThanOrEqual(1500);
    act(() => { vi.advanceTimersByTime(1 + 240 + 80 + 220); }); // barra al 100 %, respiro y desvanecido
    expect(screen.queryByTestId("splash")).toBeNull();
  });

  it("con_movimiento_reducido_no_se_muestra", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), addEventListener: () => {}, removeEventListener: () => {} }));
    render(<Splash />);
    expect(screen.queryByTestId("splash")).toBeNull();
  });
});
