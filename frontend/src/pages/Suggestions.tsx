import { useEffect, useState } from "react";
import { api, type Suggestion } from "../api";
import { Examen, type ExamenClient } from "../components/Examen";
import { t } from "../i18n";
import { ErrorCarga } from "../components/ErrorCarga";
import "./hoy.css";

interface Props {
  client?: Pick<typeof api, "suggestions"> & Partial<ExamenClient>;
  asignaturaId?: string;
  onPracticeSubtema: (subtemaId: string) => void;
}

/** Iconos pequeños del motivo (reloj, puntos, flecha abajo y flecha arriba). */
const ICONOS: Record<NonNullable<Suggestion["razon"]>, React.ReactNode> = {
  olvido: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  pocos_datos: <><circle cx="7" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="17" cy="12" r="1.2" /></>,
  poco_dominio: <path d="M12 5v14M6 13l6 6 6-6" />,
  rendimiento: <path d="M5 17l5-5 3 3 6-7M14 8h5v5" />,
};

const botonPrincipal = "mt-4 rounded-[11px] bg-[var(--ink)] px-5 py-3 font-medium text-[var(--on-ink)] shadow-[3px_3px_0_var(--lila)] btn-duro";
const botonSecundario = "mt-4 rounded-[11px] border border-[var(--rule-2)] px-4 py-2 text-[var(--lila-ink)] btn-suave";

/** Qué conviene repasar ahora: conceptos de la asignatura que estás viendo, en orden, con el motivo y dos medidas. La primera tarjeta es la
 * acción principal. La fecha de examen es opcional y solo la ves si la pones. */
export function Suggestions({ client = api, asignaturaId, onPracticeSubtema }: Props) {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setItems(null);
    client.suggestions(asignaturaId).then((s) => alive && setItems(s)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [client, asignaturaId]);

  if (failed) return <ErrorCarga />;
  if (!items) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-6">
        <p role="status" className="sr-only">{t("app.cargando")}</p>
        <div aria-hidden="true" className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="hoy-sk" />)}</div>
      </section>
    );
  }

  const entra = (i: number) => ({ "--i": i }) as React.CSSProperties;
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("hoy.titulo")}</h1>
      {items.length > 0 && <p className="mt-1 text-[var(--ink-2)]">{t("hoy.intro")}</p>}
      {asignaturaId && client.getExamen && client.setExamen && <Examen asignaturaId={asignaturaId} client={client as ExamenClient} />}
      {items.length === 0 && (
        <div className="hoy-vacio hoy-sec mt-6" style={entra(0)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 19.8 7.3v9.4L12 21.2 4.2 16.7V7.3Z" fill="var(--lila-soft)" stroke="var(--lila)" strokeWidth="1.2" strokeLinejoin="round" /></svg>
          <p>{t("hoy.vacio")}</p>
          <a href="#panal" className="btn-suave">{t("hoy.vacioCta")}</a>
        </div>
      )}
      <ol className="mt-6 space-y-4">
        {items.map((s, i) => (
          <li key={s.concepto_id ?? `s-${i}`} className={`hoy-card hoy-sec${i === 0 ? " is-top" : ""}`} style={entra(i)}>
            <span className="hoy-n" aria-hidden="true">{i + 1}</span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{s.concepto}</h2>
              {s.razon && (
                <span className="hoy-razon mt-2" data-r={s.razon}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">{ICONOS[s.razon]}</svg>
                  {t(`hoy.razon.${s.razon}`)}
                </span>
              )}
              <p className="mt-2 text-[var(--ink-2)]">{s.motivo}</p>
              <div className="hoy-medidas">
                <span className="hoy-olvido">
                  {t("hoy.olvido")}
                  <span className="hoy-barra" aria-hidden="true"><i style={{ "--v": Math.min(1, s.riesgo_olvido), "--i": i } as React.CSSProperties} /></span>
                  <b>{Math.round(s.riesgo_olvido * 100)} %</b>
                </span>
                <span>{t("hoy.ganancia")} <b>+{s.ganancia_por_minuto.toLocaleString("es", { maximumFractionDigits: 1 })}</b> {t("hoy.ptsMin")}</span>
              </div>
              {s.subtema_id && (
                <button type="button" onClick={() => onPracticeSubtema(s.subtema_id!)} className={i === 0 ? botonPrincipal : botonSecundario}>
                  {t("hoy.practicar")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
