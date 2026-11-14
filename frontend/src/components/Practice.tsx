import { useCallback, useEffect, useRef, useState } from "react";
import { api, type AnswerResult, type Confianza, type Letra, type Question } from "../api";
import { t } from "../i18n";
import { Explanation } from "./Explanation";
import { RichText } from "./RichText";

export type PracticeClient = Pick<typeof api, "nextQuestion" | "answer" | "reportQuestion">;

const LETTERS = ["A", "B", "C", "D"];
const CONFIANZAS: { id: Confianza; key: string }[] = [
  { id: "seguro", key: "conf.seguro" },
  { id: "dudo", key: "conf.dudo" },
  { id: "adivino", key: "conf.adivino" },
];

interface Props {
  sesionId: string;
  client?: PracticeClient;
  onDone?: () => void;
}

export function Practice({ sesionId, client = api, onDone }: Props) {
  const [question, setQuestion] = useState<Question | null | undefined>(undefined); // undefined = cargando
  const [chosen, setChosen] = useState<Letra | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [confianza, setConfianza] = useState<Confianza | null>(null);
  const [reported, setReported] = useState(false);
  const [answered, setAnswered] = useState(0);
  const [failed, setFailed] = useState(false);
  const locked = useRef(false); // respuesta firme: el primer clic cuenta, aunque la respuesta tarde
  const shownAt = useRef(0);
  const firstClickAt = useRef<number | null>(null);
  const loadId = useRef(0);

  const load = useCallback(async () => {
    const id = ++loadId.current;
    setQuestion(undefined);
    setChosen(null);
    setResult(null);
    setConfianza(null);
    setReported(false);
    setFailed(false);
    locked.current = false;
    firstClickAt.current = null;
    try {
      const q = await client.nextQuestion(sesionId);
      if (id !== loadId.current) return;
      if (q === null) {
        setQuestion(null);
        onDone?.();
        return;
      }
      shownAt.current = performance.now();
      setQuestion(q);
    } catch {
      if (id === loadId.current) setFailed(true);
    }
  }, [client, sesionId, onDone]);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = useCallback(
    async (pos: number) => {
      if (!question || locked.current || pos >= question.orden.length) return;
      locked.current = true;
      const letra = question.orden[pos];
      const now = performance.now();
      firstClickAt.current = now;
      setChosen(letra);
      try {
        const res = await client.answer({
          sesion_id: sesionId,
          pregunta_id: question.pregunta_id,
          orden_opciones: question.orden,
          elegida: letra,
          confianza,
          tiempos: { t_primer_clic: (now - shownAt.current) / 1000, t_envio: (now - shownAt.current) / 1000 },
        });
        setResult(res);
        setAnswered((n) => n + 1);
      } catch {
        setFailed(true);
      }
    },
    [client, confianza, question, sesionId],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "Enter" && (result || reported)) {
        e.preventDefault();
        void load();
        return;
      }
      const k = e.key.toLowerCase();
      const pos = "abcd".indexOf(k) >= 0 && k.length === 1 ? "abcd".indexOf(k) : "1234".indexOf(k);
      if (k.length === 1 && pos >= 0) void choose(pos);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, load, reported, result]);

  async function report(motivo: string) {
    if (!question) return;
    await client.reportQuestion(question.pregunta_id, motivo, sesionId);
    setReported(true);
  }

  if (failed) return <p role="alert" className="px-4 py-8">{t("app.error")}</p>;
  if (question === undefined) return <p className="px-4 py-8 text-[var(--ink-3)]">{t("app.cargando")}</p>;
  if (question === null) return null;

  return (
    <article className="mx-auto w-full max-w-3xl rounded-[16px] border border-[var(--rule)] bg-white p-5 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs tracking-[.14em] text-[var(--ink-3)] uppercase">
          {answered} {t("practica.respondidas")}
        </span>
        {!result && !reported && (
          <details className="relative">
            <summary className="cursor-pointer text-sm text-[var(--ink-3)]">{t("practica.reportar")}</summary>
            <div role="group" aria-label={t("practica.reportar")} className="mt-2 space-y-2 rounded-[11px] border border-[var(--rule-2)] bg-white p-3">
              <p className="text-sm">{t("practica.reporte_pregunta")}</p>
              {[t("practica.reporte_mal"), t("practica.reporte_dudosa")].map((m) => (
                <button key={m} type="button" onClick={() => void report(m)} className="block rounded-[11px] border border-[var(--rule-2)] px-3 py-1.5 text-sm">
                  {m}
                </button>
              ))}
              <p className="text-xs text-[var(--ink-3)]">{t("practica.reporte_nota")}</p>
            </div>
          </details>
        )}
      </div>

      <h1 className="mt-4 text-xl leading-snug font-semibold sm:text-2xl">
        <RichText text={question.enunciado} />
      </h1>

      {reported ? (
        <div className="mt-6 space-y-3">
          <p role="status">{t("practica.reportada")}</p>
          <button type="button" onClick={() => void load()} className="rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-white shadow-[3px_3px_0_var(--lila)]">
            {t("practica.siguiente")}
          </button>
        </div>
      ) : (
        <>
          <div role="group" aria-label={t("practica.confianza")} className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-[var(--ink-3)]">{t("practica.confianza")}</span>
            {CONFIANZAS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={confianza === c.id}
                disabled={locked.current}
                onClick={() => setConfianza(confianza === c.id ? null : c.id)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  confianza === c.id ? "border-[var(--lila-ink)] bg-[var(--lila-soft)] text-[var(--lila-ink)]" : "border-[var(--rule-2)]"
                }`}
              >
                {t(c.key)}
              </button>
            ))}
          </div>

          <ul aria-label={t("practica.opciones")} className="mt-5 space-y-3">
            {question.opciones.map((o, i) => {
              const done = result !== null;
              const isCorrect = done && o.letra === result.opcion_correcta;
              const isWrongPick = done && !result.correcta && o.letra === chosen;
              return (
                <li key={o.letra}>
                  <button
                    type="button"
                    aria-keyshortcuts={`${LETTERS[i]} ${i + 1}`}
                    aria-label={`${t("practica.opcion")} ${LETTERS[i]}: ${o.texto}`}
                    aria-disabled={chosen !== null}
                    onClick={() => void choose(i)}
                    className={`flex w-full items-start gap-3 rounded-[11px] border px-4 py-3 text-left transition-colors ${
                      isCorrect
                        ? "border-[var(--ok)] bg-[var(--ok-soft)]"
                        : isWrongPick
                          ? "border-[var(--ko)] bg-[var(--ko-soft)]"
                          : done
                            ? "border-[var(--rule)] opacity-60"
                            : "border-[var(--rule-2)] hover:border-[var(--lila)] hover:bg-[var(--lila-soft)]"
                    }`}
                  >
                    <span aria-hidden="true" className="font-semibold text-[var(--lila-ink)]">{LETTERS[i]}</span>
                    <span><RichText text={o.texto} /></span>
                  </button>
                </li>
              );
            })}
          </ul>

          {result && <Explanation result={result} onNext={() => void load()} />}

          {question.ayuda_larga && (
            <details className="mt-6 rounded-[11px] border border-[var(--rule)] px-4 py-3">
              <summary className="cursor-pointer text-[var(--ink-2)]">{t("practica.ayuda")}</summary>
              <p className="mt-2 text-[var(--ink-2)]"><RichText text={question.ayuda_larga} /></p>
            </details>
          )}
        </>
      )}
    </article>
  );
}
