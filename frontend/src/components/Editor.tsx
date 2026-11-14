import { useEffect, useState } from "react";
import { api, type Letra, type QuestionContent } from "../api";
import { t } from "../i18n";

type Client = Pick<typeof api, "getQuestion" | "editQuestion" | "exportBank">;
interface Form {
  enunciado: string;
  explicacion: string;
  ayuda_larga: string;
  correcta: Letra;
  opciones: { texto: string; trampa: string }[];
}

const LETRAS: Letra[] = ["a", "b", "c", "d"];

function toForm(c: QuestionContent): Form {
  return {
    enunciado: c.enunciado, explicacion: c.explicacion, ayuda_larga: c.ayuda_larga, correcta: c.correcta,
    opciones: c.opciones.map((o) => ({ texto: o.texto, trampa: o.trampa ?? "" })),
  };
}

/** Editor de una pregunta: guarda siempre como versión nueva y permite exportar el banco. */
export function Editor({ preguntaId, asignaturaId, client = api }: { preguntaId: string; asignaturaId: string; client?: Client }) {
  const [content, setContent] = useState<QuestionContent | null>(null);
  const [base, setBase] = useState<Form | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [reincluir, setReincluir] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportada, setExportada] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    client.getQuestion(preguntaId)
      .then((c) => { if (alive) { setContent(c); setBase(toForm(c)); setForm(toForm(c)); } })
      .catch((e: Error) => alive && setError(e.message));
    return () => { alive = false; };
  }, [preguntaId, client]);

  if (!content || !form || !base) return error ? <p role="alert">{error}</p> : <p role="status">{t("app.cargando")}</p>;

  function setOpcion(i: number, campo: "texto" | "trampa", valor: string) {
    setForm((f) => f && { ...f, opciones: f.opciones.map((o, k) => (k === i ? { ...o, [campo]: valor } : o)) });
  }

  async function guardar() {
    setMensaje(null);
    setError(null);
    const cambios: Record<string, unknown> = {};
    for (const k of ["enunciado", "explicacion", "ayuda_larga"] as const) if (form![k] !== base![k]) cambios[k] = form![k];
    const opcionesCambiadas = form!.correcta !== base!.correcta || JSON.stringify(form!.opciones) !== JSON.stringify(base!.opciones);
    if (opcionesCambiadas) {
      cambios.opciones = form!.opciones.map((o, i) => (LETRAS[i] === form!.correcta ? { texto: o.texto } : { texto: o.texto, trampa: o.trampa }));
      cambios.correcta = form!.correcta;
    }
    if (reincluir) cambios.excluida = false;
    if (Object.keys(cambios).length === 0) {
      setMensaje(t("editor.sin_cambios"));
      return;
    }
    try {
      const r = await client.editQuestion(preguntaId, cambios);
      setBase(form);
      if (reincluir) {
        setContent({ ...content!, excluida: false });
        setReincluir(false);
      }
      const soloReincluir = Object.keys(cambios).length === 1 && "excluida" in cambios;
      setMensaje(soloReincluir ? t("editor.reincluida") : `${t("editor.version")} ${r.version} ${t("editor.guardada")}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function exportar() {
    try {
      setExportada((await client.exportBank(asignaturaId)).ruta);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const campo = "mt-1 w-full rounded-[11px] border border-[var(--rule-2)] bg-white px-3 py-2";
  return (
    <form onSubmit={(e) => { e.preventDefault(); void guardar(); }} className="space-y-4 rounded-[16px] border border-[var(--rule)] bg-white p-5">
      <label className="block">
        {t("editor.enunciado")}
        <textarea className={campo} rows={3} value={form.enunciado} onChange={(e) => setForm({ ...form, enunciado: e.target.value })} />
      </label>

      {form.opciones.map((o, i) => (
        <fieldset key={i} className="space-y-2">
          <label className="block">
            {`${t("editor.opcion")} ${LETRAS[i].toUpperCase()}`}
            <input className={campo} value={o.texto} onChange={(e) => setOpcion(i, "texto", e.target.value)} />
          </label>
          {LETRAS[i] !== form.correcta && (
            <label className="block text-sm text-[var(--ink-2)]">
              {`${t("editor.trampa")} ${LETRAS[i].toUpperCase()}`}
              <input className={campo} value={o.trampa} onChange={(e) => setOpcion(i, "trampa", e.target.value)} />
            </label>
          )}
        </fieldset>
      ))}

      <label className="block">
        {t("editor.correcta")}
        <select className={campo} value={form.correcta} onChange={(e) => setForm({ ...form, correcta: e.target.value as Letra })}>
          {LETRAS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </label>
      <label className="block">
        {t("editor.explicacion")}
        <textarea className={campo} rows={3} value={form.explicacion} onChange={(e) => setForm({ ...form, explicacion: e.target.value })} />
      </label>
      <label className="block">
        {t("editor.ayuda")}
        <textarea className={campo} rows={4} value={form.ayuda_larga} onChange={(e) => setForm({ ...form, ayuda_larga: e.target.value })} />
      </label>

      {content.excluida && (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={reincluir} onChange={(e) => setReincluir(e.target.checked)} />
          {t("editor.reincluir")}
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="rounded-[11px] bg-[var(--ink)] px-5 py-2 font-medium text-white shadow-[3px_3px_0_var(--lila)]">
          {t("editor.guardar")}
        </button>
        <button type="button" onClick={() => void exportar()} className="rounded-[11px] border border-[var(--rule-2)] px-4 py-2 text-[var(--lila-ink)]">
          {t("editor.exportar")}
        </button>
      </div>
      {mensaje && <p role="status">{mensaje}</p>}
      {exportada && <p role="status">{`${t("editor.exportado")} ${exportada}`}</p>}
      {error && <p role="alert" className="rounded-[11px] bg-[var(--ko-soft)] px-4 py-3 text-[var(--ko)]">{error}</p>}
    </form>
  );
}
