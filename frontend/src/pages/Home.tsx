import { useEffect, useState } from "react";
import { api, type MapResponse } from "../api";
import { HexMap } from "../components/HexMap";
import { Hexagon } from "../components/Hexagon";
import { t, tn } from "../i18n";

type State = { kind: "loading" } | { kind: "error" } | { kind: "empty" } | { kind: "ok"; map: MapResponse; acento: string };

/** Inicio: solo el panal de la primera asignatura, sin mensajes por días sin usar. */
export function Home({ onSelectSubtema, onNivel, onPracticar, onPracticarTema }: { onSelectSubtema?: (id: string) => void; onNivel?: () => void; onPracticar?: () => void; onPracticarTema?: (id: string) => void }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      const subjects = await api.getSubjects();
      if (!subjects.length) return { kind: "empty" } as const;
      return { kind: "ok", map: await api.getMap(subjects[0].id), acento: subjects[0].acento } as const;
    })()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState({ kind: "error" }));
    return () => { alive = false; };
  }, []);

  if (state.kind === "loading") return <main className="wrap"><p className="lede" role="status">{t("app.cargando")}</p></main>;
  if (state.kind === "error") return <main className="wrap"><p className="lede" role="alert">{t("app.error")}</p></main>;
  if (state.kind === "empty") return <main className="wrap"><p className="lede">{t("panal.sinAsignaturas")}</p></main>;

  const { map, acento } = state;
  const temas = new Set(map.hexes.map((h) => h.tema)).size;
  return (
    <main id="main" className="wrap">
      <section className="page-head">
        <div className="subject-hero">
          <Hexagon percent={map.percent} color={acento || "var(--lila)"} big />
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
            {onNivel && (
              <button type="button" onClick={onNivel} className="rounded-[11px] border border-[var(--rule-2)] bg-white px-5 py-2.5 font-semibold">
                {t("nivel.boton")}
              </button>
            )}
          </div>
        </div>
      </section>
      <HexMap hexes={map.hexes} subtemas={map.subtemas} onSelect={(id) => onSelectSubtema?.(id)} onPracticarTema={onPracticarTema} />
    </main>
  );
}
