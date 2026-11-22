import { motion, useReducedMotion } from "motion/react";
import { EASE } from "../motion";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { Hex, MapResponse } from "../api";
import { t, tn } from "../i18n";
import { Hexagon } from "./Hexagon";
import { colorTema } from "../colorTema";
import { Buscador } from "./Buscador";
import { group } from "./HexMap";
import { tipDe, Tooltip, type Tip } from "./Tooltip";
import "./panel.css";
import { numeroTema, sinPrefijoTema } from "../rotulo";

const POINTS = "25,1 75,1 99,43.3 75,85.6 25,85.6 1,43.3";
// Geometría en unidades del viewBox (-2 -2 110 96) pasadas a anchos de caja: paso entre columnas y alto de fila.
const COL = (75 / 110) * 1.04;
const FILA = (86.6 / 110) * 1.06;
const ALTO = 96 / 110;
const MAX_S = 76;
const MOVIL_S = 42; // en el móvil el panal hace scroll vertical: tamaño fijo y legible
const inicial = () => (typeof window !== "undefined" && window.innerWidth < 640 ? MOVIL_S : MAX_S);

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const pctTxt = (p: number) => `${Math.round(p)} %`;

/** Hexágono de la marca en miniatura: sombra desplazada, relleno que sube con el dominio y contorno de tinta. */
function MiniHex({ percent, grain, delay, reduce }: { percent: number; grain: string; delay: number; reduce: boolean }) {
  const clip = useId();
  const p = Math.max(0, Math.min(100, percent)) / 100;
  return (
    <svg viewBox="-2 -2 110 96" aria-hidden="true" focusable="false" className="pm-hex-svg">
      <defs><clipPath id={clip}><polygon points={POINTS} /></clipPath></defs>
      <polygon className="shadow" points={POINTS} transform="translate(7 7)" filter={`url(#${grain})`} />
      <g clipPath={`url(#${clip})`}>
        <rect className="base" width="100" height="87" />
        <motion.rect
          className="level" width="100" height="87"
          style={{ originY: 1, transformBox: "fill-box" }}
          initial={reduce ? false : { scaleY: 0 }}
          animate={{ scaleY: p }}
          transition={reduce ? { duration: 0 } : { duration: 0.4, delay, ease: EASE }}
        />
      </g>
      <polygon className="line" points={POINTS} />
    </svg>
  );
}

/** Una sola masa de hexágonos: el temario de abajo arriba (los primeros temas abajo, los más nuevos arriba), en filas con
 * columnas desplazadas media fila. El color dice el tema; el relleno, el progreso del concepto. */
function PanalUnico({ hexes, colores, s, cols, grain, reduce, onTip, onSelect }: {
  hexes: Hex[]; colores: Map<string, string>; s: number; cols: number; grain: string; reduce: boolean;
  onTip: (tip: Tip | null) => void; onSelect: (subtemaId: string) => void;
}) {
  const filas = Math.ceil(hexes.length / cols);
  const show = (el: Element, h: Hex) =>
    onTip(tipDe(el, <><b>{pctTxt(h.percent)}</b><span>{h.nombre}</span><span className="hp-tip-n">{sinPrefijoTema(h.tema)} · {h.subtema}</span></>));
  return (
    <div className="pm-cluster pm-masa" style={{ width: (cols - 1) * COL * s + s, height: (filas - 1) * FILA * s + ALTO * s + (cols > 1 ? (FILA * s) / 2 : 0) + 0.07 * s }}>
      {hexes.map((h, i) => {
        const c = i % cols;
        const r = filas - 1 - Math.floor(i / cols); // la primera fila (los primeros temas) queda abajo
        const color = colores.get(h.tema_id) ?? "var(--lila)";
        return (
          <button
            key={h.concepto_id} type="button" className="pm-hex"
            aria-label={`${h.nombre}, ${Math.round(h.percent)} ${t("panal.porCientoDominio")}`}
            style={{ left: c * COL * s, top: r * FILA * s + (c % 2 ? (FILA * s) / 2 : 0), width: s, "--c": color, "--tc": color } as React.CSSProperties}
            onClick={() => onSelect(h.subtema_id)}
            onPointerEnter={(e) => show(e.currentTarget, h)} onPointerLeave={() => onTip(null)}
            onFocus={(e) => show(e.currentTarget, h)} onBlur={() => onTip(null)}
          >
            <MiniHex percent={h.percent} grain={grain} delay={Math.min(0.5, 0.15 + i * 0.006)} reduce={reduce} />
          </button>
        );
      })}
    </div>
  );
}

