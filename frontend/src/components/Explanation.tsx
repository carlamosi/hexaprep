import type { ReactNode } from "react";
import type { AnswerResult } from "../api";
import { t } from "../i18n";
import { BotonGuardar } from "./BotonGuardar";
import { RichText } from "./RichText";

const TRAZO = { fill: "none", stroke: "currentColor", strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Hoja de corrección (diseño B): hexágono verde o rojo, título, trampa o solución, enlaces y «Siguiente». En portátil va en línea bajo las opciones. */
export function Explanation({ result, preguntaId, enunciado, onNext, onMarcarBien, siguienteBloqueado, avanceMs, onExplicacionAbierta, extras, etiquetaMarcarBien }: {
  result: AnswerResult; onNext: () => void;
  /** Con ellos, la explicación se puede guardar (el enunciado la identifica). */
  preguntaId?: string; enunciado?: string; onMarcarBien?: () => void; siguienteBloqueado?: boolean;
  /** Si hay valor, la pregunta pasa sola en esos ms y se dibuja la barra de espera. */
  avanceMs?: number; onExplicacionAbierta?: () => void;
  /** Enlaces secundarios (valía, ayuda). */
  extras?: ReactNode;
  etiquetaMarcarBien?: string;
}) {
  const ok = result.correcta;
  return (
    <section aria-live="polite" className="pq-sheet">
      <div className="pq-grab" />
      <div className="pq-sh-h">
        <span className={`pq-badge ${ok ? "ok" : "ko"}`} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" {...TRAZO}>{ok ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6 6l12 12M18 6L6 18" />}</svg>
        </span>
        <p className="pq-sh-t">{ok ? t("practica.acierto") : t(result.campos ? "practica.falloEscrita" : result.solucion != null ? "practica.falloProblema" : "practica.fallo")}</p>
      </div>
      {!ok && result.trampa && <p className="pq-sh-b">{result.trampa}</p>}
      {result.solucion != null && <p className="pq-sol">{t("practica.solucion")}: <strong>{[result.solucion].flat().map((v) => String(v).replace(".", ",")).join("; ")}</strong></p>}

      {/* Solo lo que aporta: los huecos bien ya van en verde y la diferencia ya muestra la forma correcta;
          aquí quedan la regla de cada error y las formas alternativas válidas */}
      {result.campos && !ok && (() => {
        const filas = result.campos.filter((c) => !c.correcto && (c.nota || c.esperado.length > 1));
        return filas.length > 0 && (
          <ul className="pq-sh-b space-y-1">
            {filas.map((c, i) => (
              <li key={i}>
                {c.esperado.length > 1 && <p><span className="font-semibold">{c.etiqueta}</span>: <strong>{c.esperado.join(" o ")}</strong></p>}
                {c.nota && <p>{c.nota}</p>}
              </li>
            ))}
          </ul>
        );
      })()}

      <div className="pq-lks">
        {result.explicacion && (
          <details onToggle={(e) => { if (e.currentTarget.open) onExplicacionAbierta?.(); }}>
            <summary className="pq-lk">{t("practica.ver_explicacion")}</summary>
            <p className="pq-sh-b"><RichText text={result.explicacion} /></p>
            {preguntaId && enunciado && <BotonGuardar preguntaId={preguntaId} tipo="ejemplo" huella={enunciado} />}
          </details>
        )}
        {extras}
      </div>

      <p className="pq-dom">{t("practica.dominio")}: {result.percent} %</p>

      {onMarcarBien && !ok && <button type="button" onClick={onMarcarBien} className="pq-alt">{etiquetaMarcarBien ?? t("practica.loHeHechoBien")}</button>}
      <button type="button" onClick={onNext} disabled={siguienteBloqueado} className="pq-next btn-duro">
        {t("practica.siguiente")}
        {avanceMs !== undefined && <span role="progressbar" aria-label={t("practica.siguientePregunta")} className="pq-bar" style={{ animationDuration: `${avanceMs}ms` }} />}
      </button>
    </section>
  );
}
