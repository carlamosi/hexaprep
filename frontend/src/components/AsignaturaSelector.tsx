import { useEffect, useRef, useState } from "react";
import type { Subject } from "../api";
import { t } from "../i18n";
import "./selector.css";

interface Props {
  asignaturas: Subject[];
  actual: string | null;
  onElegir: (id: string) => void;
  /** Se llama al abrir: es el momento de refrescar el progreso de cada asignatura. */
  onAbrir?: () => void;
}

/** Selector de asignatura: botón con la asignatura actual y tarjetas con su progreso, manejable con teclado. */
export function AsignaturaSelector({ asignaturas, actual, onElegir, onAbrir }: Props) {
  const [open, setOpen] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const cur = asignaturas.find((a) => a.id === actual) ?? asignaturas[0];

  const enfocarActual = () => raiz.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')?.focus();
  const [sale, setSale] = useState(false);
  const salida = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(salida.current), []);

  /** Cierra con una salida corta (`.asig-sale`, menos de la mitad de lo que tarda en abrir). */
  function cerrar(devolverFoco = true) {
    if (devolverFoco) boton.current?.focus();
    if (sale) return;
    setSale(true);
    salida.current = setTimeout(() => { setOpen(false); setSale(false); }, 120);
  }

  useEffect(() => {
    if (!open) return;
    enfocarActual();
    const fuera = (e: PointerEvent) => !raiz.current?.contains(e.target as Node) && cerrar(false);
    document.addEventListener("pointerdown", fuera); // en iOS tocar una zona vacía no genera mousedown
    return () => document.removeEventListener("pointerdown", fuera);
  }, [open]);

  function teclas(e: React.KeyboardEvent) {
    const ops = [...(raiz.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    const i = ops.indexOf(document.activeElement as HTMLElement);
    const ir = (k: number) => { e.preventDefault(); ops[(k + ops.length) % ops.length]?.focus(); };
    if (e.key === "ArrowDown") ir(i + 1);
    else if (e.key === "ArrowUp") ir(i - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(ops.length - 1);
    else if (e.key === "Escape") { e.preventDefault(); cerrar(); }
    else if (e.key === "Tab") cerrar(false);
  }

  function elegir(id: string) {
    cerrar();
    if (id !== cur?.id) onElegir(id);
  }

  return (
    <div className="asig-sel" ref={raiz} style={{ "--c": cur?.acento } as React.CSSProperties}>
      <button
        ref={boton} type="button" className="asig-btn" aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${t("nav.asignatura")}: ${cur?.nombre ?? ""}`}
        onClick={() => {
          if (sale) { clearTimeout(salida.current); setSale(false); enfocarActual(); } // pulsar mientras se cierra lo vuelve a abrir desde donde estaba
          else if (open) cerrar(false);
          else { onAbrir?.(); setOpen(true); }
        }}
      >
        <i aria-hidden="true" className="asig-dot" />
        <span className="asig-nombre">{cur?.nombre}</span>
        <svg aria-hidden="true" viewBox="0 0 12 8" width="11" height="8" className={open && !sale ? "asig-chev is-open" : "asig-chev"}>
          <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className={sale ? "asig-pop asig-sale" : "asig-pop"} role="listbox" aria-label={t("nav.asignatura")} onKeyDown={teclas}>
          {asignaturas.map((a) => (
            <button
              key={a.id} type="button" role="option" aria-selected={a.id === cur?.id} className="asig-op"
              style={{ "--c": a.acento, "--p": `${Math.round(a.percent)}%` } as React.CSSProperties}
              onClick={() => elegir(a.id)}
            >
              <span aria-hidden="true" className="asig-hex" />
              <span className="asig-txt">
                <span className="asig-op-nombre">{a.nombre}</span>
                <span className="asig-op-meta">{a.idioma.toUpperCase()} · {Math.round(a.percent)} % {t("panal.dominio").toLowerCase()}</span>
              </span>
              <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" className="asig-check">
                <path d="m3 8.5 3.2 3.2L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
