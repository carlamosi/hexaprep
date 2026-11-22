import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BannerMini } from "../src/components/BannerMini";

let avisar: (e: Partial<IntersectionObserverEntry>) => void = () => {};
afterEach(() => vi.unstubAllGlobals());

function montar(onAbrir = vi.fn()) {
  vi.stubGlobal("IntersectionObserver", class { constructor(cb: (e: IntersectionObserverEntry[]) => void) { avisar = (e) => cb([e as IntersectionObserverEntry]); } observe() {} disconnect() {} });
  const ref = createRef<HTMLElement>();
  render(<><section ref={ref} /><BannerMini banner={ref} nombre="Català" percent={4} color="#b07a2a" onAbrir={onAbrir} /></>);
  return onAbrir;
}

describe("franja compacta del banner", () => {
  it("aparece_cuando_el_banner_sale_por_arriba_y_se_va_al_volver", () => {
    montar();
    const franja = () => screen.getByText("Català").parentElement!;
    expect(franja()).toHaveAttribute("data-visible", "false");
    act(() => avisar({ isIntersecting: false, boundingClientRect: { bottom: -20 } as DOMRect }));
    expect(franja()).toHaveAttribute("data-visible", "true");
    act(() => avisar({ isIntersecting: true, boundingClientRect: { bottom: 100 } as DOMRect }));
    expect(franja()).toHaveAttribute("data-visible", "false");
  });

  it("no_aparece_si_el_banner_esta_fuera_por_abajo", () => {
    montar();
    act(() => avisar({ isIntersecting: false, boundingClientRect: { bottom: 2000 } as DOMRect }));
    expect(screen.getByText("Català").parentElement).toHaveAttribute("data-visible", "false");
  });

  it("el_porcentaje_abre_el_panel", async () => {
    const abrir = montar();
    act(() => avisar({ isIntersecting: false, boundingClientRect: { bottom: -5 } as DOMRect }));
    await userEvent.click(screen.getByRole("button", { name: /Ver panal Català, 4 %/ }));
    expect(abrir).toHaveBeenCalled();
  });
});
