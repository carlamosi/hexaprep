// Tema de color: Sistema (por defecto), Claro u Oscuro. Se guarda en el navegador y se aplica con `data-theme` en <html>.
export type Tema = "sistema" | "claro" | "oscuro";
const KEY = "hexaprep.tema";

export function leerTema(): Tema {
  try {
    const v = localStorage.getItem(KEY);
    return v === "claro" || v === "oscuro" ? v : "sistema";
  } catch { return "sistema"; }
}

/** Aplica y recuerda la preferencia. «sistema» quita el atributo y manda `prefers-color-scheme`. */
export function aplicarTema(t: Tema): void {
  try { t === "sistema" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, t); } catch { /* sin almacenamiento: vale para esta visita */ }
  const el = document.documentElement;
  if (t === "sistema") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", t === "claro" ? "light" : "dark");
}

export function esOscuro(): boolean {
  const forzado = document.documentElement.getAttribute("data-theme");
  if (forzado) return forzado === "dark";
  return !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}
