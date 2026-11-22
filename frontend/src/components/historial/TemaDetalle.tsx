import { useEffect, useRef } from "react";
import { t } from "../../i18n";
import { UMBRAL_CAMBIO, fechaCorta, type TemaDetalle as Datos } from "./datos";

const A = { W: 330, H: 130, l: 34, r: 12, t: 12, b: 24 };
const dia = (f: string) => new Date(f + "T00:00:00").getTime();

/** Evolución del tema día a día: una línea, el último valor rotulado. Con un solo día, solo el punto. */
function Linea({ puntos }: { puntos: Datos["puntos"] }) {
  if (!puntos.length) return null;
  const [d0, d1] = [dia(puntos[0].fecha), dia(puntos[puntos.length - 1].fecha)];
  const lo = Math.max(0, Math.floor((Math.min(...puntos.map((p) => p.percent)) - 5) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...puntos.map((p) => p.percent)) + 5) / 10) * 10);
  const x = (f: string) => A.l + (d1 === d0 ? 0.5 : (dia(f) - d0) / (d1 - d0)) * (A.W - A.l - A.r);
  const y = (v: number) => A.t + ((hi - v) / (hi - lo || 1)) * (A.H - A.t - A.b);
  const ult = puntos[puntos.length - 1];
  const d = puntos.map((p, i) => `${i ? "L" : "M"}${x(p.fecha).toFixed(1)},${y(p.percent).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${A.W} ${A.H}`} width="100%" role="img" aria-label={`Dominio de ${puntos[0].percent} % el ${fechaCorta(puntos[0].fecha)} a ${ult.percent} % el ${fechaCorta(ult.fecha)}`} className="hp-td-svg">
      <line x1={A.l} x2={A.l} y1={A.t} y2={A.H - A.b} className="hp-gl zero" />
      <line x1={A.l} x2={A.W - A.r} y1={A.H - A.b} y2={A.H - A.b} className="hp-gl zero" />
      {[lo, hi].map((v) => <text key={v} x={A.l - 6} y={y(v) + 4} textAnchor="end" className="hp-axis-t">{v}</text>)}
      {puntos.length > 1 && <path d={d} className="hp-line" stroke="var(--lila)" />}
      <circle cx={x(ult.fecha)} cy={y(ult.percent)} r="6" className="hp-dot" fill="var(--lila)" />
      <text x={Math.min(x(ult.fecha), A.W - A.r)} y={y(ult.percent) - 12} textAnchor="end" className="hp-val-t">{ult.percent} %</text>
      <text x={A.l} y={A.H - 6} className="hp-axis-t">{fechaCorta(puntos[0].fecha)}</text>
      <text x={A.W - A.r} y={A.H - 6} textAnchor="end" className="hp-axis-t">{fechaCorta(ult.fecha)}</text>
    </svg>
  );
}

/** La historia de un tema en una hoja: su evolución y lo que pide atención. Escape, el fondo o «Cerrar» la cierran. */
export function TemaDetalle({ datos, umbral, onCerrar }: { datos: Datos; umbral: number; onCerrar: () => void }) {
  const cerrar = useRef<HTMLButtonElement>(null);
  const hoja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    cerrar.current?.focus();
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCerrar(); }
      if (e.key !== "Tab") return;
      const f = [...(hoja.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? [])]; // el foco no sale de la hoja
      if (!f.length) return;
      const [a, z] = [f[0], f[f.length - 1]];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("keydown", tecla); document.body.style.overflow = previo; };
  }, [onCerrar]);

  const n = Math.abs(datos.delta);
  const cambio = datos.delta === 0 ? "sin cambios en el periodo" : `${n} ${n === 1 ? "punto" : "puntos"} ${datos.delta > 0 ? "más" : "menos"} en el periodo`;
  const tendencia = datos.delta >= UMBRAL_CAMBIO ? "Sube en este periodo" : datos.delta <= -UMBRAL_CAMBIO ? "Baja en este periodo" : "Se mantiene en este periodo";
  const veces = (k: number) => `${k} ${t(k === 1 ? "hist.vez" : "hist.veces")}`;
  return (
    <div className="hp-td-fondo" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div ref={hoja} className="hp-td" role="dialog" aria-modal="true" aria-labelledby="hp-td-t">
        <span className="hp-td-asa" aria-hidden="true" />
        <header className="hp-td-cab">
          <span className="hp-td-hex" aria-hidden="true">{datos.ahora} %</span>
          <div>
            <h2 id="hp-td-t">{datos.nombre}</h2>
            <p>Dominio {datos.ahora} %, {cambio}</p>
          </div>
          <button ref={cerrar} type="button" className="hp-td-x" aria-label="Cerrar" onClick={onCerrar}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <section className="hp-td-graf" aria-label="Evolución del tema">
          <h3>{tendencia}</h3>
          <p>Dominio al final de cada día de práctica.</p>
          <Linea puntos={datos.puntos} />
        </section>
        {(datos.cruce !== null || datos.recuerda || datos.trampa || datos.debil) && (
          <ul className="hp-td-hechos">
            {(datos.cruce !== null || datos.recuerda) && (
              <li><b>{datos.cruce !== null ? `Bajará del ${umbral} % en ${datos.cruce} ${datos.cruce === 1 ? "día" : "días"}` : `Tu memoria de este tema aguanta tres semanas por encima del ${umbral} %`}</b><small>{datos.cruce !== null ? "Si no lo repasas" : "Olvido"}</small></li>
            )}
            {datos.trampa && <li><b>{datos.trampa.trampa}, {veces(datos.trampa.n)}</b><small>Tu trampa más frecuente aquí</small></li>}
            {datos.debil && <li><b>{datos.debil.concepto}, {datos.debil.percent} %</b><small>Lo más débil de este tema</small></li>}
          </ul>
        )}
        <a className="hp-cta" href="#panal" onClick={onCerrar}>Ver en el panal</a>
      </div>
    </div>
  );
}
