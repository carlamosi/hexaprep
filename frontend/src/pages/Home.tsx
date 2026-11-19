import { useEffect, useState } from "react";
import { api, type MapResponse } from "../api";
import { HexMap } from "../components/HexMap";
import { PanelAsignatura } from "../components/PanelAsignatura";
import { Hexagon } from "../components/Hexagon";
import { elegirAsignatura } from "../hooks";
import { t, tn } from "../i18n";

type State = { kind: "loading" } | { kind: "error" } | { kind: "empty" } | { kind: "ok"; map: MapResponse; acento: string; tipos: string[] };

/** Inicio: solo el panal de la primera asignatura, sin mensajes por días sin usar. */
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
      <section className="page-head">
        <div className="subject-hero">
          <button type="button" className="hero-hex" aria-label={`${t("panal.verPanal")} ${map.asignatura}`} onClick={() => setPanel(true)}>
            <Hexagon percent={map.percent} color={acento || "var(--lila)"} big />
          </button>
          <div>
            <span className="kicker">{t("panal.titulo")}</span>
            <h1>{map.asignatura}</h1>
            <p className="lede">
              {tn("panal.temas", temas)} · {tn("panal.subtemas", map.subtemas.length)} · {tn("panal.conceptos", map.hexes.length)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 sm:ml-auto">
            {onPracticar && (
              <button type="button" onClick={onPracticar} className="rounded-[11px] bg-[var(--ink)] px-5 py-2.5 font-semibold text-white shadow-[4px_4px_0_var(--lila)]">
                {t("home.practicar")}
              </button>
            )}
            {mezcla && (
              <>
                {presentes.map(([clave, , texto]) => (
                  <button key={clave} type="button" onClick={() => onPracticarTipo?.(clave)} className="rounded-[11px] border border-[var(--rule-2)] bg-white px-5 py-2.5 font-semibold">
                    {t(texto)}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </section>
      {panel && <PanelAsignatura map={map} onClose={() => setPanel(false)} onSelectSubtema={(id) => { setPanel(false); onSelectSubtema?.(id); }} />}
      <HexMap hexes={map.hexes} subtemas={map.subtemas} onSelect={(id) => onSelectSubtema?.(id)} onPracticarTema={onPracticarTema} />
    </main>
  );
}
