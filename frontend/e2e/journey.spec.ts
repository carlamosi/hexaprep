import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const BANCO = path.join(ROOT, "banks", "economia", "T1.json");
const CAPTURAS = path.join(HERE, "capturas");

async function captura(page: Page, nombre: string) {
  fs.mkdirSync(CAPTURAS, { recursive: true });
  await page.screenshot({ path: path.join(CAPTURAS, `${nombre}.png`), fullPage: true });
}

async function porcentajes(page: Page): Promise<number[]> {
  const labels = await page.getByRole("button", { name: /por ciento de dominio/ }).evaluateAll((els) =>
    els.map((e) => e.getAttribute("aria-label") ?? ""));
  return labels.map((l) => Number(/(\d+) por ciento/.exec(l)?.[1] ?? "0"));
}

test("recorrido completo: importar, práctica libre con saltar, práctica, reporte, editor, copia y restauración", async ({ page, request }) => {
  // 1. Importar el banco (150 preguntas) por la API
  const imp = await request.post("/api/import", { data: { ruta: BANCO } });
  expect(imp.ok()).toBeTruthy();
  expect((await imp.json()).created).toBeGreaterThan(140);

  // 2. Primer arranque: solo el panal, a cero y sin mensajes
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Economía" })).toBeVisible();
  expect(Math.max(...(await porcentajes(page)))).toBe(0);
  await captura(page, "01-panal-vacio");

  // 3. Práctica libre con teclado: saltar una pregunta y responder tres (sin test de nivel previo)
  await page.getByRole("button", { name: "Practicar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saltar" })).toBeVisible();
  await expect(page.getByText("Confianza")).toHaveCount(0);
  await captura(page, "02-practica-libre");
  const saltada = await page.getByRole("heading", { level: 1 }).textContent();
  await page.keyboard.press("s");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(saltada!); // la saltada espera: sale otra
  for (let i = 0; i < 3; i++) {
    await expect(page.getByRole("button", { name: "Saltar" })).toBeVisible();
    await page.keyboard.press("a");
    // el contador queda fijo; la explicación solo se ve 1 s tras un acierto (avanza sola)
    await expect(page.getByText(new RegExp(`^${i + 1} respondidas?$`))).toBeVisible();
  }
  await page.getByRole("button", { name: "Terminar sesión" }).click();
  await captura(page, "03-resumen-practica");
  await page.getByRole("button", { name: "Volver al panal" }).click();

  // 4. El panal se ha actualizado
  await expect(page.getByRole("heading", { level: 1, name: "Economía" })).toBeVisible();
  await expect.poll(async () => Math.max(...(await porcentajes(page)))).toBeGreaterThan(0);
  await captura(page, "04-panal-actualizado");

  // 5. Práctica de un subtema con teclado: responder, abrir la explicación, reportar
  await page.getByRole("button", { name: /por ciento de dominio/ }).first().click();
  await expect(page.getByRole("button", { name: "Practicar este subtema" })).toBeVisible();
  await captura(page, "05-subtema");
  await page.getByRole("button", { name: "Practicar este subtema" }).click();
  await expect(page.getByRole("button", { name: "Saltar" })).toBeVisible(); // la pregunta ya está cargada
  await captura(page, "06-practica");
  await page.keyboard.press("b");
  await page.getByText("Ver explicación").click();
  await expect(page.locator("details[open]").first()).toBeVisible();
  await captura(page, "07-explicacion");
  await page.keyboard.press("Enter"); // siguiente
  await expect(page.getByText("1 respondida", { exact: true })).toBeVisible();
  await page.getByText("Reportar", { exact: true }).click();
  await page.getByRole("button", { name: "Está mal formulada" }).click();
  await expect(page.getByText(/Pregunta reportada/)).toBeVisible();

  // 6. Sugerencia de hoy e historial
  await page.getByRole("link", { name: "Hoy" }).click();
  await expect(page.getByRole("heading", { name: "Qué conviene repasar ahora" })).toBeVisible();
  await captura(page, "08-hoy");
  await page.getByRole("link", { name: "Historial" }).click();
  await expect(page.getByRole("heading", { name: "Historial" })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Actividad: .*[^0-9]1 día con práctica/ })).toBeVisible(); // solo hoy, sin rachas
  await captura(page, "09-historial");

  // 7. Ajustes: editor de la pregunta reportada, copia de seguridad y restauración
  await page.getByRole("link", { name: "Ajustes" }).click();
  await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible();
  await page.getByRole("button", { name: "Editar" }).click();
  await page.getByRole("textbox", { name: "Explicación", exact: true }).fill("Explicación revisada en el editor.");
  await page.getByLabel("Volver a incluirla en las estadísticas").check();
  await page.getByRole("button", { name: "Guardar como versión nueva" }).click();
  await expect(page.getByText("Versión 2 guardada")).toBeVisible();
  await page.getByRole("button", { name: "Hacer copia ahora" }).click();
  await expect(page.getByText(/hexaprep-.*\.db/)).toBeVisible();
  await captura(page, "10-ajustes");
  await page.getByRole("button", { name: "Restaurar esta copia" }).click();
  await page.getByRole("button", { name: "Sí, restaurar" }).click();
  await expect(page.getByText(/Copia restaurada/)).toBeVisible();

  // 8. Tras restaurar, los datos siguen ahí
  await page.getByRole("link", { name: "Panal" }).click();
  await expect.poll(async () => Math.max(...(await porcentajes(page)))).toBeGreaterThan(0);
});

test("responsive: el panal y la práctica caben en 375 px sin scroll horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Economía" })).toBeVisible();
  const overflow = () => page.evaluate(() => document.scrollingElement!.scrollWidth - document.scrollingElement!.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await captura(page, "11-panal-movil");
  await page.getByRole("button", { name: /por ciento de dominio/ }).first().click();
  await page.getByRole("button", { name: "Practicar este subtema" }).click();
  await expect(page.getByRole("button", { name: "Saltar" })).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
  await captura(page, "12-practica-movil");
});
