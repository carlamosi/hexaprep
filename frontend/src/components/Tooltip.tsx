import { useEffect, useRef, useState, type ReactNode } from "react";
import "./tooltip.css";

/** Aviso flotante: punto de anclaje en coordenadas de la ventana (centro superior de la marca). */
export interface Tip { x: number; y: number; body: ReactNode }

export const tipDe = (el: Element, body: ReactNode, dx?: number): Tip => {
  const r = el.getBoundingClientRect();
  return { x: dx ?? r.left + r.width / 2, y: r.top, body };
};

/** Un solo aviso por pantalla, siempre dentro de la ventana. Decorativo para lectores de pantalla: el dato ya está en la etiqueta. */
export function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div className="hp-tip" aria-hidden="true" style={{ left: `clamp(100px, ${tip.x}px, calc(100vw - 100px))`, top: tip.y }}>
      {tip.body}
    </div>
  );
}

const DELTAS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };

/**
 * Marca activa de una gráfica: el ratón la elige al pasar y el teclado la mueve con las flechas
 * (una sola parada de tabulador por gráfica). Devuelve el aviso y un texto para `aria-live`.
 */
export function useActiva(n: number, opts: {
  cuerpo: (i: number) => ReactNode; texto: (i: number) => string; marca: (i: number) => Element | null | undefined;
  inicial?: number; deltas?: Record<string, number>; valida?: (i: number) => boolean;
}) {
  const [activo, setA] = useState<number | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const ok = opts.valida ?? (() => true);
  const ir = (i: number | null) => {
    setA(i);
    const el = i === null ? null : opts.marca(i);
    setTip(el && i !== null ? tipDe(el, opts.cuerpo(i)) : null);
  };
  const inicial = opts.inicial ?? n - 1;
  const props = {
    tabIndex: n ? 0 : -1,
    onFocus: () => ir(activo ?? inicial),
    onBlur: () => ir(null),
    onPointerLeave: () => ir(null),
    onKeyDown: (e: React.KeyboardEvent) => {
      const d = (opts.deltas ?? DELTAS)[e.key];
      if (!d) return;
      e.preventDefault();
      let i = activo ?? inicial;
      // salta las marcas sin datos en la dirección de la flecha
      for (let j = i + d; j >= 0 && j < n; j += d) if (ok(j)) { i = j; break; }
      ir(i);
    },
  };
  return { activo, ir, tip, props, vivo: activo === null ? "" : opts.texto(activo) };
}

/** Ancho real de un contenedor, para dibujar el SVG a su tamaño y que el texto no encoja en el móvil. */
export function useAncho<T extends HTMLElement>(inicial = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(inicial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.clientWidth) setW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
