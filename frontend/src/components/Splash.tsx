import { useEffect, useState } from "react";

const HEX = (cx: number, cy: number, r: number) => {
  const p = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 90); // vértice arriba: el hexágono de la marca
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return `M${p.join("L")}Z`;
};
/** Los seis hexágonos de alrededor: color y retraso de aparición (en ms) para que entren en cadena. */
const SATELITES = [
  { a: 0, c: "var(--lila-tint)", d: 0 }, { a: 60, c: "var(--lila)", d: 60 }, { a: 120, c: "var(--lila-soft)", d: 120 },
  { a: 180, c: "var(--lila-tint)", d: 180 }, { a: 240, c: "var(--lila)", d: 240 }, { a: 300, c: "var(--lila-soft)", d: 300 },
].map((s) => ({ ...s, x: 120 + 94 * Math.cos((Math.PI / 180) * s.a), y: 120 + 94 * Math.sin((Math.PI / 180) * s.a) }));

/** Duración total del arranque; el desvanecido final dura FUNDIDO_MS más. */
export const SPLASH_MS = 1000;
const FUNDIDO_MS = 250;

/** Pantalla de arranque: el panal se arma de golpe (seis hexágonos que entran en cadena), el hexágono central se dibuja
 * y se rellena en duotono y el nombre sube. Nunca está vacía: el primer fotograma ya tiene color. Solo al abrir la app. */
export function Splash() {
  const reducir = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [fase, setFase] = useState<"on" | "fuera" | "fin">(reducir ? "fin" : "on");
  useEffect(() => {
    if (reducir) return;
    const a = setTimeout(() => setFase("fuera"), SPLASH_MS);
    const b = setTimeout(() => setFase("fin"), SPLASH_MS + FUNDIDO_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [reducir]);
  if (fase === "fin") return null;
  return (
    <div data-testid="splash" aria-hidden="true" className={`splash ${fase === "fuera" ? "splash-fuera" : ""}`}>
      <svg viewBox="-20 -20 280 280" width="min(80vw, 300px)" height="min(80vw, 300px)">
        <defs><clipPath id="splash-clip"><rect className="splash-llena" x="60" y="60" width="120" height="120" /></clipPath></defs>
        {SATELITES.map((s, i) => (
          <path key={i} d={HEX(s.x, s.y, 40)} fill={s.c} className="splash-sat" style={{ animationDelay: `${s.d}ms` }} />
        ))}
        <path d={HEX(125, 125, 54)} fill="var(--lila-tint)" className="splash-sombra" />
        <path d={HEX(120, 120, 54)} fill="var(--lila)" clipPath="url(#splash-clip)" />
        <path d={HEX(120, 120, 54)} className="splash-trazo" pathLength="100" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <span className="splash-nombre">HexaPrep</span>
    </div>
  );
}
