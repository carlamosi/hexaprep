import type { ReactNode } from "react";
import type { AnswerResult } from "../api";
import { t } from "../i18n";
import { BookletButton } from "./BookletButton";
import { RichText } from "./RichText";

/** Feedback breve tipo entrenador, explicación plegada y enlace al booklet. */
export function Explanation({ result, onNext, onMarcarBien, siguienteBloqueado, avanceMs, onExplicacionAbierta, extras }: {
  result: AnswerResult; onNext: () => void; onMarcarBien?: () => void; siguienteBloqueado?: boolean;
  /** Si hay valor, la pregunta pasa sola en esos ms y se dibuja el aro de espera. */
  avanceMs?: number; onExplicacionAbierta?: () => void;
  /** Secundario (valía, ayuda): se pliega con el booklet en «Más». */
  extras?: ReactNode;
}) {
  const masBooklet = !!(result.fuente_id && result.fuente_pagina);
  return (
    <section aria-live="polite" className="mt-6 space-y-4">
      {/* En una escrita fallada el rojo de los campos ya lo dice: solo queda el aviso para lectores de pantalla */}
      {!result.correcta && result.campos && !result.trampa && result.solucion == null ? (
        <p className="sr-only">{t("practica.falloEscrita")}</p>
      ) : (
        <div
          className={`rounded-[11px] border px-4 py-3 ${
            result.correcta ? "border-[var(--ok)] bg-[var(--ok-soft)]" : "border-[var(--ko)] bg-[var(--ko-soft)]"
          }`}
        >
          <p className="font-semibold">{result.correcta ? t("practica.acierto") : t(result.campos ? "practica.falloEscrita" : result.solucion != null ? "practica.falloProblema" : "practica.fallo")}</p>
          {!result.correcta && result.trampa && <p className="mt-1">{result.trampa}</p>}
          {result.solucion != null && <p className="mt-1">{t("practica.solucion")}: <strong>{[result.solucion].flat().map((v) => String(v).replace(".", ",")).join("; ")}</strong></p>}
        </div>
      )}

      {/* Solo lo que aporta: los huecos bien ya van en verde y la diferencia ya muestra la forma correcta;
          aquí quedan la regla de cada error y las formas alternativas válidas */}
      {result.campos && !result.correcta && (() => {
        const filas = result.campos.filter((c) => !c.correcto && (c.nota || c.esperado.length > 1));
        return filas.length > 0 && (
          <ul className="space-y-2">
            {filas.map((c, i) => (
              <li key={i} className="rounded-[11px] border border-[var(--rule)] bg-[var(--card)] px-4 py-2">
                {c.esperado.length > 1 && <p><span className="font-semibold">{c.etiqueta}</span>: <strong>{c.esperado.join(" o ")}</strong></p>}
                {c.nota && <p className={c.esperado.length > 1 ? "mt-1 text-[var(--ink-2)]" : ""}>{c.nota}</p>}
              </li>
            ))}
          </ul>
        );
      })()}

      {result.explicacion && (
        <details className="rounded-[11px] border border-[var(--rule)] bg-[var(--card)] px-4 py-3" onToggle={(e) => { if (e.currentTarget.open) onExplicacionAbierta?.(); }}>
          <summary className="cursor-pointer font-medium">{t("practica.ver_explicacion")}</summary>
          <p className="mt-2 text-[var(--ink-2)]">
            <RichText text={result.explicacion} />
          </p>
        </details>
      )}

      <p className="text-sm text-[var(--ink-3)]">
        {t("practica.dominio")}: {result.percent} %
      </p>

      {(masBooklet || extras) && (
        <details className="rounded-[11px] border border-[var(--rule)] px-4 py-3">
          <summary className="cursor-pointer text-[var(--ink-2)]">{t("practica.mas")}</summary>
          <div className="mt-3 space-y-3">
            {masBooklet && <BookletButton fuenteId={result.fuente_id!} cara={result.fuente_cara} pagina={result.fuente_pagina!} />}
            {extras}
          </div>
        </details>
      )}

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 bg-[var(--card)] px-1 py-3">
        {onMarcarBien && !result.correcta && (
          <button type="button" onClick={onMarcarBien} className="rounded-[11px] border border-[var(--rule-2)] bg-[var(--card)] px-5 py-2 font-medium">
            {t("practica.loHeHechoBien")}
          </button>
        )}
        <button
          type="button"
          onClick={onNext} disabled={siguienteBloqueado}
          className="relative rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-[var(--on-ink)] shadow-[3px_3px_0_var(--lila)] btn-duro disabled:opacity-50"
        >
          {t("practica.siguiente")}
          {avanceMs !== undefined && (
            <svg role="progressbar" aria-label={t("practica.siguientePregunta")} className="ml-2 inline-block h-4 w-4 -rotate-90 align-[-2px]" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity=".3" strokeWidth="2" />
              <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" pathLength="100"
                strokeDasharray="100" className="aro-avance" style={{ animationDuration: `${avanceMs}ms` }} />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}
