import { describe, expect, it } from "vitest";
import { numerosTemas, numeroTema, sinPrefijoTema } from "../src/rotulo";

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
  it("si los números de los nombres se repiten (Català: «Verbs» y «T2 Gramàtica»), todos usan el orden", () => {
    expect(numerosTemas(["T1 Normativa general", "Verbs", "T2 Gramàtica", "T3 Literatura"])).toEqual([1, 2, 3, 4]);
    expect(numerosTemas(["T2 Treballar segur", "T3 Dissolucions"])).toEqual([2, 3]);
    expect(numerosTemas(["Normativa", "Verbs"])).toEqual([1, 2]);
  });
});
