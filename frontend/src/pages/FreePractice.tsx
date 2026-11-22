import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Practice } from "../components/Practice";
import { t } from "../i18n";
import { clearSession, openSession } from "../session";
import { Resumen } from "./Resumen";
import { Review, type Fallo } from "./Review";
import { ErrorCarga } from "../components/ErrorCarga";

const TIPOS: Record<string, string[]> = { test: ["test", "vf"], problemas: ["problema"], escritas: ["escrita"] };

type Client = Pick<typeof api, "createSession" | "nextQuestion" | "answer" | "reportQuestion"> & Partial<Pick<typeof api, "getSession" | "resumenSesion">>;

/** Práctica adaptativa libre: sin duración fija, mezclando temas. «Terminar sesión» enseña los fallos agrupados. */
/** `tipos`: «test» (test y verdadero/falso) o «problemas»; sin indicar, mezcla todo. */
export function FreePractice({ asignaturaId, temaId, tipos, client = api, onFinish }: { asignaturaId: string; temaId?: string; tipos?: string; client?: Client; onFinish: () => void }) {
  const [sid, setSid] = useState<string | null>(null);
  const [answered, setAnswered] = useState(0);
  const [fin, setFinState] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallos = useRef<Fallo[]>([]);
  const started = useRef(false);
  const [ronda, setRonda] = useState(0); // «Seguir practicando» abre una sesión nueva
  const key = `hexaprep.sesion.practica.${asignaturaId}${temaId ? `.${temaId}` : ""}${tipos ? `.${tipos}` : ""}`;
  const setFin = (v: boolean) => { if (v) clearSession(key); setFinState(v); };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    openSession(key, client, () => client.createSession("practica", { asignatura_id: asignaturaId, ...(temaId && { tema_id: temaId }), ...(tipos && { tipos: TIPOS[tipos] ?? [] }) }))
      .then((o) => { setSid(o.sid); setAnswered(o.answered); })
      .catch(() => setFailed(true));
  }, [asignaturaId, temaId, tipos, client, key, ronda]);

  if (failed) return <ErrorCarga />;
  if (!sid) return <p role="status" className="sr-only">{t("app.cargando")}</p>;
  if (fin && client.resumenSesion) {
    return <Resumen sesionId={sid} fallos={fallos.current} client={client} onVolver={onFinish}
      onSeguir={() => { fallos.current = []; started.current = false; setSid(null); setAnswered(0); setFinState(false); setRonda((n) => n + 1); }} />;
  }
  if (fin) {
    return (
      <>
        <Review fallos={fallos.current} />
        <div className="mx-auto max-w-3xl px-4 pb-8">
          <button type="button" onClick={onFinish} className="rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-[var(--on-ink)] shadow-[3px_3px_0_var(--lila)] btn-duro">
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
        initialAnswered={answered}
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
