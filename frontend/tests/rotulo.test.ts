import { describe, expect, it } from "vitest";
import { numeroTema, sinPrefijoTema } from "../src/rotulo";

describe("rótulo de tema", () => {
  it("quita el prefijo «T<n> » del nombre", () => {
    expect(sinPrefijoTema("T1 Normativa general")).toBe("Normativa general");
    expect(sinPrefijoTema("T12  Treballar segur")).toBe("Treballar segur");
  });
  it("deja intacto un nombre sin prefijo o con una T que es parte de la palabra", () => {
    expect(sinPrefijoTema("Normativa general")).toBe("Normativa general");
    expect(sinPrefijoTema("Tema 3 de repaso")).toBe("Tema 3 de repaso");
    expect(sinPrefijoTema("T1")).toBe("T1");
  });
  it("el número es el del nombre y, sin él, el orden en el temario", () => {
    expect(numeroTema("T2 Treballar segur i separar la matèria", 1)).toBe(2);
    expect(numeroTema("Normativa general", 3)).toBe(3);
  });
});
