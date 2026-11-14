import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const data = path.join(root, ".superpowers", "tmp", "e2e-data");
const python = path.join(root, ".venv", "Scripts", "python.exe");

// Datos limpios en cada ejecución, y nunca los de uso real (data/). Solo en el proceso principal:
// los workers vuelven a cargar este archivo y no deben borrar la base a mitad del recorrido.
if (!process.env.TEST_WORKER_INDEX) fs.rmSync(data, { recursive: true, force: true });

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  outputDir: path.join(root, ".superpowers", "tmp", "e2e-results"),
  use: { baseURL: "http://127.0.0.1:8765", viewport: { width: 1280, height: 900 } },
  webServer: {
    command: `"${python}" -m hexaprep`,
    cwd: root,
    url: "http://127.0.0.1:8765/api/subjects",
    env: { HEXAPREP_DATA: data, HEXAPREP_PORT: "8765" },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
