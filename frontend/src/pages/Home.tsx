import { useEffect, useState } from "react";
import { api, type MapResponse } from "../api";
import { HexMap } from "../components/HexMap";
import { Hexagon } from "../components/Hexagon";
import { t } from "../i18n";

type State = { kind: "loading" } | { kind: "error" } | { kind: "empty" } | { kind: "ok"; map: MapResponse; acento: string };

/** Inicio: solo el panal de la primera asignatura, sin mensajes por días sin usar. */
export function Home({ onSelectSubtema, onNivel }: { onSelectSubtema?: (id: string) => void; onNivel?: () => void }) {
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
              {temas} {t("panal.temas")} · {map.subtemas.length} {t("panal.subtemas")} · {map.hexes.length} {t("panal.conceptos")}
            </p>
          </div>
        </div>
      </section>
      <HexMap hexes={map.hexes} subtemas={map.subtemas} onSelect={(id) => onSelectSubtema?.(id)} />
      {onNivel && (
        <p className="mt-8">
          <button type="button" onClick={onNivel} className="text-[var(--lila-ink)] underline underline-offset-4">
            {t("nivel.hacer")}
          </button>
        </p>
      )}
    </main>
  );
}
