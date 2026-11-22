import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useInstalar } from "../src/instalar";

it("guarda_el_aviso_de_instalar_y_lo_usa_una_sola_vez", async () => {
  const { result } = renderHook(() => useInstalar());
  expect(result.current.disponible).toBe(false);
  const prompt = vi.fn().mockResolvedValue(undefined);
  const e = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });
  act(() => { window.dispatchEvent(e); });
  expect(e.defaultPrevented).toBe(true);
  expect(result.current.disponible).toBe(true);
  await act(async () => { await result.current.instalar(); });
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(result.current.disponible).toBe(false);
});
