import type { ReactNode } from "react";
import type { Subject } from "../api";
import { t } from "../i18n";
import { AsignaturaSelector } from "./AsignaturaSelector";

const NAV = ["panal", "hoy", "historial", "ajustes"] as const;
type Ruta = (typeof NAV)[number];

const HEX = "M12 2.8 19.8 7.3v9.4L12 21.2 4.2 16.7V7.3Z";

/** Iconos en duotono desplazado: forma suave de color detrás y trazo oscuro delante. */
const ICONOS: Record<Ruta, ReactNode> = {
  panal: (
    <>
      <g transform="translate(1.8 1.8)"><path d={HEX} fill="var(--lila-tint)" /></g>
      <path d={HEX} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 8.7 14.9 10.3v3.4L12 15.3 9.1 13.7v-3.4Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  hoy: (
    <>
      <g transform="translate(1.8 1.8)"><circle cx="12" cy="12" r="8" fill="var(--lila-tint)" /></g>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  historial: (
    <>
      <g transform="translate(1.8 1.8)"><rect x="4" y="5" width="16" height="15" rx="3" fill="var(--lila-tint)" /></g>
      <rect x="4" y="5" width="16" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 10h16M8.5 3v4M15.5 3v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  ajustes: (
    <>
      <g transform="translate(1.8 1.8)"><circle cx="9" cy="8" r="2.5" fill="var(--lila-tint)" /><circle cx="15" cy="16" r="2.5" fill="var(--lila-tint)" /></g>
      <path d="M4 8h16M4 16h16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="8" r="2.5" fill="var(--paper)" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="16" r="2.5" fill="var(--paper)" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
};

interface Props {
  asignatura?: string | null;
  asignaturaId?: string | null;
  /** Con más de una asignatura el nombre pasa a ser un selector. */
  asignaturas?: Subject[];
  onCambiarAsignatura?: (id: string) => void;
  onAbrirSelector?: () => void;
  ruta: string;
  /** En la práctica la navegación se oculta para concentrarse. */
  sinNav?: boolean;
}

export function AppHeader({ asignatura, asignaturaId, asignaturas = [], onCambiarAsignatura, onAbrirSelector, ruta, sinNav }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--rule)] bg-[var(--paper)]/95 sm:backdrop-blur">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
        <a href="#panal" className="flex items-center gap-3 text-[var(--ink)] no-underline">
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
            <g transform="translate(1.6 1.6)"><path d={HEX} fill="var(--lila-tint)" /></g>
            <path d={HEX} fill="var(--lila-soft)" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          <span className="font-semibold">{t("app.nombre")}</span>
        </a>
          {asignaturas.length > 1 ? (
            <AsignaturaSelector asignaturas={asignaturas} actual={asignaturaId ?? null} onElegir={(id) => onCambiarAsignatura?.(id)} onAbrir={onAbrirSelector} />
          ) : asignatura && (
            <span className="hidden items-center gap-2 rounded-full border border-[var(--lila-tint)] bg-[var(--lila-soft)] px-3 py-1 text-sm font-medium text-[var(--lila-ink)] sm:inline-flex">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--lila)]" />
              {asignatura}
            </span>
          )}
        </div>
        {!sinNav && (
          <nav aria-label={t("nav.principal")} className="flex items-center gap-1 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-10 max-sm:justify-around max-sm:border-t max-sm:border-[var(--rule)] max-sm:bg-[var(--paper)] max-sm:p-2 max-sm:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {NAV.map((k) => (
              <a
                key={k}
                href={`#${k}`}
                aria-current={ruta === k ? "page" : undefined}
                className={`flex items-center gap-2 rounded-[11px] border px-3 py-2 text-sm font-medium no-underline max-sm:flex-col max-sm:gap-0.5 max-sm:text-xs ${
                  ruta === k ? "border-[var(--rule-2)] bg-white text-[var(--ink)]" : "border-transparent text-[var(--ink-2)] hover:text-[var(--lila-ink)]"
                }`}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">{ICONOS[k]}</svg>
                <span>{t(`nav.${k}`)}</span>
              </a>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
