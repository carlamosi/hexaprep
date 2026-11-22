import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { EASE } from "../motion";
import "./hexmap.css";

const POINTS = "25,1 75,1 99,43.3 75,85.6 25,85.6 1,43.3";

/* El relleno sube desde 0 solo la primera vez que se ve un hexágono en la visita; después, volver al panal no repite la animación y solo se mueve si el valor cambia. */
let primeraVez = true;

/** Hexágono de la marca: relleno que sube desde abajo hasta `percent`, contorno de tinta y sombra con grano. */
export function Hexagon({ percent, color, big = false }: { percent: number; color?: string; big?: boolean }) {
  const id = useId();
  const reduce = useReducedMotion();
  const [desdeCero] = useState(() => { const v = primeraVez; primeraVez = false; return v; });
  const p = Math.max(0, Math.min(100, percent)) / 100;
  return (
    <div className="hex-wrap" style={color ? ({ "--c": color } as React.CSSProperties) : undefined}>
      <svg className="hex" viewBox="-2 -2 110 96" aria-hidden="true" focusable="false">
        <defs>
          <filter id={`${id}g`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="1.35" numOctaves="2" seed="7" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 1.75" result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
          </filter>
          <clipPath id={`${id}c`}><polygon points={POINTS} /></clipPath>
        </defs>
        <polygon className="shadow" points={POINTS} transform="translate(6 6)" filter={`url(#${id}g)`} />
        <g clipPath={`url(#${id}c)`}>
          <rect className="base" width="100" height="87" />
          <motion.rect
            className="level" width="100" height="87" data-fill={p}
            style={{ originY: 1, transformBox: "fill-box" }}
            initial={reduce || !desdeCero ? false : { scaleY: 0 }}
            animate={{ scaleY: p }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE }}
          />
        </g>
        <polygon className="line" points={POINTS} />
      </svg>
      <span className="hex-pct">{Math.round(percent)}{big ? <small>&nbsp;%</small> : " %"}</span>
    </div>
  );
}