/** Leyenda: el relleno es el dominio y el color, el tema. */
function Leyenda({ grain }: { grain: string }) {
  return (
    <div className="pm-legend" aria-label={`${t("panel.escala")}. ${t("panel.colores")}.`} role="img">
      <span className="pm-legend-scale" style={{ "--c": "var(--ink-3)", "--tc": "var(--ink-3)" } as React.CSSProperties}>
        {[0, 25, 50, 75, 100].map((v) => (
          <span key={v} className="pm-legend-step"><MiniHex percent={v} grain={grain} delay={0} reduce /><small>{v}</small></span>
        ))}
      </span>
    </div>
  );
}

/** Panal de toda la asignatura en una sola pantalla, sin scroll: un color por tema y un tono por subtema. */
export function PanelAsignatura({ map, onClose, onSelectSubtema }: { map: MapResponse; onClose: () => void; onSelectSubtema?: (id: string) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const grain = useId();
  const reduce = useReducedMotion() ?? false;
  const [s, setS] = useState(inicial);
  const [tip, setTip] = useState<Tip | null>(null);

  // Se encoge el hexágono hasta que todo cabe sin scroll (en el móvil no: ahí se hace scroll).
  useLayoutEffect(() => {
    const b = bodyRef.current;
    if (window.innerWidth < 640) return;
    if (b && b.scrollHeight > b.clientHeight + 1 && s > 16) setS(Math.max(16, s - (s > 40 ? 4 : 2)));
  }, [s]);
  useEffect(() => {
    const onResize = () => setS(inicial());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const temas = group(map.hexes);
  const base = map.hexes[0]?.color ?? "";
  const colores = new Map(temas.map((x, i) => [x.id, colorTema(base, i, temas.length)]));
  const cols = typeof window !== "undefined" && window.innerWidth < 640 ? 7 : 14;
  const nSub = temas.reduce((a, x) => a + x.subtemas.length, 0);

  return (
    <motion.div className="pm-backdrop" onClick={onClose} {...(reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } })}>
      <motion.div
        className="pm" role="dialog" aria-modal="true" aria-label={`${t("panal.verPanal")} ${map.asignatura}`}
        onClick={(e) => e.stopPropagation()}
        {...(reduce ? {} : { initial: { opacity: 0, y: 14, scale: 0.985 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.3, ease: EASE } })}
      >
        <svg className="pm-defs" aria-hidden="true" focusable="false">
          <filter id={grain} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="1.35" numOctaves="2" seed="7" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 1.75" result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
          </filter>
        </svg>
        <header className="pm-head">
          <span className="pm-head-hex"><Hexagon percent={map.percent} color="var(--lila)" big /></span>
          <div className="pm-head-txt">
            <h2>{map.asignatura}</h2>
            <p>{tn("panal.conceptos", map.hexes.length)} · {tn("panal.temas", temas.length)} · {tn("panal.subtemas", nSub)}</p>
          </div>
          <Leyenda grain={grain} />
          <button ref={closeRef} type="button" onClick={onClose} className="pm-close" aria-label={t("panal.cerrar")}>
            <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="pm-body" ref={bodyRef}>
          <div className="pm-masa-top"><Buscador hexes={map.hexes} onElegir={(id) => onSelectSubtema?.(id)} /></div>
          <PanalUnico hexes={map.hexes} colores={colores} s={s} cols={cols} grain={grain} reduce={reduce} onTip={setTip} onSelect={(id) => onSelectSubtema?.(id)} />
          <ul className="pm-temas" aria-label={t("panal.temas")}>
            {[...temas].reverse().map((tema, k) => {
              const tp = mean(tema.subtemas.flatMap((x) => x.hexes.map((h) => h.percent)));
              return (
                <li key={tema.id} style={{ "--tc": colores.get(tema.id) } as React.CSSProperties}>
                  <i className="pm-chip" aria-hidden="true" />
                  <span className="pm-kicker">{t("panal.tema")} {numeroTema(tema.nombre, temas.length - k)}</span>
                  <span className="pm-tema-n">{sinPrefijoTema(tema.nombre)}</span>
                  <b className="pm-tema-pct" data-testid={`pm-tema-pct-${tema.id}`}>{tp}<small>&nbsp;%</small></b>
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>
      <Tooltip tip={tip} />
    </motion.div>
  );
}
