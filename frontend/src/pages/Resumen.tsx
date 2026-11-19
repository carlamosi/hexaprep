import { useEffect, useState } from "react";
import { api, type ResumenSesion } from "../api";
import { Respuesta } from "../components/historial/Respuesta";
import { Hexagon } from "../components/Hexagon";
import { t } from "../i18n";
import { Review, type Fallo } from "./Review";

const minutos = (s: number) => (s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`);

/** Fin de sesión, sin rachas: los hexágonos trabajados rellenándose, lo que ha subido, los errores de hoy con su respuesta y un botón. */
export function Resumen({ sesionId, fallos, onVolver, onSeguir, client = api }: {
  sesionId: string; fallos: Fallo[]; onVolver: () => void; onSeguir?: () => void;
  client?: Partial<Pick<typeof api, "resumenSesion">>;
}) {
  const [r, setR] = useState<ResumenSesion | null>(null);
  const [lleno, setLleno] = useState(false); // los hexágonos parten del antes y suben al después
  const [abierta, setAbierta] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    client.resumenSesion?.(sesionId).then((x) => vivo && setR(x)).catch(() => {});
    return () => { vivo = false; };
  }, [client, sesionId]);
  useEffect(() => {
    if (!r) return;
    const id = setTimeout(() => setLleno(true), 350);
    return () => clearTimeout(id);
  }, [r]);

  const subidas = r?.conceptos.filter((c) => c.percent_despues > c.percent_antes).length ?? 0;
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("fin.titulo")}</h1>
      {r && r.respondidas > 0 && (
        <>
          <p className="text-lg">
            {subidas > 0 ? t("fin.subido").replace("{n}", `${subidas} ${subidas === 1 ? "concepto" : "conceptos"}`) : ""}
          </p>
          <p className="text-[var(--ink-2)]">
            {r.respondidas} {t("fin.preguntas")} · {minutos(r.tiempo_activo_s)} {t("fin.tiempo")} · {Math.round((100 * r.aciertos) / r.respondidas)} % {t("fin.aciertos")}
          </p>
          <section aria-label={t("fin.conceptos")}>
            <h2 className="mb-3 text-sm font-semibold tracking-[.14em] text-[var(--ink-3)] uppercase">{t("fin.conceptos")}</h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {r.conceptos.map((c) => (
                <li key={c.concepto_id} className="text-center">
                  <Hexagon percent={lleno ? c.percent_despues : c.percent_antes} color="var(--lila)" />
                  <span className="mt-1 block text-sm leading-tight text-[var(--ink-2)]">{c.nombre}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      {fallos.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("fin.errores")}</h2>
          <ul className="space-y-3">
            {fallos.map((f) => (
              <li key={f.pregunta_id} className="rounded-[11px] border border-[var(--rule)] bg-[var(--card)] p-4">
                <p className="text-[var(--ink-2)]">{f.enunciado}</p>
                <button type="button" aria-expanded={abierta === f.pregunta_id} onClick={() => setAbierta(abierta === f.pregunta_id ? null : f.pregunta_id)}
                  className="mt-2 min-h-11 text-sm font-medium text-[var(--lila-ink)] underline underline-offset-4">
                  {t(abierta === f.pregunta_id ? "hist.ocultarRespuesta" : "hist.verRespuesta")}
                </button>
                {abierta === f.pregunta_id && <Respuesta preguntaId={f.pregunta_id} />}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-sm text-[var(--ink-3)]">{t("fin.dormir")}</p>
      <div className="flex flex-wrap gap-3">
        {onSeguir && <button type="button" onClick={onSeguir} className="rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-[var(--on-ink)] shadow-[3px_3px_0_var(--lila)]">{t("fin.seguir")}</button>}
        <button type="button" onClick={onVolver} className="rounded-[11px] border border-[var(--rule-2)] bg-[var(--card)] px-5 py-2 font-medium">{t("fin.volver")}</button>
      </div>
    </main>
  );
}
