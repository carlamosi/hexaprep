import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Hex, MapResponse } from "../api";
import { t } from "../i18n";
import { group, TEMA_COLORS, tone } from "./HexMap";
import "./panel.css";

const COL = 0.75; // paso horizontal de un hexágono de punta plana, en anchos
const ALTO = 0.866; // alto de un hexágono regular, en anchos

/** Un subtema como panal real: hexágonos encajados con filas desplazadas. */
function Cluster({ hexes, s }: { hexes: Hex[]; s: number }) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(hexes.length * 1.2)));
  const rows = Math.ceil(hexes.length / cols);
  const h = s * ALTO;
  return (
    <div className="pm-cluster" style={{ width: (cols - 1) * COL * s + s, height: rows * h + (cols > 1 ? h / 2 : 0) }}>
      {hexes.map((x, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return (
          <i
            key={x.concepto_id}
            className="mini-hex"
            title={`${x.nombre}, ${Math.round(x.percent)} %`}
            style={{ left: c * COL * s, top: r * h + (c % 2 ? h / 2 : 0), width: s, height: h, "--p": `${Math.round(x.percent)}%` } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

/** Panal de toda la asignatura en una sola pantalla, sin scroll: un color por tema y un tono por subtema. */
export function PanelAsignatura({ map, onClose, onSelectSubtema }: { map: MapResponse; onClose: () => void; onSelectSubtema?: (id: string) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(64);
  // Se encoge el hexágono hasta que todo cabe sin scroll (con un mínimo legible; por debajo, scroll).
  useLayoutEffect(() => {
    const b = bodyRef.current;
    if (b && b.scrollHeight > b.clientHeight && s > 14) setS(s - 2);
  }, [s]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pct = (id: string) => Math.round(map.subtemas.find((x) => x.id === id)?.percent ?? 0);
  return (
    <div className="pm-backdrop" onClick={onClose}>
      <div className="pm" role="dialog" aria-modal="true" aria-label={`${t("panal.verPanal")} ${map.asignatura}`} onClick={(e) => e.stopPropagation()}>
        <header className="pm-head">
          <h2>{map.asignatura}</h2>
          <span className="pm-total">{Math.round(map.percent)} %</span>
          <button ref={closeRef} type="button" onClick={onClose} className="pm-close">{t("panal.cerrar")}</button>
        </header>
        <div className="pm-body" ref={bodyRef}>
          {group(map.hexes).map((tema, ti) => (
            <section key={tema.id} className="pm-tema" style={{ "--tc": TEMA_COLORS[ti % TEMA_COLORS.length] } as React.CSSProperties}>
              <h3>{tema.nombre}</h3>
              <div className="pm-subs">
                {tema.subtemas.map((sub, si) => (
                  <div key={sub.id} className="pm-sub" style={{ "--c": tone(si) } as React.CSSProperties}>
                    <button type="button" className="pm-sub-name" onClick={() => onSelectSubtema?.(sub.id)}>
                      {sub.nombre} <b>{pct(sub.id)} %</b>
                    </button>
                    <Cluster hexes={sub.hexes} s={s} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
