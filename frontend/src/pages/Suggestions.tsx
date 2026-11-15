import { useEffect, useState } from "react";
import { api, type Suggestion } from "../api";
import { Examen, type ExamenClient } from "../components/Examen";
import { t } from "../i18n";

interface Props {
  client?: Pick<typeof api, "suggestions"> & Partial<ExamenClient>;
  asignaturaId?: string;
  onPracticeSubtema: (subtemaId: string) => void;
}

/** Qué conviene repasar ahora: conceptos con el motivo. La fecha de examen es opcional y solo la ves si la pones. */
export function Suggestions({ client = api, asignaturaId, onPracticeSubtema }: Props) {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    client.suggestions().then((s) => alive && setItems(s)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [client]);

  if (failed) return <p role="alert" className="px-4 py-8">{t("app.error")}</p>;
  if (!items) return <p role="status" className="px-4 py-8 text-[var(--ink-3)]">{t("app.cargando")}</p>;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("hoy.titulo")}</h1>
      {asignaturaId && client.getExamen && client.setExamen && <Examen asignaturaId={asignaturaId} client={client as ExamenClient} />}
      {items.length === 0 && <p className="mt-6 text-[var(--ink-2)]">{t("hoy.vacio")}</p>}
      <ol className="mt-6 space-y-4">
        {items.map((s, i) => (
          <li key={s.concepto_id ?? `s-${i}`} className="rounded-[16px] border border-[var(--rule)] bg-white p-5">
            {(
              <>
                <h2 className="text-lg font-semibold">{s.concepto}</h2>
                <p className="mt-1 text-[var(--ink-2)]">{s.motivo}</p>
                {s.subtema_id && (
                  <button type="button" onClick={() => onPracticeSubtema(s.subtema_id!)} className="mt-3 rounded-[11px] border border-[var(--rule-2)] px-4 py-2 text-[var(--lila-ink)] hover:bg-[var(--lila-soft)]">
                    {t("hoy.practicar")}
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
