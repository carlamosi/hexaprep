import { useEffect, useState } from "react";
import { api, type MapResponse } from "../api";
import { HexMap } from "../components/HexMap";
import { PanelAsignatura } from "../components/PanelAsignatura";
import { tonoBanner } from "../colorTema";
import { Buscador } from "../components/Buscador";
import { elegirAsignatura } from "../hooks";
import { t, tn } from "../i18n";

type State = { kind: "loading" } | { kind: "error" } | { kind: "empty" } | { kind: "ok"; map: MapResponse; acento: string; tipos: string[] };

/** Inicio: solo el panal de la primera asignatura, sin mensajes por días sin usar. */
const puntosHex = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 180) * (60 * i - 90); return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");

export function Home({ onSelectSubtema, onPracticar, onPracticarTipo, onPracticarTema }: { onSelectSubtema?: (id: string) => void; onPracticar?: () => void; onPracticarTipo?: (grupo: "test" | "problemas" | "escritas") => void; onPracticarTema?: (id: string) => void }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [panel, setPanel] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const subjects = await api.getSubjects();
      if (!subjects.length) return { kind: "empty" } as const;
      const a = elegirAsignatura(subjects)!;
      return { kind: "ok", map: await api.getMap(a.id), acento: a.acento, tipos: a.tipos ?? [] } as const;
    })()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState({ kind: "error" }));
    return () => { alive = false; };
  }, []);

  if (state.kind === "loading") return <main className="wrap"><p className="lede" role="status">{t("app.cargando")}</p></main>;
  if (state.kind === "error") return <main className="wrap"><p className="lede" role="alert">{t("app.error")}</p></main>;
  if (state.kind === "empty") return <main className="wrap"><p className="lede">{t("panal.sinAsignaturas")}</p></main>;

  const { map, acento, tipos } = state;
  // Solo en asignaturas con preguntas de teoría (test y V/F) y también problemas tiene sentido practicar una sola cosa
  const grupos = [["test", ["test", "vf"], "home.soloTest"], ["problemas", ["problema"], "home.soloProblemas"], ["escritas", ["escrita"], "home.soloEscritas"]] as const;
  // Sin test (solo V/F) el grupo es la literatura de Català
  const presentes = grupos.filter(([, ts]) => ts.some((x) => tipos.includes(x)))
    .map(([c, ts, tx]) => [c, ts, c === "test" && !tipos.includes("test") ? "home.soloLiteratura" : tx] as const);
  const mezcla = presentes.length > 1;
  const temas = new Set(map.hexes.map((h) => h.tema)).size;
  return (
    <main id="main" className="wrap">
      <section className="banner" style={{ background: tonoBanner(acento || "") }}>
        <svg className="banner-marca" viewBox="-20 -20 280 280" aria-hidden="true">
          {[[120, 120], [214, 120], [167, 201], [73, 201], [26, 120], [73, 39], [167, 39]].map(([x, y], i) => <polygon key={i} points={puntosHex(x, y, 52)} fill="#fff" />)}
        </svg>
        <button type="button" className="banner-panal" aria-label={`${t("panal.verPanal")} ${map.asignatura}`} onClick={() => setPanel(true)}>
          <svg viewBox="0 0 60 60" aria-hidden="true">
            {[[30, 30], [53, 30], [41.5, 50], [18.5, 50], [7, 30], [18.5, 10], [41.5, 10]].map(([x, y], i) => <polygon key={i} points={puntosHex(x, y, 11)} fill={i === 0 ? "#fff" : "none"} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />)}
          </svg>
        </button>
        <div className="banner-txt">
          <span className="banner-kicker">{t("panal.titulo")}</span>
          <h1>{map.asignatura}</h1>
          <p>{tn("panal.temas", temas)} · {tn("panal.subtemas", map.subtemas.length)} · {tn("panal.conceptos", map.hexes.length)}</p>
        </div>
        <div className="banner-pct" aria-label={`${map.percent} ${t("panal.porCientoDominio")}`}>{map.percent}<small>&nbsp;%</small></div>
      </section>
      <div className="flex flex-wrap items-center gap-3 py-5">
        <Buscador hexes={map.hexes} onElegir={(id) => onSelectSubtema?.(id)} />
        {onPracticar && (
          <button type="button" onClick={onPracticar} className="rounded-[11px] bg-[var(--ink)] px-5 py-2.5 font-semibold text-[var(--on-ink)] shadow-[4px_4px_0_var(--lila)]">
            {t("home.practicar")}
          </button>
        )}
        {mezcla && presentes.map(([clave, , texto]) => (
          <button key={clave} type="button" onClick={() => onPracticarTipo?.(clave)} className="rounded-[11px] border border-[var(--rule-2)] bg-[var(--card)] px-5 py-2.5 font-semibold">
            {t(texto)}
          </button>
        ))}
      </div>
      {panel && <PanelAsignatura map={map} onClose={() => setPanel(false)} onSelectSubtema={(id) => { setPanel(false); onSelectSubtema?.(id); }} />}
      <HexMap hexes={map.hexes} subtemas={map.subtemas} onSelect={(id) => onSelectSubtema?.(id)} onPracticarTema={onPracticarTema} />
    </main>
  );
}
