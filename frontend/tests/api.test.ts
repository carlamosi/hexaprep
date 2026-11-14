import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, bookletUrl } from "../src/api";
import { t } from "../src/i18n";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("cliente de la API", () => {
  it("envía POST con JSON y devuelve el cuerpo", async () => {
    const f = mockFetch(200, { sesion_id: "s1", aviso: null });
    const r = await api.createSession("practica", { asignatura_id: "a1" });
    expect(r.sesion_id).toBe("s1");
    expect(f).toHaveBeenCalledWith("/api/sessions", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ modo: "practica", filtro: { asignatura_id: "a1" } });
  });

  it("un error de la API lanza ApiError con el mensaje claro", async () => {
    mockFetch(404, { detail: "No encuentro el PDF" });
    await expect(api.getMap("x")).rejects.toMatchObject({ status: 404, message: "No encuentro el PDF" });
    expect(new ApiError(500, "x")).toBeInstanceOf(Error);
  });

  it("nextQuestion devuelve null al terminar", async () => {
    mockFetch(200, null);
    expect(await api.nextQuestion("s1")).toBeNull();
  });

  it("bookletUrl abre el PDF en la cara indicada", () => {
    expect(bookletUrl("f1", 4)).toBe("/api/booklet/f1#page=4");
  });
});

describe("i18n", () => {
  it("t devuelve el texto en castellano y la clave si falta", () => {
    expect(t("nav.panal")).toBe("Panal");
    expect(t("no.existe")).toBe("no.existe");
  });
});
