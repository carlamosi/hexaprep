import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Clasificar, columnasDe } from "../src/components/Clasificar";

describe("columnasDe", () => {
  it("lee_las_columnas_del_enunciado_y_no_confunde_otras_escritas", () => {
    expect(columnasDe("Classifica cada paraula: creixent, decreixent, hiat o res.")).toEqual(["creixent", "decreixent", "hiat", "res"]);
    expect(columnasDe("Escriu el gerundi del verb «admetre».")).toBeNull();
  });
});

const COLS = ["creixent", "hiat"];

describe("Clasificar", () => {
  it("tocar_palabra_y_luego_columna_la_coloca_y_se_envia_el_orden_de_las_palabras", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Clasificar palabras={["quadre", "dia"]} columnas={COLS} disabled={false} resultado={undefined} onSubmit={onSubmit} />);
    const enviar = screen.getByRole("button", { name: /comprovar|comprobar/i });
    expect(enviar).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "quadre" }));
    await user.click(screen.getByRole("button", { name: /columna creixent/i }));
    await user.click(screen.getByRole("button", { name: "dia" }));
    await user.click(screen.getByRole("button", { name: /columna hiat/i }));
    await user.click(enviar);
    expect(onSubmit).toHaveBeenCalledWith(["creixent", "hiat"], expect.any(Object));
  });

  it("tras_corregir_muestra_la_columna_correcta_de_las_falladas", () => {
    render(<Clasificar palabras={["quadre", "dia"]} columnas={COLS} disabled resultado={[
      { etiqueta: "quadre", correcto: true, esperado: ["creixent"], nota: null },
      { etiqueta: "dia", correcto: false, esperado: ["hiat"], nota: null }]} onSubmit={vi.fn()} initial={["creixent", "creixent"]} />);
    expect(screen.getByText(/dia/, { selector: "[data-fallo]" })).toBeInTheDocument();
    expect(screen.getByText(/hiat/, { selector: "[data-fallo]" })).toBeInTheDocument();
  });
});
