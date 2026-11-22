import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { esOscuro } from "../tema";
import type { Subject } from "../api";
import { t } from "../i18n";
import { AsignaturaSelector } from "./AsignaturaSelector";
import "./appheader.css";

const NAV = ["panal", "hoy", "historial", "perfil"] as const;
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
  perfil: (
    <>
      <g transform="translate(1.8 1.8)"><circle cx="12" cy="8" r="3.6" fill="var(--lila-tint)" /><path d="M5 20c0-3.9 3.1-6.2 7-6.2s7 2.3 7 6.2Z" fill="var(--lila-tint)" /></g>
      <circle cx="12" cy="8" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20c0-3.9 3.1-6.2 7-6.2s7 2.3 7 6.2Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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

/** Mezcla un color #rrggbb con blanco (p = parte de color) para una barra clara con tinte de la asignatura. */
export function tinte(hex: string | undefined, p = 0.3, base = 255): string | undefined {
  const m = /^#([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return undefined;
  const n = parseInt(m[1], 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * p + base * (1 - p)));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function AppHeader({ asignatura, asignaturaId, asignaturas = [], onCambiarAsignatura, onAbrirSelector, ruta, sinNav }: Props) {
  const acento = asignaturas.find((a) => a.id === asignaturaId)?.acento;
  const color = tinte(acento) && `color-mix(in srgb, ${acento} 30%, var(--paper))`;
  const navRef = useRef<HTMLElement>(null);
  const [pastilla, setPastilla] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [anima, setAnima] = useState(false); // la pastilla solo se desliza entre pestañas, no al aparecer
  const [conSombra, setConSombra] = useState(false);
  useLayoutEffect(() => {
    const medir = () => {
      const a = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      setPastilla(a ? { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight } : null);
    };
    medir();
    const id = requestAnimationFrame(() => setAnima(true));
    window.addEventListener("resize", medir);
    // los textos cambian de ancho al cargar la tipografía o al cambiar de idioma: la pastilla se vuelve a medir
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(medir);
    navRef.current?.querySelectorAll("a").forEach((a) => ro?.observe(a));
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", medir); ro?.disconnect(); };
  }, [ruta, sinNav]);
  useEffect(() => { // la sombra de la cabecera solo cuando hay contenido pasando por debajo
    const f = () => setConSombra(window.scrollY > 2);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  useEffect(() => { // la barra de estado del iPhone toma el mismo color
    const oscuro = esOscuro();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tinte(acento, 0.3, oscuro ? 0x17 : 255) ?? "#B05A8F");
  }, [acento]);
  return (
    <header style={color ? { background: color } : undefined} className={`cab sticky top-0 z-10 border-b border-[var(--rule)] sm:backdrop-blur ${conSombra ? "cab-sombra" : ""} ${color ? "" : "bg-[var(--paper)]/95"}`}>
      <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
        <a href="#panal" className="flex items-center gap-3 text-[var(--ink)] no-underline" onClick={(e) => {
          if (ruta === "panal" && window.scrollY > 0) { // ya estás en el Panal: el logo sube arriba
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          }
        }}>
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
          <nav ref={navRef} aria-label={t("nav.principal")} className="relative flex items-center gap-1 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-10 max-sm:justify-around max-sm:border-t max-sm:border-[var(--rule)] max-sm:bg-[var(--paper)] max-sm:p-2 max-sm:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {pastilla && <span aria-hidden="true" className={`nav-pastilla max-sm:hidden ${anima ? "anima" : ""}`} style={{ width: pastilla.w, height: pastilla.h, transform: `translate(${pastilla.x}px, ${pastilla.y}px)` }} />}
            {NAV.map((k) => (
              <a
                key={k}
                href={`#${k}`}
                aria-current={ruta === k ? "page" : undefined}
                className={`relative z-[1] flex items-center gap-2 rounded-[11px] border px-3 py-2 text-sm font-medium no-underline max-sm:flex-col max-sm:gap-0.5 max-sm:text-xs ${
                  ruta === k ? "border-transparent text-[var(--ink)] max-sm:border-[var(--rule-2)] max-sm:bg-[var(--card)]" : "border-transparent text-[var(--ink-2)] hover:text-[var(--lila-ink)]"
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
