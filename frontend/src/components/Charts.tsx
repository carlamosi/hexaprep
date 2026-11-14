import { scaleLinear, scalePoint } from "d3-scale";
import type { History } from "../api";
import { t } from "../i18n";

const COLORES = ["var(--azul)", "var(--verde)", "var(--naranja)", "var(--rosa)", "var(--indigo)", "var(--ambar)", "var(--marron)", "var(--carmin)"];
const W = 600;
const H = 240;
const M = { l: 36, r: 12, t: 12, b: 28 };

/** Evolución del dominio por subtema: una línea por subtema (SVG propio con escalas de d3). */
export function Charts({ evolucion }: { evolucion: History["evolucion"] }) {
  const fechas = [...new Set(evolucion.flatMap((s) => s.puntos.map((p) => p.fecha)))].sort();
  const x = scalePoint<string>().domain(fechas).range([M.l, W - M.r]).padding(0.2);
  const y = scaleLinear().domain([0, 100]).range([H - M.b, M.t]);

  return (
    <section className="rounded-[16px] border border-[var(--rule)] bg-white p-5">
      <h2 className="font-semibold">{t("hist.evolucion")}</h2>
      <svg role="img" aria-label={t("hist.evolucion")} viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--rule)" />
            <text x={M.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">{v}</text>
          </g>
        ))}
        {fechas.length > 0 && (
          <>
            <text x={x(fechas[0])} y={H - 8} fontSize="11" fill="var(--ink-3)" textAnchor="start">{fechas[0]}</text>
            {fechas.length > 1 && (
              <text x={x(fechas[fechas.length - 1])} y={H - 8} fontSize="11" fill="var(--ink-3)" textAnchor="end">{fechas[fechas.length - 1]}</text>
            )}
          </>
        )}
        {evolucion.map((s, i) => {
          const color = COLORES[i % COLORES.length];
          const pts = s.puntos.map((p) => [x(p.fecha) ?? 0, y(p.percent)] as const);
          return (
            <g key={s.subtema_id}>
              {pts.length > 1 && <polyline fill="none" stroke={color} strokeWidth="2.5" points={pts.map((p) => p.join(",")).join(" ")} />}
              {pts.map(([cx, cy], k) => <circle key={k} cx={cx} cy={cy} r="4" fill={color} stroke="var(--ink)" strokeWidth="1" />)}
            </g>
          );
        })}
      </svg>
      <ul aria-label={t("hist.subtemas")} className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {evolucion.map((s, i) => (
          <li key={s.subtema_id} className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: COLORES[i % COLORES.length] }} />
            <span>{s.subtema}</span>
            <span className="tabular-nums text-[var(--ink-3)]">{s.puntos[s.puntos.length - 1]?.percent ?? 0} %</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
