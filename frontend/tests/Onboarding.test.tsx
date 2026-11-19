import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Onboarding, ABRIR_GUIA } from "../src/components/Onboarding";

afterEach(() => localStorage.clear());

describe("guía de bienvenida", () => {
  it("sale_la_primera_vez_con_tres_pantallas_y_no_vuelve", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Onboarding />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("1 de 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("3 de 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Empezar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();
    render(<Onboarding />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("se_puede_saltar_y_repetir_desde_perfil", async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    await user.click(screen.getByRole("button", { name: "Saltar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => { window.dispatchEvent(new Event(ABRIR_GUIA)); });
    expect(screen.getByText("1 de 3")).toBeInTheDocument();
  });
});
