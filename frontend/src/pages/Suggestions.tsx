import { useEffect, useState } from "react";
import { api, type Suggestion } from "../api";
import { Plan, type PlanClient } from "../components/Plan";
import { t } from "../i18n";
import { ErrorCarga } from "../components/ErrorCarga";
import "./hoy.css";

interface Props {
  client?: Pick<typeof api, "suggestions"> & PlanClient;
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

const pct = (x: number) => `${Math.round(Math.min(1, x) * 100)} %`;

/** Qué conviene repasar ahora, de la asignatura que estás viendo. La primera sugerencia es la acción principal («Empieza por aquí»);
 * el resto, una lista; y debajo, tu plan (examen y tema en curso), opcional. */
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
      <section className="hoy">
        <p role="status" className="sr-only">{t("app.cargando")}</p>
        <div aria-hidden="true" className="hoy-sk-g"><div className="hoy-sk hoy-sk-hero" /><div className="hoy-sk" /><div className="hoy-sk" /></div>
      </section>
    );
  }

  const [primera, ...resto] = items;
  const entra = (i: number) => ({ "--i": i }) as React.CSSProperties;
  const subtitulo = items.length === 1 ? t("hoy.subtituloUno") : t("hoy.subtitulo").replace("{n}", String(items.length));
  return (
    <section className="hoy">
      <header className="hoy-cab">
        <h1>{t("hoy.h1")}</h1>
        {items.length > 0 && <p>{subtitulo}</p>}
      </header>

      {primera ? (
        <section className="hoy-hero hoy-sec" style={entra(0)} aria-label={t("hoy.empieza")}>
          <div className="hoy-hero-cab">
            <span>{t("hoy.empieza")}</span>
            {primera.razon && (
              <span className="hoy-chip">
                <svg viewBox="0 0 24 24" aria-hidden="true">{ICONOS[primera.razon]}</svg>
                {t(`hoy.razon.${primera.razon}`)}
              </span>
            )}
          </div>
          <div>
            <h2>{primera.concepto}</h2>
            <p>{primera.motivo}</p>
          </div>
          <dl className="hoy-medidas">
            <div>
              <dt>{t("hoy.olvido")}</dt>
              <dd className="hoy-olvido">
                <span className="hoy-barra" aria-hidden="true"><i style={{ "--v": Math.min(1, primera.riesgo_olvido) } as React.CSSProperties} /></span>
                <b>{pct(primera.riesgo_olvido)}</b>
              </dd>
            </div>
            <div>
              <dt>{t("hoy.ganancia")}</dt>
              <dd><b>+{primera.ganancia_por_minuto.toLocaleString("es", { maximumFractionDigits: 1 })}</b> <small>{t("hoy.ptsMin")}</small></dd>
            </div>
          </dl>
          {primera.subtema_id && <button type="button" className="hoy-ahora" onClick={() => onPracticeSubtema(primera.subtema_id!)}>{t("hoy.practicarAhora")}</button>}
        </section>
      ) : (
        <div className="hoy-vacio hoy-sec" style={entra(0)}>
          <svg viewBox="0 0 92 80" aria-hidden="true"><polygon points="76,40 61,66 31,66 16,40 31,14 61,14" /></svg>
          <h2>{t("hoy.vacioTitulo")}</h2>
          <p>{t("hoy.vacio")}</p>
          <a href="#panal" className="btn-suave">{t("hoy.vacioCta")}</a>
        </div>
      )}

      {resto.length > 0 && (
        <section className="hoy-sec" style={entra(1)} aria-label={t("hoy.despues")}>
          <h2 className="hoy-h2">{t("hoy.despues")}</h2>
          <ol className="hoy-grupo">
            {resto.map((s, i) => {
              const sub = `${s.razon ? `${t(`hoy.razon.${s.razon}`)}, ` : ""}olvido ${pct(s.riesgo_olvido)}`;
              const dentro = (
                <>
                  <span className="hoy-n" aria-hidden="true">{i + 2}</span>
                  <span className="hoy-fila-txt">
                    <b>{s.concepto}</b>
                    <small className={s.razon === "olvido" ? "es-olvido" : undefined}>{sub}</small>
                  </span>
                  {s.subtema_id && <svg className="hoy-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>}
                </>
              );
              return (
                <li key={s.concepto_id ?? `s-${i}`}>
                  {s.subtema_id
                    ? <button type="button" className="hoy-fila" onClick={() => onPracticeSubtema(s.subtema_id!)}>{dentro}</button>
                    : <div className="hoy-fila is-quieta">{dentro}</div>}
                </li>
              );
            })}
          </ol>
          <p className="hoy-nota">{t("hoy.despuesNota")}</p>
        </section>
      )}

      {asignaturaId && <Plan asignaturaId={asignaturaId} client={client} />}
    </section>
  );
}
