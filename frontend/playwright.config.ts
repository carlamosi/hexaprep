import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices, webkit } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const data = path.join(root, ".superpowers", "tmp", "e2e-data");
const python = path.join(root, ".venv", "Scripts", "python.exe");
/** WebKit para el proyecto del iPhone: el de esta versión de Playwright si está instalado (npx playwright install webkit);
 *  si no, el más reciente que haya en el equipo (PLAYWRIGHT_WEBKIT_PATH lo fuerza). */
function rutaWebkit(): string | undefined {
  if (process.env.PLAYWRIGHT_WEBKIT_PATH) return process.env.PLAYWRIGHT_WEBKIT_PATH;
  if (fs.existsSync(webkit.executablePath())) return undefined;
  const base = path.dirname(path.dirname(webkit.executablePath()));
  const hay = fs.existsSync(base) ? fs.readdirSync(base).filter((d) => d.startsWith("webkit-")).sort().reverse() : [];
  const exe = hay.map((d) => path.join(base, d, path.basename(webkit.executablePath()))).find((f) => fs.existsSync(f));
  return exe;
}
const dataMovil = path.join(root, ".superpowers", "tmp", "e2e-data-movil");

// Datos limpios en cada ejecución, y nunca los de uso real (data/). Solo en el proceso principal:
// los workers vuelven a cargar este archivo y no deben borrar la base a mitad del recorrido.
if (!process.env.TEST_WORKER_INDEX) for (const d of [data, dataMovil]) fs.rmSync(d, { recursive: true, force: true });

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  outputDir: path.join(root, ".superpowers", "tmp", "e2e-results"),
  projects: [
    { name: "escritorio", testIgnore: /movil/, use: { baseURL: "http://127.0.0.1:8765", viewport: { width: 1280, height: 900 } } },
    // iPhone 12 mini con el motor de Safari (WebKit), que es el que usa también Chrome en iOS
    {
      name: "iphone", testMatch: /movil/,
      use: {
        ...devices["iPhone 12 Mini"], baseURL: "http://127.0.0.1:8766",
        // PLAYWRIGHT_WEBKIT_PATH permite usar un WebKit ya instalado de otra versión (npx playwright install webkit lo descarga)
        launchOptions: rutaWebkit() ? { executablePath: rutaWebkit() } : {},
      },
    },
  ],
  webServer: [
    { command: `"${python}" -m hexaprep`, cwd: root, url: "http://127.0.0.1:8765/api/subjects", env: { HEXAPREP_DATA: data, HEXAPREP_PORT: "8765" }, reuseExistingServer: false, timeout: 60_000 },
    { command: `"${python}" -m hexaprep`, cwd: root, url: "http://127.0.0.1:8766/api/subjects", env: { HEXAPREP_DATA: dataMovil, HEXAPREP_PORT: "8766" }, reuseExistingServer: false, timeout: 60_000 },
  ],
});
