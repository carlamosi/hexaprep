import { useEffect, useState } from "react";
import { t } from "../i18n";

const KEY = "hexaprep.guia";
export const ABRIR_GUIA = "hexaprep:guia";
const PASOS = ["panal", "practica", "progreso"] as const;

function yaVista(): boolean {
  if (navigator.webdriver) return true; // los navegadores automatizados (Playwright) no ven la guía: taparía la prueba
  try { return localStorage.getItem(KEY) === "1"; } catch { return true; } // sin almacenamiento no se insiste
}

/** Guía de 3 pantallas: solo la primera vez, y se repite con el botón de Perfil (evento ABRIR_GUIA). */
export function Onboarding() {
  const [paso, setPaso] = useState<number | null>(() => (yaVista() ? null : 0));
  useEffect(() => {
    const abrir = () => setPaso(0);
    window.addEventListener(ABRIR_GUIA, abrir);
    return () => window.removeEventListener(ABRIR_GUIA, abrir);
  }, []);
  if (paso === null) return null;
  const cerrar = () => { try { localStorage.setItem(KEY, "1"); } catch { /* opcional */ } setPaso(null); };
  const k = PASOS[paso];
  const ultimo = paso === PASOS.length - 1;
  return (
    <div role="dialog" aria-modal="true" aria-label={t("guia.titulo")} className="fixed inset-0 z-50 grid place-items-center bg-[var(--ink)]/60 p-4"
      onKeyDown={(e) => { if (e.key === "Escape") cerrar(); }}>
      <div className="w-full max-w-md rounded-[16px] border border-[var(--ink)] bg-[var(--card)] p-6 shadow-[5px_5px_0_var(--lila)]">
        <p className="text-xs tracking-[.14em] text-[var(--ink-3)] uppercase">{paso + 1} de {PASOS.length}</p>
        <h2 className="mt-2 text-xl font-semibold">{t(`guia.${k}.titulo`)}</h2>
        <p className="mt-2 text-[var(--ink-2)]">{t(`guia.${k}.texto`)}</p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={cerrar} className="min-h-11 text-sm font-medium text-[var(--ink-2)] underline underline-offset-4">{t("guia.saltar")}</button>
          <button type="button" autoFocus onClick={() => (ultimo ? cerrar() : setPaso(paso + 1))}
            className="min-h-11 rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-[var(--on-ink)] shadow-[3px_3px_0_var(--lila)]">
            {t(ultimo ? "guia.empezar" : "guia.siguiente")}
          </button>
        </div>
      </div>
    </div>
  );
}
