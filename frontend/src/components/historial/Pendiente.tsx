import { scaleLinear } from "d3-scale";
import type { Analytics } from "../../api";
import { useAncho } from "../Tooltip";
import { fechaCorta, pendientes, titularPendientes, UMBRAL_CAMBIO, type ordenPanal } from "./datos";


/** Reparte las etiquetas de arriba abajo sin que se pisen, conservando el orden. */
function separar(ys: number[], LH: number): number[] {
  const idx = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
  const out = [...ys];
  idx.forEach((k, j) => { if (j && out[k] < out[idx[j - 1]] + LH) out[k] = out[idx[j - 1]] + LH; });
  return out;
}

/** Antes y después de cada tema: las líneas que se mueven llevan color, las que no, gris. */
export function Pendiente({ evolucion, orden }: { evolucion: Analytics["evolucion"]; orden: ReturnType<typeof ordenPanal> }) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const ps = pendientes(evolucion, orden);
  if (!ps.length) return <p className="hp-empty-line">Hacen falta al menos dos días de práctica para comparar el antes y el después.</p>;
  const W = Math.max(300, ancho), H = Math.max(220, ps.length * 30 + 80);
  const estrecho = W < 520; // en móvil el nombre baja a una segunda línea para no cortarse
  const izq = 64, der = W - Math.min(190, W * 0.45);
  const y = scaleLinear().domain([0, Math.max(10, Math.ceil(1.2 * Math.max(...ps.flatMap((p) => [p.antes, p.ahora]))))]).range([H - 44, 30]);
  const izqs = [...new Set(ps.map((p) => p.antes))], yl = separar(izqs.map(y), 17), yr = separar(ps.map((p) => y(p.ahora)), estrecho ? 30 : 17);
  const mueve = (d: number) => Math.abs(d) >= UMBRAL_CAMBIO;
  const resumen = ps.map((p) => `${p.nombre}: de ${p.antes} % a ${p.ahora} %`).join("; ");
  return (
    <div ref={ref} className="hp-slope">
      <svg width={W} height={H} role="img" aria-label={`${titularPendientes(ps)}. ${resumen}.`}>
        <text x={izq} y={12} textAnchor="middle" className="hp-axis-t">{fechaCorta(ps[0].desde)}</text>
        <text x={der} y={12} textAnchor="middle" className="hp-axis-t">{fechaCorta(ps[0].hasta)}</text>
        {ps.map((p, i) => {
          const c = mueve(p.delta) ? p.color : "var(--ink-3)";
          return (
            <g key={p.id} className={`hp-slope-g ${mueve(p.delta) ? "" : "is-quiet"}`}>
              <title>{`${p.nombre}: ${p.antes} % → ${p.ahora} %`}</title>
              <line x1={izq} x2={der} y1={y(p.antes)} y2={y(p.ahora)} stroke={c} strokeWidth={mueve(p.delta) ? 2.5 : 1.5} strokeLinecap="round" />
              <circle cx={izq} cy={y(p.antes)} r="4.5" fill={c} className="hp-dot" />
              <circle cx={der} cy={y(p.ahora)} r="4.5" fill={c} className="hp-dot" />
              <text x={der + 12} y={yr[i] + 4} className="hp-slope-n">
                <tspan className="hp-val-t">{p.ahora} % </tspan>
                <tspan className={p.delta > 0 ? "up" : p.delta < 0 ? "down" : ""}>{p.delta > 0 ? "▲ +" : p.delta < 0 ? "▼ " : "= "}{p.delta}</tspan>
                <tspan className="hp-slope-nom" {...(estrecho ? { x: der + 12, dy: 14 } : {})}>{estrecho ? "" : " "}{p.nombre}</tspan>
              </text>
            </g>
          );
        })}
        {izqs.map((v, k) => <text key={v} x={izq - 10} y={yl[k] + 4} textAnchor="end" className="hp-val-t">{v} %</text>)}
      </svg>
    </div>
  );
}
