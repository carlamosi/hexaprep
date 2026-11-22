import { useEffect, useState } from "react";
import { ApiError, api, type BackupRow, type ReportedQuestion } from "../api";
import { Editor } from "../components/Editor";
import { t } from "../i18n";

export type SettingsClient = Pick<typeof api,
  "getBackup" | "makeBackup" | "restoreBackup" | "exportWeak" | "exportEvents" | "exportBank" | "reportedQuestions" | "getQuestion" | "editQuestion">;

const boton = "rounded-[11px] border border-[var(--rule-2)] bg-[var(--card)] px-4 py-2 text-[var(--lila-ink)] btn-suave";
/* Secciones planas separadas por una línea: dentro de «Herramientas» no hace falta una tarjeta por cada una */
const seccion = "space-y-3 border-t border-[var(--rule)] pt-6 first:border-t-0 first:pt-0";

/** Herramientas (dentro de Perfil): copias de seguridad, exportaciones, editor de preguntas reportadas e idioma. */
export function Settings({ asignaturaId, client = api }: { asignaturaId: string; client?: SettingsClient }) {
  const [backup, setBackup] = useState<BackupRow | null | undefined>(undefined);
  const [sinCopias, setSinCopias] = useState(false); // online las copias las hace Neon, no hay archivo que copiar
  const [confirmar, setConfirmar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [weak, setWeak] = useState<string | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [reportadas, setReportadas] = useState<ReportedQuestion[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    client.getBackup().then((b) => alive && setBackup(b)).catch((e) => { if (alive) { setSinCopias(e instanceof ApiError && e.status === 501); setBackup(null); } });
    client.reportedQuestions().then((r) => alive && setReportadas(r)).catch(() => undefined);
    return () => { alive = false; };
  }, [client]);

  async function run(accion: () => Promise<void>) {
    setError(null);
    try {
      await accion();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      {!sinCopias && <section className={seccion} aria-labelledby="aj-copia">
        <h2 id="aj-copia" className="text-base font-semibold">{t("ajustes.copia")}</h2>
        {backup ? (
          <p>
            {t("ajustes.ultima")}: {backup.fecha.slice(0, 16).replace("T", " ")} · {backup.n_eventos} {t("ajustes.eventos")} · {backup.ruta}
          </p>
        ) : (
          backup === null && <p>{t("ajustes.sin_copias")}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" className={boton} onClick={() => void run(async () => setBackup(await client.makeBackup()))}>
            {t("ajustes.hacer_copia")}
          </button>
          {backup && (
            <button type="button" className={boton} onClick={() => setConfirmar(true)}>
              {t("ajustes.restaurar")}
            </button>
          )}
        </div>
        {confirmar && backup && (
          <div role="alertdialog" aria-labelledby="aj-conf" className="space-y-3 rounded-[11px] border border-[var(--ko)] bg-[var(--ko-soft)] p-4">
            <p id="aj-conf" className="font-semibold">{t("ajustes.confirmar_titulo")}</p>
            <p>{t("ajustes.confirmar_texto")}</p>
            <div className="flex gap-3">
              <button
                type="button"
                className="rounded-[11px] bg-[var(--ko)] px-4 py-2 text-[var(--on-ink)]"
                onClick={() => void run(async () => { await client.restoreBackup(backup.ruta); setConfirmar(false); setAviso(t("ajustes.restaurada")); })}
              >
                {t("ajustes.confirmar_si")}
              </button>
              <button type="button" className={boton} onClick={() => setConfirmar(false)}>{t("ajustes.cancelar")}</button>
            </div>
          </div>
        )}
        {aviso && <p role="status">{aviso}</p>}
      </section>}

      {!sinCopias && <section className={seccion} aria-labelledby="aj-exp">
        <h2 id="aj-exp" className="text-base font-semibold">{t("ajustes.exportar")}</h2>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={boton} onClick={() => void run(async () => setWeak((await client.exportWeak(20)).ruta))}>
            {t("ajustes.weak")}
          </button>
          <button type="button" className={boton} onClick={() => void run(async () => setCsv((await client.exportEvents()).ruta))}>
            {t("ajustes.csv")}
          </button>
        </div>
        {weak && <p>{t("ajustes.guardado")} {weak}</p>}
        {csv && <p>{t("ajustes.guardado")} {csv}</p>}
      </section>}

      <section className={seccion} aria-labelledby="aj-edit">
        <h2 id="aj-edit" className="text-base font-semibold">{t("ajustes.editor")}</h2>
        {reportadas.length === 0 && !editando && <p className="text-[var(--ink-3)]">{t("ajustes.sin_reportadas")}</p>}
        <ul className="space-y-2">
          {reportadas.map((r) => (
            <li key={r.pregunta_id} className="flex items-start justify-between gap-3 border-b border-[var(--rule)] pb-2">
              <div>
                <p>{r.enunciado}</p>
                {r.motivo && <p className="text-sm text-[var(--ink-3)]">{r.motivo}</p>}
              </div>
              <button type="button" className={boton} onClick={() => setEditando(r.pregunta_id)}>{t("ajustes.editar")}</button>
            </li>
          ))}
        </ul>
        {editando && <Editor key={editando} preguntaId={editando} asignaturaId={asignaturaId} client={client} />}
      </section>

      <section className={seccion}>
        <h2 className="text-base font-semibold">{t("ajustes.idioma")}</h2>
        <select aria-label={t("ajustes.idioma")} defaultValue="es" className="rounded-[11px] border border-[var(--rule-2)] bg-[var(--card)] px-3 py-2">
            <option value="es">{t("ajustes.castellano")}</option>
            <option value="ca" disabled>{t("ajustes.catalan")}</option>
          </select>
      </section>

      {error && <p role="alert" className="rounded-[11px] bg-[var(--ko-soft)] px-4 py-3 text-[var(--ko)]">{error}</p>}
    </div>
  );
}
