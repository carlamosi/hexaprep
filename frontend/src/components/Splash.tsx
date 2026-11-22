import { useEffect, useRef, useState } from "react";
import { alCambiar, todoListo } from "../arranque";
import { CAMBIO_TEMA } from "../tema";
import { HEX, LEMA, SAT_BASE } from "./Marca";

/** Los seis hexágonos pequeños: salen del centro en arco (x con ease-out, y con ease-in-out) y entran en cadena cada 45 ms. */
const SATELITES = SAT_BASE.map((s, i) => {
  const x = 120 + s.l * Math.cos((Math.PI / 180) * s.a), y = 120 + s.l * Math.sin((Math.PI / 180) * s.a);
  return { ...s, x, y, dx: -(x - 120) * 0.55, dy: -(y - 120) * 0.55, d: 180 + i * 45 };
});

/** Tiempo mínimo en pantalla (para que la entrada se vea entera y la barra avance); después espera a que la app esté lista. */
export const SPLASH_MS = 1200;
/** Tope: si algo no llega (red lenta), la splash se cierra igual y la app enseña su propio estado de carga. */
const MAX_MS = 5000;
const CIERRE_BARRA_MS = 240;
const FUNDIDO_MS = 220;

/** Solo se ve la primera vez de cada sesión del navegador: las recargas no repiten la espera. */
function yaVisto() {
  try {
    if (sessionStorage.getItem("hexaprep-splash")) return true;
    sessionStorage.setItem("hexaprep-splash", "1");
  } catch { /* sin almacenamiento: se muestra siempre */ }
  return false;
}

/** Pantalla de arranque con los colores del icono (así el paso del icono a la app no tiene salto): el hexágono aparece con un
 * pequeño rebote y un destello, el halo se enciende y respira detrás, los seis hexágonos pequeños lo rodean en cadena, el nombre
 * y el lema suben y una barra de carga avanza. La barra es honesta: sube rápido, se queda a unos tres cuartos mientras la app
 * carga de verdad (acceso y tipografía) y se completa al llegar. Nunca está vacía (el primer fotograma ya tiene color).
 * Con movimiento reducido no se muestra. */
export function Splash() {
  const reducir = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [fase, setFase] = useState<"on" | "fuera" | "fin">(() => (reducir || yaVisto() ? "fin" : "on"));
  const barra = useRef<HTMLSpanElement>(null);

  /** Retoma la barra donde esté (no desde cero) y la lleva al 100 %: el movimiento se puede interrumpir sin saltos. */
  function completarBarra() {
    const el = barra.current;
    if (!el) return;
    let actual = 0;
    try { actual = new DOMMatrixReadOnly(getComputedStyle(el).transform).a; } catch { /* sin DOMMatrix: arranca desde cero */ }
    el.style.animation = "none";
    el.style.transform = `scaleX(${actual})`;
    void el.offsetWidth; // fija el valor actual antes de transicionar
    el.style.transition = `transform ${CIERRE_BARRA_MS}ms var(--ease)`;
    el.style.transform = "scaleX(1)";
  }

  useEffect(() => {
    const raiz = document.documentElement;
    if (fase === "fin") { raiz.style.removeProperty("background"); return; } // el fondo ciruela que index.html pone antes de cargar
    // Mientras dura, la barra del navegador (y la de iOS) toma el color del fondo; al acabar, el encabezado la repinta
    const meta = document.querySelector('meta[name="theme-color"]');
    const antes = meta?.getAttribute("content");
    meta?.setAttribute("content", "#2A1030");

    let minimo = false, cerrando = false;
    const temporizadores: ReturnType<typeof setTimeout>[] = [];
    const cerrar = () => {
      if (cerrando) return;
      cerrando = true;
      completarBarra();
      temporizadores.push(
        setTimeout(() => setFase("fuera"), CIERRE_BARRA_MS + 80), // un respiro con la barra llena antes de salir
        setTimeout(() => setFase("fin"), CIERRE_BARRA_MS + 80 + FUNDIDO_MS),
      );
    };
    const comprobar = () => { if (minimo && todoListo()) cerrar(); };
    temporizadores.push(setTimeout(() => { minimo = true; comprobar(); }, SPLASH_MS), setTimeout(cerrar, MAX_MS));
    const dejarDeEscuchar = alCambiar(comprobar);
    return () => {
      temporizadores.forEach(clearTimeout);
      dejarDeEscuchar();
      if (antes) meta?.setAttribute("content", antes);
      window.dispatchEvent(new Event(CAMBIO_TEMA));
    };
  }, [fase === "fin"]); // eslint-disable-line react-hooks/exhaustive-deps
  if (fase === "fin") return null;
  return (
    <div data-testid="splash" aria-hidden="true" className={`splash ${fase === "fuera" ? "splash-fuera" : ""}`}>
      <div className="splash-in">
        <svg viewBox="-20 -20 280 280" width="min(72vw, 280px)" height="min(72vw, 280px)">
          <defs>
            <radialGradient id="splash-luz"><stop offset="0" stopColor="#E27FB8" stopOpacity=".9" /><stop offset=".55" stopColor="#B05A8F" stopOpacity=".35" /><stop offset="1" stopColor="#B05A8F" stopOpacity="0" /></radialGradient>
            <linearGradient id="splash-cuerpo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF6FB" /><stop offset=".55" stopColor="#F7C6E0" /><stop offset="1" stopColor="#E58FC0" /></linearGradient>
            <linearGradient id="splash-destello"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
            <clipPath id="splash-recorte"><path d={HEX(120, 120, 50)} /></clipPath>
          </defs>
          <circle className="splash-halo" cx="120" cy="120" r="125" fill="url(#splash-luz)" />
          {SATELITES.map((s, i) => (
            <g key={i} className="splash-sx" style={{ "--dx": `${s.dx}px`, animationDelay: `${s.d}ms` } as React.CSSProperties}>
              <g className="splash-sy" opacity={s.o} style={{ "--dy": `${s.dy}px`, animationDelay: `${s.d}ms` } as React.CSSProperties}>
                <path d={HEX(s.x, s.y, s.r)} fill="#F7C6E0" stroke="#F7C6E0" strokeWidth="8" strokeLinejoin="round" className="splash-sat" style={{ animationDelay: `${s.d}ms` }} />
              </g>
            </g>
          ))}
          <path d={HEX(120, 120, 44)} fill="url(#splash-cuerpo)" stroke="url(#splash-cuerpo)" strokeWidth="18" strokeLinejoin="round" className="splash-hex" />
          <g clipPath="url(#splash-recorte)"><rect className="splash-brillo" x="70" y="60" width="34" height="120" fill="url(#splash-destello)" /></g>
        </svg>
        <span className="splash-nombre">HexaPrep</span>
        <span lang="en" className="splash-lema">{LEMA}</span>
        <span className="splash-barra"><span ref={barra} className="splash-barra-i" /></span>
      </div>
    </div>
  );
}
