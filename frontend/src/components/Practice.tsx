import { useCallback, useEffect, useRef, useState } from "react";
import { api, type AnswerResult, type Letra, type Question } from "../api";
import { t, tn } from "../i18n";
import { Escrita } from "./Escrita";
import { Explanation } from "./Explanation";
import { RichText } from "./RichText";

export type PracticeClient = Pick<typeof api, "nextQuestion" | "answer" | "reportQuestion"> & Partial<Pick<typeof api, "markCorrect" | "skip">>;

const NUMERO = /^[+\-−]?(\d+([.,]\d*)?|[.,]\d+)(e[+\-]?\d+)?(\/[+\-−]?(\d+([.,]\d*)?|[.,]\d+))?$/i;

/** Uno o varios números (decimales o fracciones) separados por «;» o « y ». Igual que el servidor: una fracción no divide entre 0. */
export function respuestaValida(texto: string): boolean {
  const partes = texto.trim().split(/;|\sy\s/).map((p) => p.replace(/\s/g, "")).filter(Boolean);
  const divideEntreCero = (p: string) => p.includes("/") && Number(p.split("/")[1].replace(",", ".")) === 0;
  return partes.length >= 1 && partes.length <= 6 && partes.every((p) => NUMERO.test(p) && !divideEntreCero(p));
}

const LETTERS = ["A", "B", "C", "D"];

interface Props {
  sesionId: string;
  client?: PracticeClient;
  onDone?: () => void;
  /** Respuestas ya dadas si se reanuda una sesión. */
  initialAnswered?: number;
  onAnswered?: (question: Question, result: AnswerResult) => void;
}

