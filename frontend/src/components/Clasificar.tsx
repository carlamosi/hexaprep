import { useEffect, useState } from "react";
import type { AnswerResult } from "../api";
import { t } from "../i18n";

// shortcut: una «clasificar» es una escrita cuyo enunciado es «Classifica cada paraula: A, B o C.»; si hace falta otro texto, pasar a un campo `columnas` en el banco.
const PATRON = /^Classifica cada paraula: (.+)\.$/;

/** Columnas de una pregunta de clasificar, o null si el enunciado no es de ese tipo. */
export function columnasDe(enunciado: string): string[] | null {
  const m = PATRON.exec(enunciado);
  return m ? m[1].split(/,\s*|\s+o\s+/).filter(Boolean) : null;
}

interface Props {
  palabras: string[];
  columnas: string[];
  disabled: boolean;
  resultado: AnswerResult["campos"] | undefined;
  onSubmit: (valores: string[], stats: Record<string, number>) => void;
  onCopiaLista?: (lista: boolean) => void;
  /** Solo pruebas: colocación inicial. */
  initial?: (string | null)[];
}

/** Tocar una palabra y luego su columna (móvil y teclado), o arrastrarla (escritorio). */
export function Clasificar({ palabras, columnas, disabled, resultado, onSubmit, onCopiaLista, initial }: Props) {
  const [lugar, setLugar] = useState<(string | null)[]>(() => initial ?? palabras.map(() => null));
  const [sel, setSel] = useState<number | null>(null);
  const [t0] = useState(() => performance.now());
  useEffect(() => { onCopiaLista?.(true); }, [onCopiaLista]);
  const bloqueado = disabled || resultado != null;

  function colocar(i: number, col: string | null) {
    setLugar((l) => l.map((x, j) => (j === i ? col : x)));
    setSel(null);
  }
  function fichas(col: string | null) {
    return palabras.map((p, i) => ({ p, i })).filter(({ i }) => lugar[i] === col).map(({ p, i }) => {
      const r = resultado?.[i];
      const estado = r ? (r.correcto ? "border-[var(--ok)] bg-[var(--ok-soft)]" : "border-[var(--ko)] bg-[var(--ko-soft)]")
        : sel === i ? "border-[var(--lila)] bg-[var(--lila-soft,transparent)] ring-2 ring-[var(--lila)]" : "border-[var(--rule-2)] bg-[var(--paper,transparent)]";
      return (
        <div key={i} className="flex flex-col items-start gap-1">
          <button
            type="button" draggable={!bloqueado} disabled={bloqueado} aria-pressed={sel === i}
            onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(i)); setSel(i); }}
            onClick={() => setSel(sel === i ? null : i)}
            className={`min-h-11 cursor-grab rounded-[11px] border px-4 text-lg transition-colors duration-150 active:cursor-grabbing ${estado}`}
          >{p}</button>
          {r && !r.correcto && <p data-fallo className="text-sm text-[var(--ko)]">{p} → {r.esperado[0]}</p>}
        </div>
      );
    });
  }

  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm text-[var(--ink-3)]">{t("practica.clasificaAyuda")}</p>
      <div className="flex min-h-11 flex-wrap gap-2" aria-label={t("practica.sinColocar")}>{fichas(null)}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {columnas.map((col) => (
          <section
            key={col} onDragOver={(e) => { if (!bloqueado) e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); if (!bloqueado) colocar(Number(e.dataTransfer.getData("text/plain")), col); }}
            className="flex min-h-32 flex-col gap-2 rounded-[11px] border border-dashed border-[var(--rule-2)] p-2"
          >
            <button
              type="button" disabled={bloqueado || sel === null} aria-label={`${t("practica.columna")} ${col}`}
              onClick={() => sel !== null && colocar(sel, col)}
              className="min-h-11 rounded-[8px] text-sm font-semibold tracking-[.08em] text-[var(--ink-2)] uppercase transition-colors duration-150 enabled:bg-[var(--lila-soft,transparent)] enabled:ring-1 enabled:ring-[var(--lila)]"
            >{col}</button>
            <div className="flex flex-wrap gap-2">{fichas(col)}</div>
          </section>
        ))}
      </div>
      {!resultado && (
        <button
          type="button" disabled={bloqueado || lugar.some((x) => x === null)}
          onClick={() => onSubmit(lugar as string[], { n_teclas: 0, n_borrados: 0, t_escritura: Math.round(performance.now() - t0) / 1000 })}
          className="rounded-[11px] bg-[var(--ink)] px-5 py-3 font-medium text-[var(--on-ink)] shadow-[3px_3px_0_var(--lila)] btn-duro disabled:opacity-60"
        >{t("practica.comprobar")}</button>
      )}
    </div>
  );
}
