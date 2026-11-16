import { describe, expect, it } from "vitest";
import { compararLetras, masCercana } from "../src/diff";

describe("corrección letra a letra", () => {
  it("marca_solo_lo_que_cambia_un_acento", () => {
    const r = compararLetras("estacio", "estació");
    expect(r.tu).toEqual([{ texto: "estaci", ok: true }, { texto: "o", ok: false }]);
    expect(r.correcto).toEqual([{ texto: "estaci", ok: true }, { texto: "ó", ok: false }]);
  });

  it("marca_la_letra_cambiada_y_la_que_falta", () => {
    expect(compararLetras("aburrir", "avorrir").tu).toEqual([{ texto: "a", ok: true }, { texto: "bu", ok: false }, { texto: "rrir", ok: true }]);
    const f = compararLetras("xocolta", "xocolata");
    expect(f.tu).toEqual([{ texto: "xocolta", ok: true }]);
    expect(f.correcto).toEqual([{ texto: "xocol", ok: true }, { texto: "a", ok: false }, { texto: "ta", ok: true }]);
  });

  it("no_distingue_mayusculas_ni_espacios_de_los_bordes_y_lo_igual_no_marca_nada", () => {
    expect(compararLetras("  Cavall ", "cavall").tu).toEqual([{ texto: "cavall", ok: true }]);
  });

  it("masCercana_elige_la_forma_valida_que_menos_se_parece_a_un_error", () => {
    expect(masCercana("complet", ["complert", "complit"])).toBe("complert");
    expect(masCercana("complin", ["complert", "complit"])).toBe("complit");
    expect(masCercana("x", [])).toBe("");
  });
});

import { mismaForma } from "../src/diff";

describe("comparar lo copiado con la forma correcta", () => {
  it("ignora_mayusculas_espacios_y_apostrofos_pero_exige_los_acentos", () => {
    expect(mismaForma("  Admès ", ["admès"])).toBe(true);
    expect(mismaForma("l’home", ["l'home"])).toBe(true);
    expect(mismaForma("col.legi", ["col·legi"])).toBe(true);
    expect(mismaForma("admes", ["admès"])).toBe(false);
    expect(mismaForma("complit", ["complert", "complit"])).toBe(true);
    expect(mismaForma("", ["x"])).toBe(false);
  });
});
