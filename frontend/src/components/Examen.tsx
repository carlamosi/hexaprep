import { useEffect, useState } from "react";
import { api, type Examen as ExamenDatos } from "../api";
import { t } from "../i18n";

export type ExamenClient = Pick<typeof api, "getExamen" | "setExamen">;

const boton = "rounded-[11px] border border-[var(--rule-2)] bg-white px-4 py-2 text-sm font-medium text-[var(--lila-ink)] hover:bg-[var(--lila-soft)]";

function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

function mensaje(d: ExamenDatos): string {
  if (d.dias === null) return "";
  if (d.dias < 0) return t("examen.paso");
  const cuando = d.dias === 0 ? t("examen.hoy") : d.dias === 1 ? t("examen.manana") : t("examen.faltan").replace("{n}", String(d.dias));
  if (!d.por_dia) return `${cuando} ${t("examen.todoTocado")}`;
  const plan = t(d.sin_tocar === 1 ? "examen.plan.uno" : "examen.plan").replace("{n}", String(d.sin_tocar)).replace("{x}", String(d.por_dia));
  return `${cuando} ${plan}`;
}

/** Fecha de examen opcional: solo aparece lo que tú pones. Sin cuenta atrás visible fuera de esta tarjeta ni avisos. */
export function Examen({ asignaturaId, client = api }: { asignaturaId: string; client?: ExamenClient }) {
  const [datos, setDatos] = useState<ExamenDatos | null>(null);
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    client.getExamen(asignaturaId).then((d) => vivo && setDatos(d)).catch(() => vivo && setError(true));
    return () => { vivo = false; };
  }, [asignaturaId, client]);

  async function guardar(fecha: string | null) {
    try {
      setDatos(await client.setExamen(asignaturaId, fecha));
      setEditando(false);
      setError(false);
    } catch {
      setError(true);
    }
  }

  if (!datos) return null;
  return (
    <section aria-labelledby="examen-t" className="mt-6 rounded-[16px] border border-[var(--rule)] bg-white p-5">
      <h2 id="examen-t" className="text-lg font-semibold">{t("examen.titulo")}</h2>
      {editando ? (
        <form className="mt-3 flex flex-wrap items-center gap-3" onSubmit={(e) => { e.preventDefault(); if (valor) void guardar(valor); }}>
          <label htmlFor="examen-fecha" className="text-sm text-[var(--ink-2)]">{t("examen.fecha")}</label>
          <input id="examen-fecha" type="date" value={valor} onChange={(e) => setValor(e.target.value)} className="rounded-[11px] border border-[var(--rule-2)] px-3 py-2" />
          <button type="submit" className={boton}>{t("examen.guardar")}</button>
          <button type="button" className={boton} onClick={() => setEditando(false)}>{t("examen.cancelar")}</button>
        </form>
      ) : datos.fecha ? (
        <>
          <p className="mt-1 text-[var(--ink-2)]">{fechaLarga(datos.fecha)}. {mensaje(datos)}</p>
          <div className="mt-3 flex gap-3">
            <button type="button" className={boton} onClick={() => { setValor(datos.fecha ?? ""); setEditando(true); }}>{t("examen.cambiar")}</button>
            <button type="button" className={boton} onClick={() => void guardar(null)}>{t("examen.quitar")}</button>
          </div>
        </>
      ) : (
        <button type="button" className={`mt-3 ${boton}`} onClick={() => { setValor(""); setEditando(true); }}>{t("examen.poner")}</button>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-[var(--ko)]">{t("examen.error")}</p>}
    </section>
  );
}
