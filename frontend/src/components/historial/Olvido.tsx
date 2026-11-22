import { scaleLinear } from "d3-scale";
import type { Analytics } from "../../api";
import { useAncho } from "../Tooltip";
import { sinPrefijoTema } from "../../rotulo";
import type { ordenPanal } from "./datos";

const M = { l: 44, r: 14, t: 14, b: 30 };
/** Conceptos que se muestran de entrada; el resto, plegado, para que la tarjeta no crezca sin fin. */
const VISIBLES = 4;

/** Cuánto recordarás de cada tema dentro de unos días, según la memoria de cada concepto (FSRS). */
export function Olvido({ olvido, orden }: { olvido: Analytics["olvido"]; orden: ReturnType<typeof ordenPanal> }) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const W = Math.max(280, ancho), H = W < 520 ? 230 : 270;
  const x = scaleLinear().domain([0, olvido.dias[olvido.dias.length - 1] ?? 21]).range([M.l, W - M.r]);
  const piso = Math.min(olvido.umbral - 10, ...olvido.temas.map((t) => Math.min(...t.curva))); // el eje arranca bajo la curva más baja, no en 0
  const y = scaleLinear().domain([Math.max(0, Math.floor((piso - 5) / 10) * 10), 100]).range([H - M.b, M.t]);
  const resumen = olvido.temas.map((t) => `${sinPrefijoTema(t.tema)}: de ${Math.round(t.curva[0])} % hoy a ${Math.round(t.curva[t.curva.length - 1])} % dentro de ${olvido.dias[olvido.dias.length - 1]} días`).join("; ");
  const fila = (c: Analytics["olvido"]["cruces"][number]) => (
    <li key={c.concepto_id}><b>{c.concepto}</b> <small>{sinPrefijoTema(c.tema)} · bajará del {olvido.umbral} % en {c.dia} {c.dia === 1 ? "día" : "días"}</small></li>
  );
  const ordenados = [...olvido.temas].sort((a, b) => (orden.get(a.tema_id)?.indice ?? 99) - (orden.get(b.tema_id)?.indice ?? 99));
  return (
    <div className="hp-olvido">
     <div ref={ref} className="hp-olvido-graf">
      <svg width={W} height={H} role="img" aria-label={`Curva de olvido. ${resumen}.`}>
        {y.ticks(4).map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className={v === y.domain()[0] ? "hp-gl zero" : "hp-gl"} />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="hp-axis-t">{v} %</text>
          </g>
        ))}
        {[0, 7, 14, 21].map((d) => (
          <text key={d} x={x(d)} y={H - 10} textAnchor={d === 0 ? "start" : d === 21 ? "end" : "middle"} className="hp-axis-t">{d === 0 ? "hoy" : `+${d} días`}</text>
        ))}
        <line x1={M.l} x2={W - M.r} y1={y(olvido.umbral)} y2={y(olvido.umbral)} className="hp-umbral" />
        <text x={W - M.r} y={y(olvido.umbral) - 6} textAnchor="end" className="hp-axis-t">por debajo de {olvido.umbral} %, repasa</text>
        {ordenados.map((t) => (
          <path key={t.tema_id} className="hp-line" stroke={orden.get(t.tema_id)?.color ?? "var(--ink-3)"}
            d={`M${t.curva.map((v, i) => `${x(olvido.dias[i])},${y(v)}`).join("L")}`}>
            <title>{`${sinPrefijoTema(t.tema)}: ${Math.round(t.curva[0])} % hoy, ${Math.round(t.curva[t.curva.length - 1])} % en 21 días (${t.n} conceptos)`}</title>
          </path>
        ))}
      </svg>
      <ul className="hp-legend" aria-label="Temas">
        {ordenados.map((t) => (
          <li key={t.tema_id}>
            <svg width="22" height="10" aria-hidden="true" className="hp-key"><line x1="1" x2="21" y1="5" y2="5" stroke={orden.get(t.tema_id)?.color ?? "var(--ink-3)"} strokeWidth="2.5" strokeLinecap="round" /></svg>
            <span>{sinPrefijoTema(t.tema)}</span><b>{Math.round(t.curva[0])} % → {Math.round(t.curva[t.curva.length - 1])} %</b>
          </li>
        ))}
      </ul>
     </div>
      {!!olvido.cruces.length && (
        <div className="hp-olvido-der">
          <ol className="hp-olvido-l" aria-label="Conceptos que cruzan el umbral">
            {olvido.cruces.slice(0, VISIBLES).map(fila)}
          </ol>
          {olvido.cruces.length > VISIBLES && (
            <details className="hp-mas">
              <summary>Ver los {olvido.cruces.length - VISIBLES} restantes</summary>
              <ol className="hp-olvido-l">{olvido.cruces.slice(VISIBLES).map(fila)}</ol>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