export function Practice({ sesionId, client: clientProp = api, onDone, initialAnswered = 0, onAnswered }: Props) {
  // Los callbacks y el cliente van por ref: un padre que los recree en cada render no debe relanzar la carga.
  const client = useRef(clientProp);
  client.current = clientProp;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onAnsweredRef = useRef(onAnswered);
  onAnsweredRef.current = onAnswered;
  const [question, setQuestion] = useState<Question | null | undefined>(undefined); // undefined = cargando
  const [chosen, setChosen] = useState<Letra | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [reported, setReported] = useState(false);
  const [valor, setValor] = useState(""); // problemas: lo que escribe la alumna
  const [numeroMal, setNumeroMal] = useState(false);
  const [answered, setAnswered] = useState(initialAnswered);
  const [failed, setFailed] = useState(false);
  const [copiado, setCopiado] = useState(true); // escritas falladas: hay que escribir bien lo fallado antes de seguir
  const locked = useRef(false); // respuesta firme: el primer clic cuenta, aunque la respuesta tarde
  const shownAt = useRef(0);
  const firstClickAt = useRef<number | null>(null);
  const loadId = useRef(0);

  const load = useCallback(async () => {
    const id = ++loadId.current;
    setQuestion(undefined);
    setChosen(null);
    setResult(null);
    setReported(false);
    setValor("");
    setNumeroMal(false);
    setFailed(false);
    setCopiado(true);
    locked.current = false;
    firstClickAt.current = null;
    try {
      const q = await client.current.nextQuestion(sesionId);
      if (id !== loadId.current) return;
      if (q === null) {
        setQuestion(null);
        onDoneRef.current?.();
        return;
      }
      shownAt.current = performance.now();
      setQuestion(q);
    } catch {
      if (id === loadId.current) setFailed(true);
    }
  }, [sesionId]);

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
        const res = await client.current.answer({
          sesion_id: sesionId,
          pregunta_id: question.pregunta_id,
          orden_opciones: question.orden,
          elegida: letra,
          tiempos: { t_primer_clic: (now - shownAt.current) / 1000, t_envio: (now - shownAt.current) / 1000 },
        });
        onAnsweredRef.current?.(question, res);
        setAnswered((n) => n + 1);
        setResult(res);
      } catch {
        setFailed(true);
      }
    },
    [load, question, sesionId],
  );

  const submitProblem = useCallback(async () => {
    if (!question || locked.current) return;
    if (!respuestaValida(valor)) {
      setNumeroMal(true);
      return;
    }
    setNumeroMal(false);
    locked.current = true;
    const now = performance.now();
    firstClickAt.current = now;
    setChosen("a");
    try {
      const res = await client.current.answer({
        sesion_id: sesionId, pregunta_id: question.pregunta_id, orden_opciones: [], elegida: "a", respuesta: valor.trim(),
        tiempos: { t_primer_clic: (now - shownAt.current) / 1000, t_envio: (now - shownAt.current) / 1000 },
      });
      onAnsweredRef.current?.(question, res);
      setAnswered((n) => n + 1);
      setResult(res);
    } catch {
      setFailed(true);
    }
  }, [load, question, sesionId, valor]);

  const submitEscrita = useCallback(async (respuestas: string[]) => {
    if (!question || locked.current) return;
    locked.current = true;
    const now = performance.now();
    firstClickAt.current = now;
    setChosen("a");
    try {
      const res = await client.current.answer({
        sesion_id: sesionId, pregunta_id: question.pregunta_id, orden_opciones: [], elegida: "a", respuestas,
        tiempos: { t_primer_clic: (now - shownAt.current) / 1000, t_envio: (now - shownAt.current) / 1000 },
      });
      onAnsweredRef.current?.(question, res);
      setAnswered((n) => n + 1);
      setResult(res);
    } catch {
      setFailed(true);
    }
  }, [question, sesionId]);

  async function marcarBien() {
    if (!question || !result || !client.current.markCorrect) return;
    const { percent } = await client.current.markCorrect(sesionId, question.pregunta_id);
    setResult({ ...result, correcta: true, trampa: null, percent });
  }

  /** Saltar: la pregunta (o el problema entero) vuelve más tarde en la sesión. No cuenta como respuesta. */
  const saltar = useCallback(async () => {
    if (!question || locked.current || !client.current.skip) return;
    locked.current = true;
    try {
      await client.current.skip(sesionId, question.pregunta_id);
      await load();
    } catch {
      locked.current = false;
      setFailed(true);
    }
  }, [load, question, sesionId]);

  // Pasa sola a la siguiente: 1 s tras un acierto, 2,5 s tras un fallo. Enter o «Siguiente» saltan la espera.
  useEffect(() => {
    if (!result || ((question?.tipo === "problema" || question?.tipo === "escrita") && !result.correcta)) return;
    const id = setTimeout(() => void load(), result.correcta ? 1000 : 2500);
    return () => clearTimeout(id);
  }, [load, question, result]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "Enter" && (result || reported) && !(question?.tipo === "escrita" && result && !copiado)) {
        e.preventDefault();
        void load();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "s" && !result && !reported) {
        void saltar();
        return;
      }
      const pos = "abcd".indexOf(k) >= 0 && k.length === 1 ? "abcd".indexOf(k) : "1234".indexOf(k);
      if (k.length === 1 && pos >= 0) void choose(pos);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, copiado, load, question, reported, result, saltar]);

  async function report(motivo: string) {
    if (!question) return;
    await client.current.reportQuestion(question.pregunta_id, motivo, sesionId);
    setReported(true);
  }

  if (failed) return <p role="alert" className="px-4 py-8">{t("app.error")}</p>;
  if (question === undefined) return <p className="px-4 py-8 text-[var(--ink-3)]">{t("app.cargando")}</p>;
  if (question === null) return null;

  return (
    <article className="mx-auto w-full max-w-3xl rounded-[16px] border border-[var(--rule)] bg-white p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <span className="text-xs tracking-[.14em] text-[var(--ink-3)] uppercase">
          {question.tema && question.subtema ? `${question.tema} · ${question.subtema}` : ""}
        </span>
        <span className="text-xs tracking-[.14em] text-[var(--ink-3)] uppercase">
          {tn("practica.respondidas", answered)}
        </span>
        {question.reintento && <span className="w-full rounded-[8px] bg-[var(--lila-soft)] px-3 py-1 text-sm font-medium text-[var(--lila-ink)]">{t("practica.repaso")}</span>}
        {!result && !reported && (
          <div className="flex items-center gap-4">
            {client.current.skip && (
              <button type="button" onClick={() => void saltar()} aria-keyshortcuts="S" className="text-sm font-medium text-[var(--ink-2)] underline underline-offset-4">
                {t("practica.saltar")}
              </button>
            )}
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
          </div>
        )}
      </div>

      {question.contexto && (
        <div className="mt-4 rounded-[11px] border border-[var(--lila-tint)] bg-[var(--lila-soft)] px-4 py-3 text-[var(--ink-2)]">
          <span className="text-xs font-semibold tracking-[.14em] text-[var(--lila-ink)] uppercase">{t("practica.enunciadoComun")}</span>
          <p className="mt-1"><RichText text={question.contexto} /></p>
        </div>
      )}

      <h1 className="mt-4 text-xl leading-snug font-semibold sm:text-2xl">
        {question.apartado && <span className="text-[var(--lila-ink)]">{question.apartado})</span>}{" "}
        <RichText text={question.enunciado} />
      </h1>

      {question.imagen && (
        <img
          src={`/api/imagen/${question.imagen}`} alt={t("practica.imagenAlt")}
          className="mx-auto mt-4 max-h-72 w-auto max-w-full rounded-[11px] border border-[var(--rule)] bg-white object-contain p-2"
        />
      )}

      {reported ? (
        <div className="mt-6 space-y-3">
          <p role="status">{t("practica.reportada")}</p>
          <button type="button" onClick={() => void load()} className="rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-white shadow-[3px_3px_0_var(--lila)]">
            {t("practica.siguiente")}
          </button>
        </div>
      ) : (
        <>
          {question.tipo === "escrita" ? (
            <Escrita key={question.pregunta_id} etiquetas={question.campos ?? [""]} disabled={chosen !== null} resultado={result?.campos} onSubmit={(v) => void submitEscrita(v)} onCopiaLista={setCopiado} />
          ) : question.tipo === "problema" ? (
            <form
              className="mt-5 flex flex-wrap items-center gap-3"
              onSubmit={(e) => { e.preventDefault(); void submitProblem(); }}
            >
              <label htmlFor="respuesta" className="sr-only">{t("practica.tuRespuesta")}</label>
              <input
                id="respuesta" autoFocus inputMode="decimal" autoComplete="off" value={valor} disabled={chosen !== null}
                onChange={(e) => setValor(e.target.value)} placeholder={t("practica.tuRespuesta")}
                className="w-64 rounded-[11px] border border-[var(--rule-2)] px-4 py-3 text-lg tabular-nums focus-visible:border-[var(--lila)]"
              />
              <button type="submit" disabled={chosen !== null} className="rounded-[11px] bg-[var(--ink)] px-5 py-3 font-medium text-white shadow-[3px_3px_0_var(--lila)] disabled:opacity-60">
                {t("practica.comprobar")}
              </button>
              <p className="w-full text-sm text-[var(--ink-3)]">{t("practica.formatoRespuesta")}</p>
              {numeroMal && <p role="alert" className="w-full text-sm text-[var(--ko)]">{t("practica.numeroNoValido")}</p>}
            </form>
          ) : (
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
                      <span aria-hidden="true" className="flex h-[30px] w-[34px] shrink-0 items-center justify-center bg-[var(--lila-soft)] text-sm font-semibold text-[var(--lila-ink)] [clip-path:var(--hex-flat)]">{LETTERS[i]}</span>
                      <span><RichText text={o.texto} /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {result && <Explanation result={result} siguienteBloqueado={question.tipo === "escrita" && !copiado} onNext={() => void load()} onMarcarBien={question.tipo === "problema" ? () => void marcarBien() : undefined} />}

          {question.ayuda_larga && result && ( // antes de responder podría desvelar la respuesta
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
