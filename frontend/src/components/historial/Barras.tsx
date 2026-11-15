import { useRef, type ReactNode } from "react";
import { t } from "../../i18n";
import { Tooltip, useActiva } from "../Tooltip";
import { fiable, pct, respuestas } from "./datos";

export interface Fila { id: string; etiqueta: string; corto?: string; n: number; valor: number | null; texto?: string }

const ancho = (v: number | null, max: number) => `${v === null ? 0 : Math.max(0, Math.min(100, (100 * v) / max))}%`;
const resumir = (titulo: string, filas: Fila[]) =>
  `${titulo}. ${filas.map((f) => `${f.etiqueta}: ${f.texto ?? pct(f.valor)}, ${respuestas(f.n)}`).join("; ")}.`;

/** Marca de pocos datos que no depende del color: trama diagonal y contorno discontinuo. */
const clase = (f: Fila) => (f.valor === null ? "is-empty" : fiable(f.n) ? "" : "is-low");

/** Barras horizontales con su valor y su n a la vista. `media` dibuja una línea de referencia. */
export function Barras({ titulo, filas, max = 100, media, color = "var(--lila)" }: {
  titulo: string; filas: Fila[]; max?: number; media?: number | null; color?: string;
}) {
  return (
    <>
    <div className="hp-bars" role="img" aria-label={resumir(titulo, filas)} style={{ "--s": color } as React.CSSProperties}>
      {filas.map((f) => (
        <div key={f.id} className={`hp-bar ${clase(f)}`}>
          <span className="hp-bar-label">{f.etiqueta}</span>
          <span className="hp-bar-track">
            <i style={{ width: ancho(f.valor, max) }} />
            {media != null && <b className="hp-ref" style={{ left: ancho(media, max) }} />}
          </span>
          <span className="hp-bar-val">{f.texto ?? pct(f.valor)}</span>
          <span className="hp-bar-n">{fiable(f.n) || f.n === 0 ? `n ${f.n}` : `n ${f.n} · ${t("hist.pocos")}`}</span>
        </div>
      ))}
    </div>
    {media != null && <RefKey media={media} />}
    </>
  );
}

/** Clave de la línea de referencia, fuera del área de las marcas para que no tape ningún valor. */
const RefKey = ({ media, dashed = false }: { media: number; dashed?: boolean }) => (
  <p className="hp-ref-key" aria-hidden="true"><i className={dashed ? "dashed" : ""} />{t("hist.media")}: {media} %</p>
);

/** Columnas con aviso al pasar el ratón o moverse con las flechas. Los valores van en el aviso y en la etiqueta accesible. */
export function Columnas({ titulo, filas, max = 100, media, color = "var(--lila)", valores = false, alto = 150 }: {
  titulo: string; filas: Fila[]; max?: number; media?: number | null; color?: string; valores?: boolean; alto?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const conDatos = (i: number) => filas[i].n > 0;
  const ultima = filas.map((f) => f.n > 0).lastIndexOf(true);
  const a = useActiva(filas.length, {
    marca: (i) => root.current?.querySelectorAll(".hp-col-bar")[i],
    valida: conDatos,
    inicial: ultima < 0 ? 0 : ultima,
    texto: (i) => `${filas[i].etiqueta}: ${filas[i].texto ?? pct(filas[i].valor)}, ${respuestas(filas[i].n)}`,
    cuerpo: (i) => <TipBody titulo={filas[i].etiqueta} valor={filas[i].texto ?? pct(filas[i].valor)} n={filas[i].n} />,
  });
  return (
    <>
      <div
        ref={root}
        className={`hp-cols ${valores ? "with-values" : ""}`}
        role="img"
        aria-label={resumir(titulo, filas)}
        style={{ "--s": color, "--h": `${alto}px` } as React.CSSProperties}
        {...a.props}
      >
        <div className="hp-cols-plot">
          {media != null && <b className="hp-ref-h" style={{ bottom: ancho(media, max) }} />}
          {filas.map((f, i) => (
            <div key={f.id} className={`hp-col ${clase(f)} ${a.activo === i ? "is-on" : ""}`} onPointerEnter={() => (f.n ? a.ir(i) : a.ir(null))}>
              <span className="hp-col-slot">
                {valores && f.valor !== null && <em style={{ bottom: ancho(f.valor, max) }}>{f.texto ?? pct(f.valor)}</em>}
                <i className="hp-col-bar" style={{ height: ancho(f.valor, max) }} />
              </span>
            </div>
          ))}
        </div>
        <div className="hp-cols-axis" aria-hidden="true">
          {filas.map((f) => <span key={f.id}>{f.corto ?? f.etiqueta}</span>)}
        </div>
        <div className="hp-cols-n" aria-hidden="true">
          {filas.map((f) => <span key={f.id} className={fiable(f.n) ? "" : "low"}>{f.n || ""}</span>)}
        </div>
      </div>
      {media != null && <RefKey media={media} dashed />}
      <p className="sr-only" aria-live="polite">{a.vivo}</p>
      <Tooltip tip={a.tip} />
    </>
  );
}

export function TipBody({ titulo, valor, n, extra }: { titulo: string; valor: string; n: number; extra?: ReactNode }) {
  return (
    <>
      <b>{valor}</b>
      <span>{titulo}</span>
      <span className="hp-tip-n">{respuestas(n)}{n > 0 && !fiable(n) ? ` · ${t("hist.pocos")}` : ""}</span>
      {extra}
    </>
  );
}
