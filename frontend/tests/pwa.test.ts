import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = process.cwd(); // vitest se ejecuta desde frontend/
const leer = (f: string) => readFileSync(join(RAIZ, f), "utf-8");

describe("app instalable", () => {
  const manifest = JSON.parse(leer("public/manifest.webmanifest"));

  it("el_manifest_permite_instalarla_como_app_independiente", () => {
    expect(manifest).toMatchObject({ name: "HexaPrep", display: "standalone", start_url: "/", scope: "/" });
    const tamanos = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(tamanos).toContain("192x192");
    expect(tamanos).toContain("512x512");
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  });

  it("todos_los_iconos_del_manifest_existen", () => {
    for (const i of manifest.icons) expect(existsSync(join(RAIZ, "public", i.src.replace(/^\//, ""))), i.src).toBe(true);
    expect(existsSync(join(RAIZ, "public/apple-touch-icon.png"))).toBe(true);
  });

  it("index_enlaza_manifest_color_e_icono_de_iphone", () => {
    const html = leer("index.html");
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"');
  });

  it("index_lleva_lo_que_pide_iphone_para_abrirse_como_app_a_pantalla_completa_y_sin_notch_tapado", () => {
    const html = leer("index.html");
    expect(html).toContain("viewport-fit=cover");
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="apple-mobile-web-app-title" content="HexaPrep"');
    expect(manifest.id).toBe("/");
  });

  it("la_barra_inferior_respeta_la_barra_de_inicio_del_iphone_y_la_cabecera_no_crea_un_contenedor_para_ella", () => {
    expect(leer("src/components/AppHeader.tsx")).toContain("env(safe-area-inset-bottom)");
    // backdrop-filter convierte a la cabecera en el contenedor de sus hijos fijos y la barra «fija abajo» se quedaba arriba, tapando el logo
    expect(leer("src/components/AppHeader.tsx")).not.toMatch(/<header[^>]*[^:]backdrop-blur/);
  });

  it("el_service_worker_no_guarda_nada_en_cache_para_no_servir_versiones_viejas_ni_la_api", () => {
    const sw = leer("public/sw.js");
    expect(sw).not.toMatch(/caches\./);
    expect(sw).toContain('addEventListener("fetch"');
  });
});
