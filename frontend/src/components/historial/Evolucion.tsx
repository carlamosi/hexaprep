import { scaleLinear, scaleTime } from "d3-scale";
import { useState } from "react";
import type { Analytics } from "../../api";
import { t } from "../../i18n";
import { Tooltip, useActiva, useAncho } from "../Tooltip";
import { fechaCorta, fechaLarga, lineas, type Linea, type ordenPanal, type Vista } from "./datos";

const M = { l: 44, r: 18, t: 14, b: 28 };
const deIso = (f: string) => { const [y, m, d] = f.split("-").map(Number); return new Date(y, m - 1, d); };

function Clave({ l }: { l: Linea }) {
  return (
    <svg width="22" height="10" aria-hidden="true" className="hp-key">
      <line x1="1" x2="21" y1="5" y2="5" stroke={l.color} strokeWidth="2.5" strokeDasharray={l.trazo} strokeLinecap="round" />
    </svg>
  );
}

const ultimo = (l: Linea) => l.puntos[l.puntos.length - 1];

/** Evolución del dominio (instantáneas diarias) con selector asignatura, temas o subtemas de un tema. */
export function Evolucion({ evolucion, orden }: { evolucion: Analytics["evolucion"]; orden: ReturnType<typeof ordenPanal> }) {
  const temas = [...evolucion.temas].sort((a, b) => (orden.get(a.tema_id)?.indice ?? 99) - (orden.get(b.tema_id)?.indice ?? 99));
  const [vista, setVista] = useState<Vista>({ nivel: "asignatura" });
  const series = lineas(evolucion, vista, orden);
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const W = Math.max(280, ancho);
  const H = W < 520 ? 220 : 270;
  const fechas = [...new Set(series.flatMap((s) => s.puntos.map((p) => p.fecha)))].sort();
  const dominio = fechas.length ? [deIso(fechas[0]), deIso(fechas[fechas.length - 1])] : [new Date(), new Date()];
  if (fechas.length === 1) dominio[1] = new Date(dominio[0].getTime() + 864e5);
  const x = scaleTime().domain(dominio).range([M.l, W - M.r]);
  const y = scaleLinear().domain([0, 100]).range([H - M.b, M.t]);
  const px = (f: string) => (fechas.length === 1 ? (M.l + W - M.r) / 2 : x(deIso(f)));
  const valor = (s: Linea, f: string) => s.puntos.find((p) => p.fecha === f)?.percent;
  const ticks = fechas.length > 1 ? x.ticks(Math.max(2, Math.min(6, Math.floor(W / 120)))) : [];
  const unDia = fechas.length === 1;

  const a = useActiva(fechas.length, {
    marca: (i) => ref.current?.querySelectorAll(".hp-hit")[i],
    texto: (i) => `${fechaLarga(fechas[i])}: ${series.filter((s) => valor(s, fechas[i]) !== undefined).map((s) => `${s.nombre} ${valor(s, fechas[i])} %`).join(", ")}`,
    cuerpo: (i) => (
      <>
        <span className="hp-tip-h">{fechaLarga(fechas[i])}</span>
        {series.filter((s) => valor(s, fechas[i]) !== undefined).map((s) => (
          <span key={s.id} className="hp-tip-row"><Clave l={s} /><b>{valor(s, fechas[i])} %</b><span>{s.nombre}</span></span>
        ))}
      </>
    ),
  });
  const cambiar = (v: Vista) => { a.ir(null); setVista(v); };
  const temaActivo = vista.nivel === "subtemas" ? vista.temaId : temas[0]?.tema_id;
  const resumen = `${t("hist.evolucion")}. ${series.filter((s) => s.puntos.length).map((s) => {
    const p0 = s.puntos[0];
    const p1 = ultimo(s);
    return s.puntos.length > 1 ? `${s.nombre}: de ${p0.percent} % el ${fechaLarga(p0.fecha)} a ${p1.percent} % el ${fechaLarga(p1.fecha)}` : `${s.nombre}: ${p1.percent} % el ${fechaLarga(p1.fecha)}`;
  }).join("; ")}.`;
  const hitW = (i: number) => {
    const izq = i === 0 ? M.l : (px(fechas[i - 1]) + px(fechas[i])) / 2;
    const der = i === fechas.length - 1 ? W - M.r : (px(fechas[i]) + px(fechas[i + 1])) / 2;
    return [izq, der - izq] as const;
  };

  return (
    <div>
      <div className="hp-evo-ctrl">
        <div className="hp-seg" role="group" aria-label={t("hist.vista")}>
          {(["asignatura", "temas", "subtemas"] as const).map((n) => (
            <button key={n} type="button" aria-pressed={vista.nivel === n}
              onClick={() => cambiar(n === "subtemas" ? { nivel: n, temaId: temaActivo ?? "" } : { nivel: n })}>
              {t(`hist.vista.${n}`)}
            </button>
          ))}
        </div>
        {vista.nivel === "subtemas" && (
          <div className="hp-seg hp-seg-temas" role="group" aria-label={t("hist.temaDeSubtemas")}>
            {temas.map((tm) => (
              <button key={tm.tema_id} type="button" aria-pressed={vista.temaId === tm.tema_id} onClick={() => cambiar({ nivel: "subtemas", temaId: tm.tema_id })}
                style={{ "--c": orden.get(tm.tema_id)?.color ?? "var(--ink-3)" } as React.CSSProperties}>
                <i aria-hidden="true" />{tm.tema}
              </button>
            ))}
          </div>
        )}
      </div>
      <div ref={ref} className="hp-evo">
        {fechas.length === 0 ? (
          <p className="hp-empty-line">{t("hist.evoVacia")}</p>
        ) : (
          <svg width={W} height={H} role="img" aria-label={resumen} {...a.props}>
            {[0, 25, 50, 75, 100].map((v) => (
              <g key={v}>
                <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className={v === 0 ? "hp-gl zero" : "hp-gl"} />
                <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="hp-axis-t">{v} %</text>
              </g>
            ))}
            {(unDia ? [deIso(fechas[0])] : ticks).map((d) => (
              <text key={d.getTime()} x={unDia ? px(fechas[0]) : x(d)} y={H - 8} textAnchor="middle" className="hp-axis-t">
                {fechaCorta(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`)}
              </text>
            ))}
            {series.length === 1 && series[0].puntos.length > 1 && (
              <path className="hp-area" style={{ "--s": series[0].color } as React.CSSProperties}
                d={`M${series[0].puntos.map((p) => `${px(p.fecha)},${y(p.percent)}`).join("L")}L${px(ultimo(series[0]).fecha)},${y(0)}L${px(series[0].puntos[0].fecha)},${y(0)}Z`} />
            )}
            {series.map((s) => s.puntos.length > 1 && (
              <path key={s.id} className="hp-line" stroke={s.color} strokeDasharray={s.trazo}
                d={`M${s.puntos.map((p) => `${px(p.fecha)},${y(p.percent)}`).join("L")}`} />
            ))}
            {a.activo !== null && (
              <line className="hp-cross" x1={px(fechas[a.activo])} x2={px(fechas[a.activo])} y1={M.t} y2={H - M.b} />
            )}
            {series.map((s) => {
              const f = a.activo !== null ? fechas[a.activo] : ultimo(s)?.fecha;
              const v = f ? valor(s, f) : undefined;
              return v !== undefined && <circle key={s.id} cx={px(f!)} cy={y(v)} r="4.5" fill={s.color} className="hp-dot" />;
            })}
            {series.length === 1 && ultimo(series[0]) && a.activo === null && (
              <text x={px(ultimo(series[0]).fecha) - 8} y={y(ultimo(series[0]).percent) - 10} textAnchor="end" className="hp-val-t">
                {ultimo(series[0]).percent} %
              </text>
            )}
            {fechas.map((f, i) => {
              const [hx, hw] = hitW(i);
              return <rect key={f} className="hp-hit" x={hx} y={M.t} width={Math.max(1, hw)} height={H - M.t - M.b} onPointerEnter={() => a.ir(i)} />;
            })}
          </svg>
        )}
        {unDia && <p className="hp-note">{t("hist.evoUnDia")}</p>}
      </div>
      <p className="sr-only" aria-live="polite">{a.vivo}</p>
      {series.length > 1 && (
        <ul className="hp-legend" aria-label={t("hist.leyenda")}>
          {series.map((s) => (
            <li key={s.id}><Clave l={s} /><span>{s.nombre}</span><b>{ultimo(s) ? `${ultimo(s).percent} %` : "·"}</b></li>
          ))}
        </ul>
      )}
      <Tooltip tip={a.tip} />
    </div>
  );
}
