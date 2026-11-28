import { useCallback, useEffect, useRef, useState } from "react";
import { api, type AnswerResult, type Letra, type Question } from "../api";
import { t, tn } from "../i18n";
import { Clasificar, columnasDe } from "./Clasificar";
import { Escrita } from "./Escrita";
import { Explanation } from "./Explanation";
import { RichText } from "./RichText";
import { ErrorCarga } from "./ErrorCarga";
import { BotonGuardar } from "./BotonGuardar";
import { sinPrefijoTema } from "../rotulo";
import { guardarPregunta, preguntaGuardada } from "../session";
import "./practice.css";

export type PracticeClient = Pick<typeof api, "nextQuestion" | "answer" | "reportQuestion"> & Partial<Pick<typeof api, "markCorrect" | "skip" | "getSession" | "evento" | "facil" | "ocultar" | "alternativa" | "fin">>;

const NUMERO = /^[+\-−]?(\d+([.,]\d*)?|[.,]\d+)(e[+\-]?\d+)?(\/[+\-−]?(\d+([.,]\d*)?|[.,]\d+))?$/i;

/** Uno o varios números (decimales o fracciones) separados por «;» o « y ». Igual que el servidor: una fracción no divide entre 0. */
export function respuestaValida(texto: string): boolean {
  const partes = texto.trim().split(/;|\sy\s/).map((p) => p.replace(/\s/g, "")).filter(Boolean);
  const divideEntreCero = (p: string) => p.includes("/") && Number(p.split("/")[1].replace(",", ".")) === 0;
  return partes.length >= 1 && partes.length <= 6 && partes.every((p) => NUMERO.test(p) && !divideEntreCero(p));
}

const LETTERS = ["A", "B", "C", "D"];
/** Tras un acierto pasa sola a la siguiente pregunta pasados estos ms (un fallo nunca pasa solo). */
export const AVANCE_MS = 3000;

interface Props {
  sesionId: string;
  client?: PracticeClient;
  onDone?: () => void;
  /** «Terminar sesión»: visible en toda pregunta, también tras responder o reportar. */
  onTerminar?: () => void;
  /** Respuestas ya dadas si se reanuda una sesión. */
  initialAnswered?: number;
  onAnswered?: (question: Question, result: AnswerResult) => void;
}

/** Esqueleto con la forma de la pregunta (nunca el texto «Cargando»). */
function Esqueleto() {
  return (
    <article data-testid="esqueleto" aria-busy="true" aria-label={t("app.cargando")} className="pq-esq motion-safe:animate-pulse">
      <div className="h-11" />
      <div className="mt-2 h-3 w-40 rounded bg-[var(--rule)]" />
      <div className="mt-4 h-7 w-4/5 rounded bg-[var(--rule)]" />
      <div className="mt-2 h-7 w-3/5 rounded bg-[var(--rule)]" />
      <div className="mt-8 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 rounded-[14px] bg-[var(--rule)]/60" />)}</div>
    </article>
  );
}

