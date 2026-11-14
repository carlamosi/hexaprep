import { useEffect, useState } from "react";
import { api, type History as HistoryData } from "../api";
import { Calendar } from "../components/Calendar";
import { Charts } from "../components/Charts";
import { t } from "../i18n";

/** Historial doble: calendario de días estudiados y evolución del dominio por subtema. */
export function History({ client = api, mes }: { client?: Pick<typeof api, "history">; mes?: string }) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    client.history().then((h) => alive && setData(h)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [client]);

  if (failed) return <p role="alert" className="px-4 py-8">{t("app.error")}</p>;
  if (!data) return <p role="status" className="px-4 py-8 text-[var(--ink-3)]">{t("app.cargando")}</p>;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("hist.titulo")}</h1>
      <p className="text-[var(--ink-3)]">{data.dias.length} {t("hist.dias")}</p>
      <Calendar dias={data.dias} mes={mes} />
      <Charts evolucion={data.evolucion} />
    </main>
  );
}
