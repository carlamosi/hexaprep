import { useEffect, useState } from "react";

type Aviso = Event & { prompt(): Promise<void>; userChoice: Promise<unknown> };

// Chrome y Edge lanzan `beforeinstallprompt` una sola vez y pronto: se guarda al cargar la app, no al abrir el Perfil.
let guardado: Aviso | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); guardado = e as Aviso; avisar(); });
  window.addEventListener("appinstalled", () => { guardado = null; avisar(); });
}

/** ¿Está abierta como app instalada (pantalla de inicio)? */
export function enAppInstalada(): boolean {
  return (navigator as unknown as { standalone?: boolean }).standalone === true || !!window.matchMedia?.("(display-mode: standalone)").matches;
}

/** `disponible` es true solo donde el navegador deja instalar con un botón (Chrome y Edge); en iPhone solo hay Compartir. */
export function useInstalar() {
  const [, repintar] = useState(0);
  useEffect(() => {
    const f = () => repintar((n) => n + 1);
    oyentes.add(f);
    return () => { oyentes.delete(f); };
  }, []);
  return {
    disponible: guardado !== null,
    async instalar() {
      const a = guardado;
      if (!a) return;
      guardado = null; // el aviso solo se puede usar una vez
      avisar();
      await a.prompt();
      await a.userChoice.catch(() => {});
    },
  };
}
