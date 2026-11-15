import type { Analytics } from "../../api";
import { t } from "../../i18n";
import { Tooltip, useActiva, useAncho } from "../Tooltip";
import { TipBody } from "./Barras";
import { DIAS_CORTOS, fechaCorta, fechaLarga, pct, respuestas, semanasActividad } from "./datos";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const IZQ = 24;
const ARRIBA = 18;
const GAP = 3;
export const NIVEL = ["var(--rule)", "color-mix(in srgb, var(--lila) 24%, #fff)", "color-mix(in srgb, var(--lila) 48%, #fff)", "color-mix(in srgb, var(--lila) 74%, #fff)", "var(--lila)"];

const hexPts = (x: number, y: number, w: number, h: number) =>
  [[.25, 0], [.75, 0], [1, .5], [.75, 1], [.25, 1], [0, .5]].map(([a, b]) => `${x + a * w},${y + b * h}`).join(" ");

/** Mapa de calor de actividad: un hexágono por día, más intenso cuantas más preguntas. Sin rachas: solo lo que hubo. */
export function Actividad({ actividad, semanas: minimas, hoy, ampliable = false }: {
  actividad: Analytics["actividad"]; semanas: number; hoy: Date;
  /** Con todo el historial se añaden semanas hacia atrás hasta llenar el ancho (como mucho medio año). */
  ampliable?: boolean;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const semanas = ampliable ? Math.min(26, Math.max(minimas, Math.floor((ancho - IZQ) / 30))) : minimas;
  const grid = semanasActividad(actividad, hoy, semanas);
  const celdas = grid.flat();
  const paso = Math.max(10, Math.min(40, (ancho - IZQ) / semanas));
  const w = paso - GAP;
  const h = w * 0.866;
  const pasoY = h + GAP;
  const W = IZQ + paso * semanas;
  const H = ARRIBA + pasoY * 7;
  const total = actividad.reduce((a, b) => a + b.n, 0);
  const visibles = celdas.filter((c) => c.n > 0);
  const top = visibles.reduce<typeof visibles[number] | null>((a, b) => (!a || b.n > a.n ? b : a), null);
  const primeraFutura = celdas.findIndex((c) => c.futura);
  const ultimoIdx = primeraFutura < 0 ? celdas.length - 1 : Math.max(0, primeraFutura - 1);

  const a = useActiva(celdas.length, {
    marca: (i) => ref.current?.querySelectorAll("[data-dia]")[i],
    valida: (i) => !celdas[i].futura,
    inicial: ultimoIdx,
    deltas: { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 },
    texto: (i) => `${fechaLarga(celdas[i].fecha)}: ${celdas[i].n ? `${respuestas(celdas[i].n)}, ${pct(Math.round((100 * celdas[i].aciertos) / celdas[i].n))} ${t("hist.deAcierto")}` : t("hist.sinPractica")}`,
    cuerpo: (i) => {
      const c = celdas[i];
      return c.n
        ? <TipBody titulo={fechaLarga(c.fecha)} valor={respuestas(c.n)} n={c.n} extra={<span>{Math.round((100 * c.aciertos) / c.n)} % {t("hist.deAcierto")}</span>} />
        : <><b>{t("hist.sinPractica")}</b><span>{fechaLarga(c.fecha)}</span></>;
    },
  });

  const resumen = `${t("hist.actividad")}: ${semanas} ${t("hist.semanas")}, ${visibles.length} ${t(visibles.length === 1 ? "hist.diaConPractica" : "hist.diasConPractica")}, ${respuestas(total)}.${top ? ` ${t("hist.diaMas")} ${fechaLarga(top.fecha)}, ${respuestas(top.n)}.` : ""}`;

  return (
    <div ref={ref} className="hp-heat">
      <svg width={W} height={H} role="img" aria-label={resumen} className="hp-heat-svg" {...a.props}>
        {grid.map((sem, wi) => {
          const m = (k: number) => grid[k]?.[0].fecha.slice(5, 7);
          // etiqueta en cada cambio de mes; la primera solo si no choca con la siguiente
          const cambia = wi === 0 ? m(1) === m(0) && m(2) === m(0) : m(wi) !== m(wi - 1);
          const mes = cambia ? MESES[Number(m(wi)) - 1] : null;
          return mes && <text key={`m${wi}`} x={IZQ + wi * paso} y={11} className="hp-axis-t">{mes}</text>;
        })}
        {[0, 2, 4].map((d) => <text key={d} x={0} y={ARRIBA + d * pasoY + h * 0.75} className="hp-axis-t">{DIAS_CORTOS[d]}</text>)}
        {celdas.map((c, i) => {
          const x = IZQ + Math.floor(i / 7) * paso;
          const y = ARRIBA + (i % 7) * pasoY;
          return (
            <polygon
              key={c.fecha}
              data-dia={c.fecha}
              points={hexPts(x, y, w, h)}
              fill={c.futura ? "none" : NIVEL[c.nivel]}
              stroke={a.activo === i ? "var(--ink)" : c.futura ? "var(--rule)" : "none"}
              strokeWidth={a.activo === i ? 2 : 1}
              strokeDasharray={c.futura ? "2 2" : undefined}
              onPointerEnter={() => (c.futura ? a.ir(null) : a.ir(i))}
            />
          );
        })}
      </svg>
      <p className="sr-only" aria-live="polite">{a.vivo}</p>
      <div className="hp-heat-foot">
        <span>{visibles.length} {t(visibles.length === 1 ? "hist.diaConPractica" : "hist.diasConPractica")} · {respuestas(total)}{top ? ` · ${t("hist.diaMas")} ${fechaCorta(top.fecha)} (${top.n})` : ""}</span>
        <span className="hp-scale" aria-hidden="true">{t("hist.menos")} {NIVEL.map((c) => <i key={c} style={{ background: c }} />)} {t("hist.mas")}</span>
      </div>
      <Tooltip tip={a.tip} />
    </div>
  );
}
