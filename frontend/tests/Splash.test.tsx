import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Splash, SPLASH_MS } from "../src/components/Splash";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("pantalla de arranque", () => {
  it("se_ve_al_abrir_y_desaparece_en_menos_de_un_segundo", () => {
    vi.useFakeTimers();
    render(<Splash />);
    expect(screen.getByTestId("splash")).toBeInTheDocument();
    expect(SPLASH_MS).toBeLessThan(1000);
    act(() => { vi.advanceTimersByTime(SPLASH_MS + 400); });
    expect(screen.queryByTestId("splash")).toBeNull();
  });

  it("con_movimiento_reducido_no_se_muestra", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), addEventListener: () => {}, removeEventListener: () => {} }));
    render(<Splash />);
    expect(screen.queryByTestId("splash")).toBeNull();
  });
});
