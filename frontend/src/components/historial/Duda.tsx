import { scaleLinear } from "d3-scale";
import type { Analytics } from "../../api";
import { useAncho } from "../Tooltip";
import { ACIERTO_SABE, cuadrante, fiable, RITMO_LENTO, type Concepto } from "./datos";

const M = { l: 44, r: 14, t: 14, b: 36 };
const X_MAX = 3; // por encima de «triple del tiempo esperado» el punto se pega al borde
const x1 = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");

/** Cada concepto: cuánto tardas (frente a lo esperado) y cuánto aciertas. Los cuadrantes separan «dudo» de «no sé». */
export function Duda({ conceptos }: { conceptos: Analytics["conceptos"] }) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const W = Math.max(280, ancho), H = W < 520 ? 280 : 320;
  const x = scaleLinear().domain([0, X_MAX]).range([M.l, W - M.r]);
  const y = scaleLinear().domain([0, 100]).range([H - M.b, M.t]);
  const cx = x(RITMO_LENTO), cy = y(ACIERTO_SABE);
  const q = (c: Concepto) => cuadrante(c);
  const etiqueta = (t: string, px: number, py: number, anchor: "start" | "end") => (
    <text x={px} y={py} textAnchor={anchor} className="hp-quad-t">{t}</text>
  );
  const primero = conceptos.filter((c) => ["duda", "nosabe"].includes(q(c))).sort((a, b) => (a.aciertos_pct ?? 0) - (b.aciertos_pct ?? 0) || b.ritmo - a.ritmo).slice(0, 5);
  return (
    <div ref={ref}>
    <svg width={W} height={H} role="img" aria-label={`Dispersión de ${conceptos.length} conceptos: tiempo frente a lo esperado y acierto.`}>
      <rect x={cx} y={M.t} width={W - M.r - cx} height={cy - M.t} className="hp-quad duda" />
      <rect x={cx} y={cy} width={W - M.r - cx} height={H - M.b - cy} className="hp-quad nosabe" />
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className={v === 0 ? "hp-gl zero" : "hp-gl"} />
          <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="hp-axis-t">{v} %</text>
        </g>
      ))}
      <line x1={M.l} x2={W - M.r} y1={cy} y2={cy} className="hp-quad-l" />
      <line x1={cx} x2={cx} y1={M.t} y2={H - M.b} className="hp-quad-l" />
      {[0, 1, 2, 3].map((v) => (
        <text key={v} x={x(v)} y={H - 18} textAnchor={v === 0 ? "start" : v === X_MAX ? "end" : "middle"} className="hp-axis-t">{v === 1 ? "lo esperado" : `×${v}`}</text>
      ))}
      <text x={(M.l + W - M.r) / 2} y={H - 3} textAnchor="middle" className="hp-axis-t">← rápido · tiempo frente a lo esperado · lento →</text>
      {etiqueta("Dominado", M.l + 8, M.t + 14, "start")}
      {etiqueta("Aciertas con duda", W - M.r - 8, M.t + 14, "end")}
      {etiqueta("Fallas deprisa", M.l + 8, H - M.b - 8, "start")}
      {etiqueta("Aún no lo sabes", W - M.r - 8, H - M.b - 8, "end")}
      {conceptos.map((c) => (
        <circle key={c.concepto_id} cx={x(Math.min(c.ritmo, X_MAX))} cy={y(c.aciertos_pct ?? 0)} r="5.5"
          className={`hp-dp ${q(c)} ${fiable(c.n) ? "" : "is-low"}`}>
          <title>{`${c.concepto} (${c.subtema}): ${c.aciertos_pct ?? 0} % de acierto, ×${x1(c.ritmo)} del tiempo esperado, ${c.n} respuestas`}</title>
        </circle>
      ))}
    </svg>
      {!!primero.length && (
        <ol className="hp-dudo-l" aria-label="Para repasar primero">
          {primero.map((c) => <li key={c.concepto_id}><b>{c.concepto}</b> <small>{c.subtema} · {c.aciertos_pct} % de acierto, ×{x1(c.ritmo)} del tiempo esperado</small></li>)}
        </ol>
      )}
    </div>
  );
}
