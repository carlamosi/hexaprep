import { useEffect, useState } from "react";
import { api, type Suggestion } from "../api";
import { t } from "../i18n";

interface Props {
  client?: Pick<typeof api, "suggestions">;
  onPracticeSubtema: (subtemaId: string) => void;
  onPlacement: () => void;
}

/** Qué conviene repasar ahora: conceptos con el motivo. Sin fechas ni cuenta atrás. */
export function Suggestions({ client = api, onPracticeSubtema, onPlacement }: Props) {
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
      <ol className="mt-6 space-y-4">
        {items.map((s, i) => (
          <li key={s.concepto_id ?? `hint-${i}`} className="rounded-[16px] border border-[var(--rule)] bg-white p-5">
            {s.tipo === "placement" ? (
              <>
                <p>{s.motivo}</p>
                <button type="button" onClick={onPlacement} className="mt-3 rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-white shadow-[3px_3px_0_var(--lila)]">
                  {t("nivel.hacer")}
                </button>
              </>
            ) : (
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
