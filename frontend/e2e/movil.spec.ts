import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

// iPhone 12 mini con WebKit (proyecto «iphone» de playwright.config.ts): lo que ve quien abre la app desde Chrome o Safari en iOS.
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const banco = (f: string) => path.join(raiz, "banks", f);

interface Auditoria { desborde: number; culpables: string[]; pequenos: string[]; zoom: string[]; fueraDePantalla: string[] }

async function auditar(page: Page): Promise<Auditoria> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const nombre = (el: Element) => `${el.tagName.toLowerCase()} «${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 28)}»`;
    const controles = [...document.querySelectorAll("button:not(.pm-hex), a[href], summary, select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea")].filter(visible); // .pm-hex: cuadrícula de hexágonos a 42 px por diseño
    return {
      desborde: document.documentElement.scrollWidth - window.innerWidth,
      culpables: [...document.querySelectorAll("html, body, body *")].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 || el.scrollWidth > window.innerWidth + 1)
        .slice(0, 8).map((el) => `${el.tagName.toLowerCase()}.${(el.getAttribute("class") || "").slice(0, 40)} derecha=${Math.round(el.getBoundingClientRect().right)} «${(el.textContent || "").trim().slice(0, 30)}»`),
      pequenos: controles.filter((el) => { const r = el.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; })  // 43,5: margen para el redondeo de los píxeles del dispositivo
        
        .map((el) => { const r = el.getBoundingClientRect(); return `${nombre(el)} ${Math.round(r.width)}x${Math.round(r.height)}`; }),
      zoom: controles.filter((el) => /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => `${nombre(el)} ${getComputedStyle(el).fontSize}`),
      fueraDePantalla: controles.filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1).map(nombre),
    };
  });
}

let asignaturas: Record<string, string> = {};

test.beforeAll(async ({ request }) => {
  for (const f of ["economia/T1.json", "catala/V1.json", "catala/G1.json"]) {
    const r = await request.post("/api/import", { data: { ruta: banco(f) } });
    expect(r.ok(), f).toBe(true);
  }
  asignaturas = Object.fromEntries((await (await request.get("/api/subjects")).json()).map((a: { nombre: string; id: string }) => [a.nombre, a.id]));
  await request.put(`/api/examen/${asignaturas["Català"]}`, { data: { fecha: new Date(Date.now() + 18 * 86_400_000).toISOString().slice(0, 10) } });
});

async function abrir(page: Page, asignatura: string, ruta: string) {
  const id = asignaturas[asignatura];
  await page.addInitScript((v) => localStorage.setItem("hexaprep.asignatura", v), id);
  await page.goto("about:blank"); // un cambio solo de hash no recarga y el script de inicio no volvería a ejecutarse
  await page.goto(`/#${ruta}`);
  await page.waitForLoadState("networkidle");
}

async function revisar(page: Page, donde: string) {
  await page.waitForTimeout(500); // que terminen las animaciones de entrada (medir a mitad de animación da tamaños falsos)
  const a = await auditar(page);
  expect.soft(a.desborde, `${donde}: desborde horizontal por ${a.culpables.join(" | ")}`).toBeLessThanOrEqual(0);
  expect.soft(a.fueraDePantalla, `${donde}: controles fuera de la pantalla`).toEqual([]);
  expect.soft(a.zoom, `${donde}: campos con texto menor de 16 px (iOS hace zoom al tocarlos)`).toEqual([]);
  expect.soft(a.pequenos, `${donde}: zonas táctiles menores de 44 px`).toEqual([]);
}

test("el_dispositivo_es_un_iphone_12_mini_con_webkit", async ({ page, browserName }) => {
  expect(browserName).toBe("webkit");
  await page.goto("/");
  expect(await page.evaluate(() => window.innerWidth)).toBe(375);
});

for (const [nombre, asig, ruta] of [
  ["panal", "Economía", "panal"], ["hoy con fecha de examen", "Català", "hoy"], ["historial", "Economía", "historial"],
  ["perfil", "Economía", "perfil"], ["practica test", "Economía", "practica"], ["practica escrita", "Català", "practica/_/escritas"],
] as const) {
  test(`movil: ${nombre}`, async ({ page }) => {
    await abrir(page, asig, ruta);
    await revisar(page, nombre);
  });
}

test("movil: responder una escrita y ver la corrección letra a letra", async ({ page }) => {
  await abrir(page, "Català", "practica/_/escritas");
  const cajas = page.getByRole("textbox");
  await expect(cajas.first()).toBeVisible();
  for (let i = 0; i < (await cajas.count()); i++) await cajas.nth(i).fill("xxé");
  await page.getByRole("button", { name: "Comprovar" }).tap();
  await expect(page.getByLabel(/Escribiste xxé, lo correcto es/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Següent" })).toBeVisible();
  await revisar(page, "escrita corregida");
});

test("movil: fecha de examen en edición", async ({ page }) => {
  await abrir(page, "Català", "hoy");
  await page.getByRole("button", { name: "Cambiar fecha" }).click();
  await expect(page.getByLabel("Fecha del examen")).toBeVisible();
  await revisar(page, "editar fecha de examen");
});

test("movil: selector de asignatura y panel completo", async ({ page }) => {
  await abrir(page, "Economía", "panal");
  await page.getByRole("button", { name: /Asignatura: Economía/ }).click({ force: true }) // WebKit nunca da por «estable» un botón de la cabecera fija con desenfoque;
  await expect(page.getByRole("listbox")).toBeVisible();
  await revisar(page, "selector de asignatura abierto");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /Ver panal/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await revisar(page, "panel de asignatura");
});

test("movil: la barra de navegación va pegada abajo y no tapa la cabecera", async ({ page }) => {
  await abrir(page, "Economía", "panal");
  const medidas = await page.evaluate(() => {
    const nav = document.querySelector("nav[aria-label]")!.getBoundingClientRect();
    const sel = document.querySelector(".asig-btn")!.getBoundingClientRect();
    const logo = document.querySelector("header a")!.getBoundingClientRect();
    const encima = (r: DOMRect) => document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      navAbajo: Math.round(window.innerHeight - nav.bottom), navArriba: Math.round(nav.top), alto: window.innerHeight,
      selectorLibre: !!encima(sel)?.closest(".asig-btn"), logoLibre: !!encima(logo)?.closest("a[href='#panal']"),
    };
  });
  expect(medidas.navAbajo, "la barra debe tocar el borde inferior").toBeLessThanOrEqual(1);
  expect(medidas.navArriba, "y estar en la mitad de abajo").toBeGreaterThan(medidas.alto / 2);
  expect(medidas.selectorLibre, "nada tapa el selector de asignatura").toBe(true);
  expect(medidas.logoLibre, "nada tapa el logo").toBe(true);
  await page.getByRole("button", { name: /Asignatura: Economía/ }).tap();
  await expect(page.getByRole("listbox")).toBeVisible();
});

test("movil: el enlace antiguo de Ajustes lleva a Perfil y la barra inferior marca Perfil", async ({ page }) => {
  await abrir(page, "Economía", "ajustes");
  await expect(page.getByRole("heading", { name: "Perfil", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Perfil" })).toHaveAttribute("aria-current", "page");
});