export function Practice({ sesionId, client: clientProp = api, onDone, initialAnswered = 0, onAnswered, onTerminar }: Props) {
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
  const [reported, setReported] = useState<string | false>(false); // texto de cierre tras reportar u ocultar
  const [menu, setMenu] = useState(false); // popover de reporte (⋯)
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorReporte, setErrorReporte] = useState(false);
  const [valiaEnviada, setValiaEnviada] = useState(false);
  const escritas = useRef<string[]>([]);
  const [valor, setValor] = useState(""); // problemas: lo que escribe la alumna
  const [numeroMal, setNumeroMal] = useState(false);
  const [answered, setAnswered] = useState(initialAnswered);
  const [failed, setFailed] = useState(false);
  const [copiado, setCopiado] = useState(true); // escritas falladas: hay que escribir bien lo fallado antes de seguir
  const locked = useRef(false); // respuesta firme: el primer clic cuenta, aunque la respuesta tarde
  const shownAt = useRef(0);
  const firstClickAt = useRef<number | null>(null);
  const loadId = useRef(0);
  const reanudar = useRef(true); // solo la primera carga puede recuperar la pregunta guardada
  // señales de uso para analítica: primer toque, tiempo con la pestaña oculta y tiempo en la explicación
  const primerToque = useRef<number | null>(null);
  const ocultoMs = useRef(0);
  const ocultoDesde = useRef<number | null>(null);
  const preguntaId = useRef<string | null>(null);
  const explicacion = useRef<{ pid: string; t0: number } | null>(null);
  const [pausado, setPausado] = useState(false); // abrir «Ver explicación» cancela el avance automático
  // la siguiente pregunta se pide al recibir la corrección, para que no haya espera al pasar
  const pre = useRef<{ p: Promise<Question | null>; t0: number; hecho: boolean; valor?: Question | null; fallo?: boolean } | null>(null);
  const ultimaRespuestaMs = useRef<number | null>(null);
  const sinFocoMs = useRef(0);
  const sinFocoDesde = useRef<number | null>(null);
  const escritura = useRef<Record<string, number>>({});
  const copiaInicio = useRef<number | null>(null);

  /** Envía una señal sin esperar y sin que un fallo afecte a la práctica. */
  const senal = useCallback((tipo: string, pid: string | null, payload: Record<string, unknown> = {}) => {
    try {
      void Promise.resolve(client.current.evento?.(sesionId, tipo, pid, payload)).catch(() => {});
    } catch { /* la señal es opcional */ }
  }, [sesionId]);

  /** Tiempos de la respuesta: de reloj, hasta el primer toque y activo (sin la pestaña oculta). */
  function tiemposDe(now: number): Record<string, number> {
    const oculto = ocultoMs.current + (ocultoDesde.current !== null ? now - ocultoDesde.current : 0);
    const envio = (now - shownAt.current) / 1000;
    return {
      t_primer_clic: ((primerToque.current ?? now) - shownAt.current) / 1000, t_envio: envio,
      t_oculto: oculto / 1000, t_activo: Math.max(0, envio - oculto / 1000),
      t_sin_foco: (sinFocoMs.current + (sinFocoDesde.current !== null ? now - sinFocoDesde.current : 0)) / 1000,
      ...escritura.current,
    };
  }

  /** Pide la siguiente pregunta de antemano (se llama al llegar la corrección). */
  const precargar = useCallback(() => {
    const t0 = performance.now();
    const e: NonNullable<typeof pre.current> = { p: Promise.resolve(null), t0, hecho: false };
    e.p = client.current.nextQuestion(sesionId).then(
      (q) => { e.hecho = true; e.valor = q; return q; },
      (err) => { e.hecho = true; e.fallo = true; throw err; },
    );
    e.p.catch(() => {}); // si falla, load() lo pide de nuevo
    pre.current = e;
  }, [sesionId]);

  /** La pregunta que se veía al cerrar, si el servidor confirma que sigue sin responder. */
  const pendienteGuardada = useCallback(async (): Promise<Question | null> => {
    const q = preguntaGuardada<Question>(sesionId);
    if (!q) return null;
    try {
      const st = await client.current.getSession?.(sesionId);
      return st?.pendiente === q.pregunta_id ? q : null;
    } catch { return null; }
  }, [sesionId]);

  const load = useCallback(async () => {
    const id = ++loadId.current;
    const adelantada = pre.current;
    pre.current = null;
    if (explicacion.current) { // cierra la medición de la explicación anterior
      senal("explicacion_cerrada", explicacion.current.pid, { t: Math.round(performance.now() - explicacion.current.t0) / 1000 });
      explicacion.current = null;
    }
    const listaYa = adelantada?.hecho && !adelantada.fallo;
    const t0 = adelantada?.t0 ?? performance.now();
    if (!listaYa) setQuestion(undefined);
    setPausado(false);
    setChosen(null);
    setResult(null);
    setReported(false);
    setMenu(false);
    setAviso(null);
    setErrorReporte(false);
    setValiaEnviada(false);
    escritas.current = [];
    setValor("");
    setNumeroMal(false);
    setFailed(false);
    setCopiado(true);
    locked.current = false;
    firstClickAt.current = null;
    try {
      let q: Question | null;
      const guardada = reanudar.current ? await pendienteGuardada() : null; // reabrir la app: la misma pregunta, no otra
      reanudar.current = false;
      try {
        q = guardada ?? (adelantada && !adelantada.fallo ? await adelantada.p : await client.current.nextQuestion(sesionId));
      } catch (err) {
        if (!adelantada) throw err;
        q = await client.current.nextQuestion(sesionId); // la adelantada falló: se pide otra vez
      }
      if (id !== loadId.current) return;
      if (q) guardarPregunta(sesionId, q);
      if (q === null) {
        setQuestion(null);
        onDoneRef.current?.();
        return;
      }
      shownAt.current = performance.now();
      sinFocoMs.current = 0;
      sinFocoDesde.current = document.hasFocus?.() === false ? shownAt.current : null;
      escritura.current = {};
      copiaInicio.current = null;
      senal("carga", q.pregunta_id, {
        t_carga_ms: Math.round(Math.max(0, shownAt.current - t0)), esqueleto: !listaYa, prefetch: !!adelantada,
        ...(ultimaRespuestaMs.current !== null ? { t_resp_ms: ultimaRespuestaMs.current } : {}),
      });
      primerToque.current = null;
      ocultoMs.current = 0;
      ocultoDesde.current = document.hidden ? shownAt.current : null;
      preguntaId.current = q.pregunta_id;
      setQuestion(q);
    } catch {
      if (id === loadId.current) setFailed(true);
    }
  }, [sesionId, senal]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => { // fin de sesión: al salir de la práctica (Terminar, cambiar de pantalla) o al cerrar la pestaña
    const cerrar = () => { try { navigator.sendBeacon?.(`/api/sessions/${sesionId}/fin`); } catch { /* opcional */ } };
    window.addEventListener("pagehide", cerrar);
    return () => {
      window.removeEventListener("pagehide", cerrar);
      try { void Promise.resolve(client.current.fin?.(sesionId)).catch(() => {}); } catch { /* opcional */ }
    };
  }, [sesionId]);

  useEffect(() => { // contexto del dispositivo, una vez por sesión
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    senal("contexto", null, { ancho: window.innerWidth, tactil: !!window.matchMedia?.("(pointer: coarse)").matches, standalone });
  }, [senal]);

  useEffect(() => { // primer toque o tecla de cada pregunta, y tiempo con la pestaña oculta
    const toque = () => {
      if (primerToque.current === null && shownAt.current && !locked.current) primerToque.current = performance.now();
    };
    const visibilidad = () => {
      const now = performance.now();
      if (document.hidden) {
        ocultoDesde.current = now;
      } else if (ocultoDesde.current !== null) {
        const dur = now - ocultoDesde.current;
        ocultoMs.current += dur;
        ocultoDesde.current = null;
        if (dur > 5000) senal("reanudacion", preguntaId.current, { oculto_s: Math.round(dur / 1000) });
      }
    };
    const sinFoco = () => { if (sinFocoDesde.current === null) sinFocoDesde.current = performance.now(); };
    const conFoco = () => {
      if (sinFocoDesde.current !== null) { sinFocoMs.current += performance.now() - sinFocoDesde.current; sinFocoDesde.current = null; }
    };
    window.addEventListener("blur", sinFoco);
    window.addEventListener("focus", conFoco);
    window.addEventListener("keydown", toque);
    window.addEventListener("pointerdown", toque);
    document.addEventListener("visibilitychange", visibilidad);
    return () => {
      window.removeEventListener("blur", sinFoco);
      window.removeEventListener("focus", conFoco);
      window.removeEventListener("keydown", toque);
      window.removeEventListener("pointerdown", toque);
      document.removeEventListener("visibilitychange", visibilidad);
    };
  }, [senal]);

  useEffect(() => { // empieza a medir cuánto se queda en la explicación
    if (result && question && explicacion.current?.pid !== question.pregunta_id) explicacion.current = { pid: question.pregunta_id, t0: performance.now() };
  }, [result, question]);

  /** Llega la corrección: se anota y se pide ya la siguiente (salvo un problema fallado, que cambia el dominio al marcarlo). */
  const recibida = useCallback((q: Question, res: AnswerResult, t0: number) => {
    ultimaRespuestaMs.current = Math.round(performance.now() - t0);
    onAnsweredRef.current?.(q, res);
    setAnswered((n) => n + 1);
    setResult(res);
    if (res.correcta || (q.tipo !== "problema")) precargar();
  }, [precargar]);

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
          tiempos: tiemposDe(now),
        });
        recibida(question, res, now);
      } catch {
        setFailed(true);
      }
    },
    [question, recibida, sesionId],
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
        tiempos: tiemposDe(now),
      });
      recibida(question, res, now);
    } catch {
      setFailed(true);
    }
  }, [question, recibida, sesionId, valor]);

  const submitEscrita = useCallback(async (respuestas: string[], stats: Record<string, number> = {}) => {
    if (!question || locked.current) return;
    escritura.current = stats;
    locked.current = true;
    escritas.current = respuestas;
    const now = performance.now();
    firstClickAt.current = now;
    setChosen("a");
    try {
      const res = await client.current.answer({
        sesion_id: sesionId, pregunta_id: question.pregunta_id, orden_opciones: [], elegida: "a", respuestas,
        tiempos: tiemposDe(now),
      });
      recibida(question, res, now);
    } catch {
      setFailed(true);
    }
  }, [question, recibida, sesionId]);

  async function marcarBien() {
    if (!question || !result || !client.current.markCorrect) return;
    const { percent } = await client.current.markCorrect(sesionId, question.pregunta_id);
    if (question.tipo === "escrita") { void load(); return; } // error de teclado: cuenta como bien y sigue, sin reescribir
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

  // Solo un acierto pasa solo (AVANCE_MS); un fallo espera a «Siguiente» o Enter. Abrir la explicación cancela la espera.
  const avanza = !!result && result.correcta && !pausado;
  useEffect(() => {
    if (!avanza) return;
    const id = setTimeout(() => void load(), AVANCE_MS);
    return () => clearTimeout(id);
  }, [avanza, load]);

  const explicacionAbierta = useCallback(() => {
    setPausado(true);
    if (question) senal("explicacion_abierta", question.pregunta_id);
  }, [question, senal]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") { setMenu(false); return; }
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

  /** Envía un reporte; si falla se avisa en el propio menú en vez de quedarse callado. */
  async function enviar(accion: () => Promise<unknown>, ok: () => void) {
    setErrorReporte(false);
    try { await accion(); ok(); } catch { setErrorReporte(true); }
  }

  const report = (motivo: string) => question && enviar(
    () => client.current.reportQuestion(question.pregunta_id, motivo, sesionId), () => setReported(t("practica.reportada")));

  const facil = () => question && client.current.facil && enviar(
    () => client.current.facil!(question.pregunta_id, sesionId), () => setAviso(t("practica.reporte_facilHecho")));

  const aunNo = (alcance: "pregunta" | "concepto" | "tema") => question && client.current.ocultar && enviar(
    () => client.current.ocultar!(question.pregunta_id, alcance), () => setReported(t("practica.ocultada")));

  /** «Mi respuesta también valía»: guarda lo que se respondió, sin cambiar la nota. */
  async function valia() {
    if (!question || !client.current.alternativa) return;
    const texto = question.tipo === "escrita" ? escritas.current.join(" / ")
      : question.tipo === "problema" ? valor.trim() : (question.opciones.find((o) => o.letra === chosen)?.texto ?? "");
    if (!texto) return;
    await client.current.alternativa(question.pregunta_id, texto);
    setValiaEnviada(true);
  }

  if (failed) return <ErrorCarga />;
  if (question === undefined) return <Esqueleto />;
  if (question === null) return null;

  const hecho = result !== null;
  const hex = (d: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

  return (
    <article className={`pq ${hecho ? "pq-hecho" : ""}`}>
      <div className="pq-top">
        {onTerminar
          ? <button type="button" onClick={onTerminar} className="pq-back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>{t("practica.terminar")}</button>
          : <span />}
        <div className="pq-rt">
          <div className="pq-ch">
            <span className="pq-cnt" aria-hidden="true">{answered}</span>
            <span className="pq-cap">{tn("practica.respondidas", answered)}</span>
          </div>
          {!result && !reported && client.current.skip && (
            <button type="button" onClick={() => void saltar()} aria-keyshortcuts="S" className="pq-sk">{t("practica.saltar")}</button>
          )}
          {!reported && (
            <button type="button" aria-label={t("practica.reportar")} aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="pq-dots">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
              <span className="pq-dl" aria-hidden="true">{t("practica.reportar")}</span>
            </button>
          )}
          {menu && !reported && (
            <div role="group" aria-label={t("practica.reportar")} className="pq-menu">
              <p>{t("practica.reporte_pregunta")}</p>
              <button type="button" onClick={() => void report(t("practica.reporte_mal"))} className="pq-mi">{t("practica.reporte_mal")}</button>
              {client.current.facil && <button type="button" onClick={() => void facil()} className="pq-mi">{t("practica.reporte_facil")}</button>}
              {client.current.ocultar && (
                <details>
                  <summary className="cursor-pointer text-sm">{t("practica.reporte_aun")}</summary>
                  <div role="group" aria-label={t("practica.reporte_aun")} className="mt-2 space-y-2">
                    {(["pregunta", "concepto", "tema"] as const).map((a) => (
                      <button key={a} type="button" onClick={() => void aunNo(a)} className="pq-mi">
                        {t(`practica.reporte_aun${a[0].toUpperCase()}${a.slice(1)}`)}
                      </button>
                    ))}
                  </div>
                </details>
              )}
              {aviso && <p role="status" className="text-sm text-[var(--ok)]">{aviso}</p>}
              {errorReporte && <p role="alert" className="text-sm text-[var(--ko)]">{t("practica.reporte_error")}</p>}
              <p className="text-xs text-[var(--ink-3)]">{t("practica.reporte_nota")}</p>
            </div>
          )}
        </div>
      </div>

      <div className="pq-col">
        <div className="pq-main">
          {question.reintento && <p className="mb-2 inline-block rounded-[8px] bg-[var(--lila-soft)] px-3 py-1 text-sm font-medium text-[var(--lila-ink)]">{t("practica.repaso")}</p>}
          <p className="pq-topic">{question.tema && question.subtema ? `${sinPrefijoTema(question.tema)} · ${question.subtema}` : ""}</p>

          {question.contexto && (
            <div className="mb-4 rounded-[11px] border border-[var(--lila-tint)] bg-[var(--lila-soft)] px-4 py-3 text-[var(--ink-2)]">
              <span className="text-xs font-semibold tracking-[.14em] text-[var(--lila-ink)] uppercase">{t("practica.enunciadoComun")}</span>
              <p className="mt-1"><RichText text={question.contexto} /></p>
            </div>
          )}

          <h1 className="pq-q">
            {question.apartado && <span className="text-[var(--lila-ink)]">{question.apartado})</span>}{" "}
            <RichText text={question.enunciado} />
          </h1>

          {question.imagen && (
            <img
              src={`/img/${question.imagen}`} alt={t("practica.imagenAlt")}
              className="mx-auto mt-4 max-h-72 w-auto max-w-full rounded-[11px] border border-[var(--rule)] bg-[var(--card)] object-contain p-2"
            />
          )}
        </div>

        {reported ? (
          <div className="pq-ans space-y-3">
            <p role="status">{reported}</p>
            <button type="button" onClick={() => void load()} className="pq-next btn-duro">{t("practica.siguiente")}</button>
          </div>
        ) : (
          <div className="pq-ans">
            {question.tipo === "escrita" && columnasDe(question.enunciado) ? (
              <Clasificar key={question.pregunta_id} palabras={question.campos ?? []} columnas={columnasDe(question.enunciado)!} disabled={chosen !== null} resultado={result?.campos} onSubmit={(v, st) => void submitEscrita(v, st)} onCopiaLista={setCopiado} />
            ) : question.tipo === "escrita" ? (
              <Escrita key={question.pregunta_id} etiquetas={question.campos ?? [""]} disabled={chosen !== null} resultado={result?.campos} onSubmit={(v, st) => void submitEscrita(v, st)} onCopiaLista={setCopiado} onSeguir={() => void load()} onCopia={(d) => senal("copia", question.pregunta_id, d)} />
            ) : question.tipo === "problema" ? (
              <form
                className="flex flex-wrap items-center gap-3"
                onSubmit={(e) => { e.preventDefault(); void submitProblem(); }}
              >
                <label htmlFor="respuesta" className="sr-only">{t("practica.tuRespuesta")}</label>
                <input
                  id="respuesta" autoFocus inputMode="decimal" autoComplete="off" value={valor} disabled={chosen !== null}
                  onChange={(e) => setValor(e.target.value)} placeholder={t("practica.tuRespuesta")}
                  className={`pq-campo min-w-0 flex-1 basis-44 rounded-[14px] border border-[var(--rule-2)] bg-[var(--card)] px-4 tabular-nums focus-visible:border-[var(--lila)] ${result ? (result.correcta ? "fb-ok" : "fb-ko") : ""}`}
                  style={result ? { borderColor: result.correcta ? "var(--ok)" : "var(--ko)", background: result.correcta ? "var(--ok-soft)" : "var(--ko-soft)" } : undefined}
                />
                <button type="submit" disabled={chosen !== null} className="rounded-[11px] bg-[var(--ink)] px-5 py-3 font-medium text-[var(--on-ink)] shadow-[3px_3px_0_var(--lila)] btn-duro disabled:opacity-60">
                  {t("practica.comprobar")}
                </button>
                <p className="w-full text-sm text-[var(--ink-3)]">{t("practica.formatoRespuesta")}</p>
                {numeroMal && <p role="alert" className="w-full text-sm text-[var(--ko)]">{t("practica.numeroNoValido")}</p>}
              </form>
            ) : (
              <ul aria-label={t("practica.opciones")} className="pq-opts">
                {question.opciones.map((o, i) => {
                  const isCorrect = hecho && o.letra === result.opcion_correcta;
                  const isWrongPick = hecho && !result.correcta && o.letra === chosen;
                  const estado = isCorrect ? "ok" : isWrongPick ? "ko" : hecho ? "dim" : chosen === null ? "libre" : "";
                  return (
                    <li key={o.letra}>
                      <button
                        type="button"
                        aria-keyshortcuts={`${LETTERS[i]} ${i + 1}`}
                        aria-label={`${t("practica.opcion")} ${LETTERS[i]}: ${o.texto}`}
                        aria-disabled={chosen !== null}
                        onClick={() => void choose(i)}
                        className={`pq-opt ${estado} ${isCorrect && o.letra === chosen ? "fb-ok" : isWrongPick ? "fb-ko" : ""}`}
                      >
                        <span aria-hidden="true" className="pq-lt">{LETTERS[i]}</span>
                        <span className="pq-t"><RichText text={o.texto} /></span>
                        {!hecho && <kbd className="pq-kbd" aria-hidden="true">{LETTERS[i]}</kbd>}
                        {isCorrect && <span className="pq-ic" aria-hidden="true">{hex("M5 12.5l4.5 4.5L19 7.5")}</span>}
                        {isWrongPick && <span className="pq-ic" aria-hidden="true">{hex("M6 6l12 12M18 6L6 18")}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {result && !reported && <Explanation result={result} preguntaId={question.pregunta_id} enunciado={question.enunciado} avanceMs={avanza ? AVANCE_MS : undefined} onExplicacionAbierta={explicacionAbierta} siguienteBloqueado={question.tipo === "escrita" && !copiado} onNext={() => void load()} onMarcarBien={question.tipo === "problema" || question.tipo === "escrita" ? () => void marcarBien() : undefined} etiquetaMarcarBien={question.tipo === "escrita" ? t("practica.errorEscritura") : undefined}
          extras={((!result.correcta && client.current.alternativa) || question.ayuda_larga) ? <>
            {!result.correcta && client.current.alternativa && (
              valiaEnviada
                ? <p role="status" className="pq-lk no-underline">{t("practica.valiaHecho")}</p>
                : <button type="button" onClick={() => void valia()} className="pq-lk">{t("practica.valia")}</button>
            )}
            {question.ayuda_larga && ( // antes de responder podría desvelar la respuesta
              <details onToggle={(e) => { if (e.currentTarget.open) senal("ayuda_abierta", question.pregunta_id); }}>
                <summary className="pq-lk">{t("practica.ayuda")}</summary>
                <p className="pq-sh-b"><RichText text={question.ayuda_larga} /></p>
                <BotonGuardar preguntaId={question.pregunta_id} tipo="ayuda" huella={question.ayuda_larga} />
              </details>
            )}
          </> : undefined} />}

        {!hecho && <p className="pq-teclas" aria-hidden="true">
          {t("practica.triar")} {LETTERS.map((l) => <kbd key={l} className="pq-kbd">{l}</kbd>)} {t("practica.saltar")} <kbd className="pq-kbd">S</kbd> {t("practica.siguiente")} <kbd className="pq-kbd">Enter</kbd>
        </p>}
      </div>
    </article>
  );
}
