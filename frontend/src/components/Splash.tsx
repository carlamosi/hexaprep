import { useEffect, useState } from "react";

const HEX = "M12 2.8 19.8 7.3v9.4L12 21.2 4.2 16.7V7.3Z";
/** Duración del dibujo y relleno del hexágono; la pantalla se desvanece justo después. */
export const SPLASH_MS = 900;

/** Pantalla de arranque: el hexágono se dibuja y se rellena en duotono, menos de 1 s. Solo al abrir la app. */
export function Splash() {
  const reducir = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [fase, setFase] = useState<"on" | "fuera" | "fin">(reducir ? "fin" : "on");
  useEffect(() => {
    if (reducir) return;
    const a = setTimeout(() => setFase("fuera"), SPLASH_MS);
    const b = setTimeout(() => setFase("fin"), SPLASH_MS + 300);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [reducir]);
  if (fase === "fin") return null;
  return (
    <div data-testid="splash" aria-hidden="true" className={`splash ${fase === "fuera" ? "splash-fuera" : ""}`}>
      <svg viewBox="0 0 24 24" width="120" height="120">
        <defs><clipPath id="splash-clip"><rect className="splash-llena" x="0" y="0" width="24" height="24" /></clipPath></defs>
        <g transform="translate(1.2 1.2)"><path d={HEX} fill="var(--lila-tint)" /></g>
        <path d={HEX} fill="var(--lila)" clipPath="url(#splash-clip)" />
        <path d={HEX} className="splash-trazo" pathLength="100" fill="none" stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span className="splash-nombre">HexaPrep</span>
    </div>
  );
}
