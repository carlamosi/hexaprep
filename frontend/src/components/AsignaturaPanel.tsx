import { useEffect, useState } from "react";
import { api, type MapResponse } from "../api";
import { t } from "../i18n";
import { group, TEMA_COLORS, tone } from "./HexMap";
import "./panel.css";

/** Nombre de la asignatura en la cabecera: con ratón o pulsando abre el panal completo, un color por tema y un tono por subtema. */
export function AsignaturaPanel({ asignatura, asignaturaId }: { asignatura: string; asignaturaId?: string | null }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [map, setMap] = useState<MapResponse | null>(null);
  const open = hover || pinned;

  useEffect(() => {
    if (!open || !asignaturaId) return;
    let alive = true;
    api.getMap(asignaturaId).then((m) => alive && setMap(m)).catch(() => undefined);
    return () => { alive = false; };
  }, [open, asignaturaId]);

  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPinned(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned]);

  return (
    <div className="asig-panel" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="panel-asignatura"
        onClick={() => setPinned((p) => !p)}
        className="hidden items-center gap-2 rounded-full border border-[var(--lila-tint)] bg-[var(--lila-soft)] px-3 py-1 text-sm font-medium text-[var(--lila-ink)] sm:inline-flex"
      >
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--lila)]" />
        {asignatura}
        <span className="sr-only"> {t("panal.verPanal")}</span>
      </button>
      {open && (
        <div id="panel-asignatura" className="asig-panel-body" role="region" aria-label={`${t("panal.verPanal")} ${asignatura}`}>
          {!map ? (
            <p role="status">{t("app.cargando")}</p>
          ) : (
            group(map.hexes).map((tema, ti) => (
              <section key={tema.id} style={{ "--tc": TEMA_COLORS[ti % TEMA_COLORS.length] } as React.CSSProperties}>
                <h3>{tema.nombre}</h3>
                {tema.subtemas.map((s, si) => (
                  <div key={s.id} className="asig-sub" style={{ "--c": tone(si) } as React.CSSProperties}>
                    <span className="asig-sub-name">{s.nombre}</span>
                    <span className="asig-hexes">
                      {s.hexes.map((h) => (
                        <i key={h.concepto_id} className="mini-hex" title={`${h.nombre}, ${Math.round(h.percent)} %`} style={{ "--p": `${Math.round(h.percent)}%` } as React.CSSProperties} />
                      ))}
                    </span>
                  </div>
                ))}
              </section>
            ))
          )}
        </div>
      )}
    </div>
  );
}
