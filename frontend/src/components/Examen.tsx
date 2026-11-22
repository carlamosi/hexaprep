import { useEffect, useState } from "react";
import { api, type Examen as ExamenDatos, type Nota } from "../api";
import { t } from "../i18n";
import "./examen.css";

export type ExamenClient = Pick<typeof api, "getExamen" | "setExamen"> & Partial<Pick<typeof api, "getNotas" | "addNota">>;

export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export function mensaje(d: ExamenDatos): string {
  if (d.dias === null) return "";
  if (d.dias < 0) return t("examen.paso");
  const cuando = d.dias === 0 ? t("examen.hoy") : d.dias === 1 ? t("examen.manana") : t("examen.faltan").replace("{n}", String(d.dias));
  if (!d.por_dia) return `${cuando} ${t("examen.todoTocado")}`;
  const plan = t(d.sin_tocar === 1 ? "examen.plan.uno" : "examen.plan").replace("{n}", String(d.sin_tocar)).replace("{x}", String(d.por_dia));
  return `${cuando} ${plan}`;
}

/** Iconos de trazo, como los de la navegación. */
const I = {
  calendario: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M8.5 3v4M15.5 3v4" /></>,
  lapiz: <path d="M4 20l4-1 11-11-3-3L5 16zM14 7l3 3" />,
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  mas: <path d="M12 5v14M5 12h14" />,
  nota: <><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h7M9 16h5" /></>,
};
const Ico = ({ d }: { d: keyof typeof I }) => <svg viewBox="0 0 24 24" aria-hidden="true" className="examen-i">{I[d]}</svg>;

/** Lo que cuenta la cifra grande: días que faltan, «Hoy» o un guion si ya pasó. Va oculta a lectores: el texto de al lado lo dice entero. */
function Cuenta({ dias }: { dias: number }) {
  const hoy = dias === 0, paso = dias < 0;
  return (
    <div className={`examen-dias${hoy ? " is-hoy" : ""}`} aria-hidden="true">
      <b>{paso ? "·" : hoy ? t("examen.hoyCorto") : dias}</b>
      {!hoy && !paso && <small>{dias === 1 ? t("examen.dia") : t("examen.dias")}</small>}
    </div>
  );
}

/** Fecha de examen opcional: solo aparece lo que tú pones. Sin cuenta atrás visible fuera de esta tarjeta ni avisos, y sin dramatismo
 * (la cifra no cambia de color al acercarse). Debajo, las notas de los exámenes que ya has hecho. */
export function Examen({ asignaturaId, client = api }: { asignaturaId: string; client?: ExamenClient }) {
  const [datos, setDatos] = useState<ExamenDatos | null>(null);
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const [error, setError] = useState(false);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [poniendoNota, setPoniendoNota] = useState(false);
  const [nota, setNota] = useState("");
  const [guardado, setGuardado] = useState(false); // aviso breve tras guardar

  useEffect(() => {
    let vivo = true;
    client.getExamen(asignaturaId).then((d) => vivo && setDatos(d)).catch(() => vivo && setError(true));
    client.getNotas?.(asignaturaId).then((n) => vivo && setNotas(n)).catch(() => {});
    return () => { vivo = false; };
  }, [asignaturaId, client]);

  async function guardarNota() {
    const n = Number(nota.replace(",", "."));
    if (!client.addNota || !nota.trim() || !(n >= 0 && n <= 10)) return;
    try {
      setNotas(await client.addNota(asignaturaId, n));
      setPoniendoNota(false);
      setNota("");
      setError(false);
    } catch {
      setError(true);
    }
  }

  async function guardar(fecha: string | null) {
    try {
      setDatos(await client.setExamen(asignaturaId, fecha));
      setEditando(false);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
      setError(false);
    } catch {
      setError(true);
    }
  }

  if (!datos) return null;
  return (
    <section aria-labelledby="examen-t" className="examen">
      <header className="examen-cab">
        <span className="examen-hex" aria-hidden="true"><Ico d="calendario" /></span>
        <h2 id="examen-t">{t("examen.titulo")}</h2>
        <p role="status" className={`examen-ok${guardado ? " is-on" : ""}`}>{guardado ? t("examen.guardado") : ""}</p>
      </header>

      {editando ? (
        <form className="examen-form" onSubmit={(e) => { e.preventDefault(); if (valor) void guardar(valor); }}>
          <label htmlFor="examen-fecha">{t("examen.fecha")}</label>
          <input id="examen-fecha" type="date" value={valor} onChange={(e) => setValor(e.target.value)} />
          <div className="examen-acciones">
            <button type="submit" className="examen-primario btn-duro">{t("examen.guardar")}</button>
            <button type="button" className="examen-b btn-suave" onClick={() => setEditando(false)}>{t("examen.cancelar")}</button>
          </div>
        </form>
      ) : datos.fecha ? (
        <>
          <div className="examen-cuenta">
            <Cuenta dias={datos.dias ?? -1} />
            <div className="examen-txt">
              <p className="examen-fecha">{fechaLarga(datos.fecha)}</p>
              <p className="examen-plan">{mensaje(datos)}</p>
            </div>
          </div>
          <div className="examen-acciones">
            <button type="button" className="examen-b btn-suave" onClick={() => { setValor(datos.fecha ?? ""); setEditando(true); }}><Ico d="lapiz" />{t("examen.cambiar")}</button>
            <button type="button" className="examen-b examen-suave btn-suave" onClick={() => void guardar(null)}><Ico d="cerrar" />{t("examen.quitar")}</button>
          </div>
        </>
      ) : (
        <div className="examen-vacio">
          <p>{t("examen.sinFecha")}</p>
          <button type="button" className="examen-b btn-suave" onClick={() => { setValor(""); setEditando(true); }}><Ico d="mas" />{t("examen.poner")}</button>
        </div>
      )}

      {client.addNota && (
        <div className="examen-notas">
          <h3><Ico d="nota" />{t("examen.notas")}</h3>
          {notas.length > 0 && (
            <ul>
              {notas.map((n) => (
                <li key={n.fecha + n.nota}>
                  <b className="examen-nota">{String(n.nota).replace(".", ",")}</b>
                  <span>{t("examen.nota.dominio").replace("{p}", String(n.dominio))}</span>
                  <time dateTime={n.fecha}>{fechaCorta(n.fecha)}</time>
                </li>
              ))}
            </ul>
          )}
          {poniendoNota ? (
            <form className="examen-form" onSubmit={(e) => { e.preventDefault(); void guardarNota(); }}>
              <label htmlFor="examen-nota">{t("examen.nota.label")}</label>
              <input id="examen-nota" inputMode="decimal" autoComplete="off" autoFocus value={nota} onChange={(e) => setNota(e.target.value)} className="is-corto" />
              <div className="examen-acciones">
                <button type="submit" className="examen-primario btn-duro">{t("examen.guardar")}</button>
                <button type="button" className="examen-b btn-suave" onClick={() => setPoniendoNota(false)}>{t("examen.cancelar")}</button>
              </div>
            </form>
          ) : (
            <button type="button" className="examen-b btn-suave" onClick={() => setPoniendoNota(true)}><Ico d="mas" />{t("examen.nota.poner")}</button>
          )}
        </div>
      )}
      {error && <p role="alert" className="examen-error">{t("examen.error")}</p>}
    </section>
  );
}
