import { useEffect, useRef, useState } from "react";
import { api, type MapResponse } from "../api";
import { Practice } from "../components/Practice";
import { t } from "../i18n";
import { clearSession, openSession, savedSession } from "../session";
import { Review, type Fallo } from "./Review";

type Client = Pick<typeof api, "createSession" | "nextQuestion" | "answer" | "reportQuestion" | "getMap"> & Partial<Pick<typeof api, "getSession">>;

interface Props {
  asignaturaId: string;
  subtemaId: string;
  client?: Client;
  onBack: () => void;
}

/** Subtema: su dominio, sus conceptos y práctica sin límite de tanda. */
export function Subtopic({ asignaturaId, subtemaId, client = api, onBack }: Props) {
  const [map, setMap] = useState<MapResponse | null>(null);
  const [sid, setSid] = useState<string | null>(null);
  const [answered, setAnswered] = useState(0);
  const [fin, setFin] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallos = useRef<Fallo[]>([]);
  const key = `hexaprep.sesion.subtema.${subtemaId}`;

  useEffect(() => {
    let alive = true;
    client.getMap(asignaturaId).then((m) => alive && setMap(m)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [asignaturaId, client]);

  async function start() {
    if (!savedSession(key)) fallos.current = [];
    try {
      const o = await openSession(key, client, () =>
        client.createSession("repaso_subtema", { asignatura_id: asignaturaId, subtema_id: subtemaId }));
      setSid(o.sid);
      setAnswered(o.answered);
    } catch {
      setFailed(true);
    }
  }

  function done() {
    clearSession(key);
    setFin(true);
    client.getMap(asignaturaId).then(setMap).catch(() => undefined);
  }

  if (failed) return <p role="alert" className="px-4 py-8">{t("app.error")}</p>;
  if (!map) return <p role="status" className="px-4 py-8 text-[var(--ink-3)]">{t("app.cargando")}</p>;

  const conceptos = map.hexes.filter((h) => h.subtema_id === subtemaId);
  const nombre = conceptos[0]?.subtema ?? "";
  const percent = map.subtemas.find((s) => s.id === subtemaId)?.percent ?? 0;

  if (sid && !fin) {
    return (
      <section className="px-4 py-6">
        <Practice
          sesionId={sid}
          client={client}
          initialAnswered={answered}
          onDone={done}
          onAnswered={(q, r) => {
            if (!r.correcta) {
              fallos.current.push({
                pregunta_id: q.pregunta_id, enunciado: q.enunciado, trampa: r.trampa,
                fuente_id: r.fuente_id, fuente_pagina: r.fuente_pagina, fuente_cara: r.fuente_cara,
              });
            }
          }}
        />
      </section>
    );
  }
  if (fin) {
    return (
      <>
        <Review fallos={fallos.current} />
        <div className="mx-auto flex max-w-3xl gap-3 px-4 pb-8">
          <button type="button" onClick={() => { setFin(false); setSid(null); }} className="rounded-[11px] border border-[var(--rule-2)] px-4 py-2 text-[var(--lila-ink)]">
            {nombre}
          </button>
          <button type="button" onClick={onBack} className="rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-white shadow-[3px_3px_0_var(--lila)]">
            {t("subtema.volver")}
          </button>
        </div>
      </>
    );
  }
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">{nombre}</h1>
      <p className="mt-1 text-[var(--ink-3)]">{percent} % {t("panal.dominio")}</p>
      <h2 className="mt-6 text-lg font-semibold">{t("subtema.conceptos")}</h2>
      <ul className="mt-2 space-y-1">
        {conceptos.map((c) => (
          <li key={c.concepto_id} className="flex justify-between border-b border-[var(--rule)] py-2">
            <span>{c.nombre}</span>
            <span className="tabular-nums text-[var(--ink-2)]">{c.percent} %</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={() => void start()} className="rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-white shadow-[3px_3px_0_var(--lila)]">
          {t("subtema.practicar")}
        </button>
        <button type="button" onClick={onBack} className="rounded-[11px] border border-[var(--rule-2)] px-4 py-2 text-[var(--lila-ink)]">
          {t("subtema.volver")}
        </button>
      </div>
    </section>
  );
}
