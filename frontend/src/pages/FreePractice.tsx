import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Practice } from "../components/Practice";
import { t } from "../i18n";
import { Review, type Fallo } from "./Review";

type Client = Pick<typeof api, "createSession" | "nextQuestion" | "answer" | "reportQuestion">;

/** Práctica adaptativa libre: sin duración fija, mezclando temas. «Terminar sesión» enseña los fallos agrupados. */
export function FreePractice({ asignaturaId, client = api, onFinish }: { asignaturaId: string; client?: Client; onFinish: () => void }) {
  const [sid, setSid] = useState<string | null>(null);
  const [fin, setFin] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallos = useRef<Fallo[]>([]);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    client.createSession("practica", { asignatura_id: asignaturaId })
      .then((r) => setSid(r.sesion_id))
      .catch(() => setFailed(true));
  }, [asignaturaId, client]);

  if (failed) return <p role="alert" className="px-4 py-8">{t("app.error")}</p>;
  if (!sid) return <p role="status" className="px-4 py-8 text-[var(--ink-3)]">{t("app.cargando")}</p>;
  if (fin) {
    return (
      <>
        <Review fallos={fallos.current} />
        <div className="mx-auto max-w-3xl px-4 pb-8">
          <button type="button" onClick={onFinish} className="rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-white shadow-[3px_3px_0_var(--lila)]">
            {t("subtema.volver")}
          </button>
        </div>
      </>
    );
  }
  return (
    <section className="px-4 py-6">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end">
        <button type="button" onClick={() => setFin(true)} className="text-sm font-medium text-[var(--ink-2)] underline underline-offset-4">
          {t("practica.terminar")}
        </button>
      </div>
      <Practice
        sesionId={sid}
        client={client}
        onDone={() => setFin(true)}
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
