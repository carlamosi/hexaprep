import { useEffect, useState } from "react";

/** Hexágono de vértices a izquierda y derecha: el mismo que el icono de la app. */
const HEX = (cx: number, cy: number, r: number) =>
  `M${Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * 60 * i;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join("L")}Z`;

/** Los seis hexágonos pequeños: salen del centro en arco (x con ease-out, y con ease-in-out) y entran en cadena cada 40 ms. */
const SATELITES = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 180) * (30 + 60 * i);
  const x = 120 + 104 * Math.cos(a), y = 120 + 104 * Math.sin(a);
  return { x, y, dx: -(x - 120) * 0.55, dy: -(y - 120) * 0.55, d: 150 + i * 40, o: i % 2 ? 0.55 : 0.95 };
});

/** El arranque entero cabe en 760 ms: 600 de movimiento y un instante quieto con el logo completo; el desvanecido dura FUNDIDO_MS más. */
export const SPLASH_MS = 760;
const FUNDIDO_MS = 200;

/** Solo se ve la primera vez de cada sesión del navegador: las recargas no repiten la espera. */
function yaVisto() {
  try {
    if (sessionStorage.getItem("hexaprep-splash")) return true;
    sessionStorage.setItem("hexaprep-splash", "1");
  } catch { /* sin almacenamiento: se muestra siempre */ }
  return false;
}

/** Pantalla de arranque con los colores del icono (así el paso del icono a la app no tiene salto): el hexágono aparece con un
 * pequeño rebote, el halo se enciende detrás, los seis hexágonos pequeños lo rodean en cadena y el nombre sube. Nunca está
 * vacía (el primer fotograma ya tiene color). Con movimiento reducido no se muestra. */
export function Splash() {
  const reducir = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [fase, setFase] = useState<"on" | "fuera" | "fin">(() => (reducir || yaVisto() ? "fin" : "on"));
  useEffect(() => {
    if (fase === "fin") return;
    const a = setTimeout(() => setFase("fuera"), SPLASH_MS);
    const b = setTimeout(() => setFase("fin"), SPLASH_MS + FUNDIDO_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [fase === "fin"]); // eslint-disable-line react-hooks/exhaustive-deps
  if (fase === "fin") return null;
  return (
    <div data-testid="splash" aria-hidden="true" className={`splash ${fase === "fuera" ? "splash-fuera" : ""}`}>
      <div className="splash-in">
        <svg viewBox="-20 -20 280 280" width="min(72vw, 280px)" height="min(72vw, 280px)">
          <defs>
            <radialGradient id="splash-luz"><stop offset="0" stopColor="#E27FB8" stopOpacity=".9" /><stop offset=".55" stopColor="#B05A8F" stopOpacity=".35" /><stop offset="1" stopColor="#B05A8F" stopOpacity="0" /></radialGradient>
            <linearGradient id="splash-cuerpo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF6FB" /><stop offset=".55" stopColor="#F7C6E0" /><stop offset="1" stopColor="#E58FC0" /></linearGradient>
          </defs>
          <circle className="splash-halo" cx="120" cy="120" r="125" fill="url(#splash-luz)" />
          {SATELITES.map((s, i) => (
            <g key={i} className="splash-sx" style={{ "--dx": `${s.dx}px`, animationDelay: `${s.d}ms` } as React.CSSProperties}>
              <g className="splash-sy" opacity={s.o} style={{ "--dy": `${s.dy}px`, animationDelay: `${s.d}ms` } as React.CSSProperties}>
                <path d={HEX(s.x, s.y, 17)} fill="#F7C6E0" stroke="#F7C6E0" strokeWidth="8" strokeLinejoin="round" className="splash-sat" style={{ animationDelay: `${s.d}ms` }} />
              </g>
            </g>
          ))}
          <path d={HEX(120, 120, 44)} fill="url(#splash-cuerpo)" stroke="url(#splash-cuerpo)" strokeWidth="18" strokeLinejoin="round" className="splash-hex" />
        </svg>
        <span className="splash-nombre">HexaPrep</span>
      </div>
    </div>
  );
}
