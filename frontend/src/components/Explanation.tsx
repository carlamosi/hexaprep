import type { AnswerResult } from "../api";
import { t } from "../i18n";
import { BookletButton } from "./BookletButton";
import { RichText } from "./RichText";

/** Feedback breve tipo entrenador, explicación plegada y enlace al booklet. */
export function Explanation({ result, onNext }: { result: AnswerResult; onNext: () => void }) {
  return (
    <section aria-live="polite" className="mt-6 space-y-4">
      <div
        className={`rounded-[11px] border px-4 py-3 ${
          result.correcta ? "border-[var(--ok)] bg-[var(--ok-soft)]" : "border-[var(--ko)] bg-[var(--ko-soft)]"
        }`}
      >
        <p className="font-semibold">{result.correcta ? t("practica.acierto") : t("practica.fallo")}</p>
        {!result.correcta && result.trampa && <p className="mt-1">{result.trampa}</p>}
      </div>

      {result.explicacion && (
        <details className="rounded-[11px] border border-[var(--rule)] bg-white px-4 py-3">
          <summary className="cursor-pointer font-medium">{t("practica.ver_explicacion")}</summary>
          <p className="mt-2 text-[var(--ink-2)]">
            <RichText text={result.explicacion} />
          </p>
        </details>
      )}

      <p className="text-sm text-[var(--ink-3)]">
        {t("practica.dominio")}: {result.percent} %
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {result.fuente_id && result.fuente_pagina && (
          <BookletButton fuenteId={result.fuente_id} cara={result.fuente_cara} pagina={result.fuente_pagina} />
        )}
        <button
          type="button"
          onClick={onNext}
          className="rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-white shadow-[3px_3px_0_var(--lila)]"
        >
          {t("practica.siguiente")}
        </button>
      </div>
    </section>
  );
}
