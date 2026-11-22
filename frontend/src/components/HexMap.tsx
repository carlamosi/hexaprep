import type { Hex } from "../api";
import { t } from "../i18n";
import { colorTema } from "../colorTema";
import { Hexagon } from "./Hexagon";
import { numeroTema, sinPrefijoTema } from "../rotulo";

// El color de cada tema sale de `colorTema` (color de la asignatura girado por el orden del temario).

/** Tono del subtema: el color del tema (`--tc`) cada vez más claro. */
export const tone = (si: number) => (si === 0 ? "var(--tc)" : `color-mix(in srgb, var(--tc) ${Math.max(35, 100 - si * 25)}%, var(--card))`);

interface Sub { id: string; nombre: string; hexes: Hex[] }
export interface Tema { id: string; nombre: string; subtemas: Sub[] }

export function group(hexes: Hex[]): Tema[] {
  const temas: Tema[] = [];
  for (const h of hexes) {
    let tema = temas.find((x) => x.id === h.tema_id);
    if (!tema) temas.push((tema = { id: h.tema_id, nombre: h.tema, subtemas: [] }));
    let sub = tema.subtemas.find((s) => s.id === h.subtema_id);
    if (!sub) tema.subtemas.push((sub = { id: h.subtema_id, nombre: h.subtema, hexes: [] }));
    sub.hexes.push(h);
  }
  return temas;
}

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/** Panal de dominio: un hexágono por concepto, agrupado por tema y subtema. */
export function HexMap({ hexes, onSelect, onPracticarTema, subtemas }: {
  hexes: Hex[];
  onSelect: (subtemaId: string) => void;
  onPracticarTema?: (temaId: string) => void;
  /** % de subtema calculado por el backend; si falta, se usa la media de sus conceptos. */
  subtemas?: { id: string; percent: number }[];
}) {
  const temas = group(hexes);
  const base = hexes[0]?.color ?? "";
  const subPct = (s: Sub) => Math.round(subtemas?.find((x) => x.id === s.id)?.percent ?? mean(s.hexes.map((h) => h.percent)));
  return (
    <>
      {temas.map((tema, ti) => (
        <section key={tema.id} className="tema" style={{ "--c": colorTema(base, ti, temas.length), "--tc": colorTema(base, ti, temas.length) } as React.CSSProperties} aria-labelledby={`tema-${ti}`}>
          <div className="tema-head">
            <i className="chip" aria-hidden="true" />
            <span className="kicker kicker-muted">{t("panal.tema")} {numeroTema(tema.nombre, ti + 1)}</span>
            <h2 id={`tema-${ti}`}>{sinPrefijoTema(tema.nombre)}</h2>
            {/* shortcut: % de tema como media de conceptos, el backend no lo envía; usar el suyo si llega */}
            <span className="tema-pct"><span>{t("panal.dominio")}</span>{mean(tema.subtemas.flatMap((s) => s.hexes.map((h) => h.percent)))}&nbsp;%</span>
            {onPracticarTema && (
              <button type="button" className="tema-practicar" aria-label={`${t("panal.practicarTema")} ${sinPrefijoTema(tema.nombre)}`} onClick={() => onPracticarTema(tema.id)}>
                {t("panal.practicarTema")}
              </button>
            )}
          </div>
          {tema.subtemas.map((s, si) => {
            const pct = subPct(s);
            return (
              <div key={s.id} className="subtema" style={{ "--c": tone(si) } as React.CSSProperties}>
                <div className="subtema-meta">
                  <h3>{s.nombre}</h3>
                  <span className="big" data-testid={`subtema-pct-${s.id}`}>{pct}<small>&nbsp;%</small></span>
                  <p className="meta">{s.hexes.length} {t(s.hexes.length === 1 ? "panal.concepto" : "panal.conceptos")}</p>
                  <div className="meter" style={{ "--p": pct / 100 } as React.CSSProperties} aria-hidden="true"><i /></div>
                </div>
                <ul className="panal" aria-label={`${t("panal.conceptosDe")} ${s.nombre}`}>
                  {s.hexes.map((h) => (
                    <li key={h.concepto_id}>
                      <button
                        type="button"
                        className={h.percent === 0 ? "hex-tile is-new" : "hex-tile"}
                        data-fill={Math.round(h.percent)}
                        aria-label={`${h.nombre}, ${Math.round(h.percent)} ${t("panal.porCientoDominio")}`}
                        onClick={() => onSelect(h.subtema_id)}
                      >
                        <Hexagon percent={h.percent} />
                        <span className="hex-name">{h.nombre}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
