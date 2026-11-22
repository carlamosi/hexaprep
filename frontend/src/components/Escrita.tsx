import { useEffect, useRef, useState } from "react";
import type { AnswerResult } from "../api";
import { compararLetras, masCercana, mismaForma, type Segmento } from "../diff";
import { t } from "../i18n";

function Letras({ segs, malo }: { segs: Segmento[]; malo: string }) {
  return <>{segs.map((s, k) => (s.ok ? <span key={k}>{s.texto}</span> : <mark key={k} className={`rounded-sm bg-transparent font-bold ${malo}`}>{s.texto}</mark>))}</>;
}

/** «Escribiste X, lo correcto es Y» con las letras que difieren marcadas. */
function Diferencia({ escrito, esperado }: { escrito: string; esperado: string[] }) {
  const forma = masCercana(escrito, esperado);
  if (!forma || !escrito.trim()) return null;
  const d = compararLetras(escrito, forma);
  return (
    <p aria-label={`Escribiste ${escrito.trim()}, lo correcto es ${forma}`} className="w-full pl-0 text-lg sm:pl-[108px]">
      <Letras segs={d.tu} malo="text-[var(--ko)] underline decoration-wavy" />
      <span aria-hidden="true" className="px-2 text-[var(--ink-3)]">→</span>
      <Letras segs={d.correcto} malo="text-[var(--ok)] underline" />
    </p>
  );
}

interface Props {
  etiquetas: string[];
  disabled: boolean;
  resultado: AnswerResult["campos"];
  onSubmit: (valores: string[], stats: Record<string, number>) => void;
  /** Corrección activa terminada escribiendo (no al saltarla): segundos que tardó y huecos copiados. */
  onCopia?: (d: { t_copia: number; n_copias: number }) => void;
  /** Avisa de si ya se puede seguir: falta escribir bien lo fallado (corrección activa) salvo que se salte. */
  onCopiaLista?: (lista: boolean) => void;
}

/** Una caja por hueco (gerundi, participi...) . Enter pasa al hueco siguiente y envía en el último. */
export function Escrita({ etiquetas, disabled, resultado, onSubmit, onCopiaLista, onCopia }: Props) {
  const [valores, setValores] = useState<string[]>(() => etiquetas.map(() => ""));
  const cajas = useRef<(HTMLInputElement | null)[]>([]);
  const [copias, setCopias] = useState<string[]>(() => etiquetas.map(() => ""));
  const [omitida, setOmitida] = useState(false);
  const falladas = (resultado ?? []).map((r, i) => (r.correcto ? -1 : i)).filter((i) => i >= 0);
  const lista = omitida || falladas.every((i) => mismaForma(copias[i], resultado![i].esperado));
  useEffect(() => { onCopiaLista?.(lista); }, [lista, onCopiaLista]);
  // señales de duda al escribir: teclas, borrados y tiempo desde la primera tecla hasta enviar
  const teclas = useRef({ n: 0, borrados: 0, t0: null as number | null });
  const copiaDesde = useRef<number | null>(null);
  useEffect(() => {
    if (falladas.length === 0) return;
    if (copiaDesde.current === null) copiaDesde.current = performance.now();
    if (lista && !omitida) onCopia?.({ t_copia: Math.round((performance.now() - copiaDesde.current) / 100) / 10, n_copias: falladas.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, falladas.length > 0]);

  function poner(i: number, v: string) {
    setValores((vs) => vs.map((x, j) => (j === i ? v : x)));
  }
  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valores.every((v) => v.trim())) return;
        const k = teclas.current;
        onSubmit(valores.map((v) => v.trim()), { n_teclas: k.n, n_borrados: k.borrados, t_escritura: k.t0 === null ? 0 : Math.round(performance.now() - k.t0) / 1000 });
      }}
    >
      {etiquetas.map((et, i) => {
        const r = resultado?.[i];
        return (
          <div key={i} className="flex flex-wrap items-center gap-3">
            <label htmlFor={`escrita-${i}`} className="w-24 text-sm font-semibold tracking-[.08em] text-[var(--ink-2)] uppercase">{et || t("practica.tuRespuesta")}</label>
            <input
              id={`escrita-${i}`} ref={(el) => { cajas.current[i] = el; }} autoFocus={i === 0} autoComplete="off" autoCorrect="off" autoCapitalize="none"
              spellCheck={false} lang="ca" value={valores[i]} disabled={disabled}
              onChange={(e) => poner(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") {
                  teclas.current.t0 ??= performance.now();
                  teclas.current.n += 1;
                  if (e.key === "Backspace" || e.key === "Delete") teclas.current.borrados += 1;
                }
                if (e.key === "Enter" && i < etiquetas.length - 1) { e.preventDefault(); cajas.current[i + 1]?.focus(); } }}
              className={`w-64 rounded-[11px] border px-4 py-3 text-lg transition-colors duration-150 focus-visible:border-[var(--lila)] ${
                r ? (r.correcto ? "border-[var(--ok)] bg-[var(--ok-soft)]" : "border-[var(--ko)] bg-[var(--ko-soft)]") : "border-[var(--rule-2)]"
              }`}
            />
            {r && !r.correcto && <Diferencia escrito={valores[i]} esperado={r.esperado} />}
            {r && !r.correcto && (
              <div className="flex w-full flex-wrap items-center gap-3 sm:pl-[108px]">
                <label htmlFor={`copia-${i}`} className="sr-only">{t("practica.escribelaBien")}</label>
                <input
                  id={`copia-${i}`} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} lang="ca"
                  placeholder={t("practica.escribelaBien")} value={copias[i]} disabled={omitida || mismaForma(copias[i], r.esperado)}
                  onChange={(e) => setCopias((cs) => cs.map((c, j) => (j === i ? e.target.value : c)))}
                  className={`w-64 rounded-[11px] border px-4 py-3 text-lg transition-colors duration-150 ${mismaForma(copias[i], r.esperado) ? "border-[var(--ok)] bg-[var(--ok-soft)]" : "border-[var(--rule-2)]"}`}
                />
                {mismaForma(copias[i], r.esperado) && <span aria-hidden="true" className="text-[var(--ok)]">✓</span>}
              </div>
            )}
          </div>
        );
      })}
      {!resultado && (
        <button type="submit" disabled={disabled} className="rounded-[11px] bg-[var(--ink)] px-5 py-3 font-medium text-[var(--on-ink)] shadow-[3px_3px_0_var(--lila)] btn-duro disabled:opacity-60">
          {t("practica.comprobar")}
        </button>
      )}
      {falladas.length > 0 && !lista && (
        <div className="space-y-1">
          <p className="text-sm text-[var(--ink-3)]">{t("practica.copiaAyuda")}</p>
          <button type="button" className="text-sm font-medium text-[var(--ink-2)] underline underline-offset-4" onClick={() => setOmitida(true)}>{t("practica.seguirSinCopiar")}</button>
        </div>
      )}
    </form>
  );
}
