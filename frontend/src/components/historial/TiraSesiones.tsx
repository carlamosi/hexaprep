import { scaleLinear, scaleSqrt } from "d3-scale";
import type { Analytics } from "../../api";
import { useAncho } from "../Tooltip";
import { duracion, fechaCorta, fiable, modo } from "./datos";

const M = { l: 44, r: 16, t: 14, b: 26 };

/** Las últimas sesiones en orden de fecha: altura = acierto, tamaño del punto = duración. Tabla debajo con los números. */
export function TiraSesiones({ sesiones }: { sesiones: Analytics["sesiones_recientes"] }) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const xs = sesiones.filter((s) => fiable(s.n)).sort((a, b) => a.inicio.localeCompare(b.inicio));
  if (xs.length < 2) return null;
  const W = Math.max(280, ancho), H = 190;
  const x = scaleLinear().domain([0, xs.length - 1]).range([M.l + 12, W - M.r - 12]);
  const y = scaleLinear().domain([0, 100]).range([H - M.b, M.t]);
  const r = scaleSqrt().domain([0, Math.max(...xs.map((s) => s.duracion_s))]).range([4, 13]);
  const pc = (s: (typeof xs)[number]) => Math.round((100 * s.aciertos) / s.n);
  const media = Math.round((100 * xs.reduce((a, s) => a + s.aciertos, 0)) / xs.reduce((a, s) => a + s.n, 0));
  const resumen = `Acierto de cada sesión, de la más antigua a la más reciente: ${xs.map((s) => `${fechaCorta(s.inicio.slice(0, 10))} ${pc(s)} % en ${duracion(s.duracion_s)}`).join("; ")}.`;
  return (
    <div ref={ref} className="hp-strip">
      <svg width={W} height={H} role="img" aria-label={resumen}>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className={v === 0 ? "hp-gl zero" : "hp-gl"} />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="hp-axis-t">{v} %</text>
          </g>
        ))}
        <line x1={M.l} x2={W - M.r} y1={y(media)} y2={y(media)} className="hp-strip-media" />
        <text x={W - M.r} y={y(media) - 5} textAnchor="end" className="hp-axis-t">tu media {media} %</text>
        {xs.map((s, i) => (
          <g key={s.sesion_id}>
            <title>{`${fechaCorta(s.inicio.slice(0, 10))}, ${modo(s.modo)}: ${pc(s)} % en ${duracion(s.duracion_s)} (${s.aciertos}/${s.n})`}</title>
            <circle cx={x(i)} cy={y(pc(s))} r={r(s.duracion_s)} className={`hp-strip-dot`} />
            {(i === 0 || i === xs.length - 1 || xs.length < 8) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" className="hp-axis-t">{fechaCorta(s.inicio.slice(0, 10))}</text>
            )}
          </g>
        ))}
      </svg>
      <p className="hp-note">Cada punto es una sesión; cuanto más grande, más larga. Solo cuentan las sesiones con respuestas suficientes.</p>
    </div>
  );
}
