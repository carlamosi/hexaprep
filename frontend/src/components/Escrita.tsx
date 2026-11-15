import { useRef, useState } from "react";
import type { AnswerResult } from "../api";
import { t } from "../i18n";

/** Letras que no están en el teclado español y la ele geminada: se insertan donde está el cursor. */
export const CARACTERES = ["à", "è", "é", "í", "ï", "ò", "ó", "ú", "ü", "ç", "l·l"];

export function insertar(valor: string, ini: number, fin: number, c: string): { valor: string; cursor: number } {
  return { valor: valor.slice(0, ini) + c + valor.slice(fin), cursor: ini + c.length };
}

interface Props {
  etiquetas: string[];
  disabled: boolean;
  resultado: AnswerResult["campos"];
  onSubmit: (valores: string[]) => void;
}

/** Una caja por hueco (gerundi, participi...) con la barra de caracteres catalanes. Enter pasa al hueco siguiente y envía en el último. */
export function Escrita({ etiquetas, disabled, resultado, onSubmit }: Props) {
  const [valores, setValores] = useState<string[]>(() => etiquetas.map(() => ""));
  const cajas = useRef<(HTMLInputElement | null)[]>([]);
  const activa = useRef(0);

  function poner(i: number, v: string) {
    setValores((vs) => vs.map((x, j) => (j === i ? v : x)));
  }
  function insertarCaracter(c: string) {
    const i = activa.current;
    const el = cajas.current[i];
    const r = insertar(valores[i], el?.selectionStart ?? valores[i].length, el?.selectionEnd ?? valores[i].length, c);
    poner(i, r.valor);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(r.cursor, r.cursor); });
  }

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(e) => { e.preventDefault(); if (valores.every((v) => v.trim())) onSubmit(valores.map((v) => v.trim())); }}
    >
      {etiquetas.map((et, i) => {
        const r = resultado?.[i];
        return (
          <div key={i} className="flex flex-wrap items-center gap-3">
            <label htmlFor={`escrita-${i}`} className="w-24 text-sm font-semibold tracking-[.08em] text-[var(--ink-2)] uppercase">{et || t("practica.tuRespuesta")}</label>
            <input
              id={`escrita-${i}`} ref={(el) => { cajas.current[i] = el; }} autoFocus={i === 0} autoComplete="off" autoCapitalize="none"
              spellCheck={false} lang="ca" value={valores[i]} disabled={disabled}
              onFocus={() => { activa.current = i; }} onChange={(e) => poner(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && i < etiquetas.length - 1) { e.preventDefault(); cajas.current[i + 1]?.focus(); } }}
              className={`w-64 rounded-[11px] border px-4 py-3 text-lg focus-visible:border-[var(--lila)] ${
                r ? (r.correcto ? "border-[var(--ok)] bg-[var(--ok-soft)]" : "border-[var(--ko)] bg-[var(--ko-soft)]") : "border-[var(--rule-2)]"
              }`}
            />
          </div>
        );
      })}
      {!disabled && (
        <div role="group" aria-label={t("practica.caracteres")} className="flex flex-wrap gap-2">
          {CARACTERES.map((c) => (
            <button
              key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertarCaracter(c)}
              className="min-w-10 rounded-[8px] border border-[var(--rule-2)] bg-white px-2.5 py-1.5 text-lg"
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <button type="submit" disabled={disabled} className="rounded-[11px] bg-[var(--ink)] px-5 py-3 font-medium text-white shadow-[3px_3px_0_var(--lila)] disabled:opacity-60">
        {t("practica.comprobar")}
      </button>
      <p className="text-sm text-[var(--ink-3)]">{t("practica.formatoEscrita")}</p>
    </form>
  );
}
