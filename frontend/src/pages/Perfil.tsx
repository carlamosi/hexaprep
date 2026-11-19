import { useEffect, useState } from "react";
import { api, type Oculto, type PerfilDatos } from "../api";
import { Examen, type ExamenClient } from "../components/Examen";
import { t } from "../i18n";
import { aplicarTema, leerTema, type Tema } from "../tema";
import { Settings, type SettingsClient } from "./Settings";

export type PerfilClient = Pick<typeof api, "getPerfil" | "reiniciarPerfil" | "authLogout"> & ExamenClient & SettingsClient & Partial<Pick<typeof api, "ocultos" | "mostrarOculto" | "getFoco" | "setFoco" | "getMap">>;

const boton = "rounded-[11px] border border-[var(--rule-2)] bg-[var(--card)] px-4 py-2 font-medium text-[var(--lila-ink)] hover:bg-[var(--lila-soft)]";
const seccion = "space-y-3 rounded-[16px] border border-[var(--rule)] bg-[var(--card)] p-5";

/** Perfil: quién eres, fecha de examen, empezar de cero, instalar la app y, plegado, lo técnico. */
export function Perfil({ asignaturaId, client = api }: { asignaturaId?: string | null; client?: PerfilClient }) {
  const [perfil, setPerfil] = useState<PerfilDatos | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState(false);
  const [ocultos, setOcultos] = useState<Oculto[]>([]);
  const [temas, setTemas] = useState<{ id: string; nombre: string }[]>([]);
  const [foco, setFocoState] = useState<string>("");
  const [tema, setTema] = useState<Tema>(leerTema);

  useEffect(() => {
    let vivo = true;
    client.getPerfil().then((p) => vivo && setPerfil(p)).catch(() => vivo && setError(true));
    return () => { vivo = false; };
  }, [client]);

  useEffect(() => {
    let vivo = true;
    client.ocultos?.().then((o) => vivo && setOcultos(o)).catch(() => {});
    return () => { vivo = false; };
  }, [client]);

  useEffect(() => {
    if (!asignaturaId || !client.getMap || !client.getFoco) return;
    let vivo = true;
    client.getMap(asignaturaId).then((m) => vivo && setTemas([...new Map(m.hexes.map((h) => [h.tema_id, { id: h.tema_id, nombre: h.tema }])).values()])).catch(() => {});
    client.getFoco(asignaturaId).then((f) => vivo && setFocoState(f.tema_id ?? "")).catch(() => {});
    return () => { vivo = false; };
  }, [client, asignaturaId]);

  async function cambiarFoco(id: string) {
    try {
      await client.setFoco?.(asignaturaId!, id || null);
      setFocoState(id);
    } catch {
      setError(true);
    }
  }

  async function volverAMostrar(id: string) {
    try {
      await client.mostrarOculto?.(id);
      setOcultos((os) => os.filter((o) => o.id !== id));
    } catch {
      setError(true);
    }
  }

  async function salir() {
    await client.authLogout().catch(() => null);
    window.location.reload(); // vuelve a la pantalla de entrada
  }

  async function reiniciar() {
    try {
      await client.reiniciarPerfil();
      window.location.hash = "panal";
      window.location.reload();
    } catch {
      setError(true);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("perfil.titulo")}</h1>

      {perfil?.email && (
        <section className={seccion} aria-label={t("perfil.cuenta")}>
          <p className="text-lg font-semibold">{perfil.nombre || perfil.email}</p>
          {perfil.nombre && <p className="text-[var(--ink-2)]">{perfil.email}</p>}
          <button type="button" className={boton} onClick={() => void salir()}>{t("perfil.salir")}</button>
        </section>
      )}

      {asignaturaId && <Examen asignaturaId={asignaturaId} client={client} />}

      <section className={seccion} aria-label={t("perfil.apariencia")}>
        <h2 className="text-lg font-semibold">{t("perfil.apariencia")}</h2>
        <div role="group" aria-label={t("perfil.apariencia")} className="flex flex-wrap gap-2">
          {(["sistema", "claro", "oscuro"] as const).map((x) => (
            <button key={x} type="button" aria-pressed={tema === x} onClick={() => { aplicarTema(x); setTema(x); }}
              className={`min-h-11 rounded-[11px] border px-4 py-2 font-medium ${tema === x ? "border-[var(--ink)] bg-[var(--lila-soft)] text-[var(--ink)]" : "border-[var(--rule-2)] bg-[var(--card)] text-[var(--ink-2)]"}`}>
              {t(`perfil.tema.${x}`)}
            </button>
          ))}
        </div>
      </section>

      {asignaturaId && client.setFoco && temas.length > 0 && (
        <section className={seccion}>
          <h2 className="text-lg font-semibold"><label htmlFor="foco-tema">{t("perfil.foco")}</label></h2>
          <select id="foco-tema" value={foco} onChange={(e) => void cambiarFoco(e.target.value)} className="min-h-11 rounded-[11px] border border-[var(--rule-2)] bg-[var(--card)] px-3 py-2 text-base">
            <option value="">{t("perfil.focoNinguno")}</option>
            {temas.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </select>
          <p className="text-sm text-[var(--ink-3)]">{t("perfil.focoNota")}</p>
        </section>
      )}

      {client.ocultos && (
        <section className={seccion} aria-label={t("perfil.ocultos")}>
          <h2 className="text-lg font-semibold">{t("perfil.ocultos")}</h2>
          {ocultos.length === 0 ? <p className="text-[var(--ink-3)]">{t("perfil.ocultosVacio")}</p> : (
            <ul className="space-y-2">
              {ocultos.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3">
                  <span><span className="text-sm text-[var(--ink-3)]">{t(`perfil.alcance.${o.alcance}`)}</span> {o.nombre}</span>
                  <button type="button" className={boton} onClick={() => void volverAMostrar(o.id)}>{t("perfil.volverAMostrar")}</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <details className={seccion}>
        <summary className="cursor-pointer text-lg font-semibold">{t("perfil.instalar")}</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--ink-2)]">
          <li>{t("perfil.instalarIphone")}</li>
          <li>{t("perfil.instalarAndroid")}</li>
          <li>{t("perfil.instalarOrdenador")}</li>
        </ul>
        <p className="mt-3 text-sm text-[var(--ink-3)]">{t("perfil.instalarNota")}</p>
      </details>

      {perfil?.reiniciar && (
        <section className={seccion}>
          <h2 className="text-lg font-semibold">{t("perfil.reiniciarTitulo")}</h2>
          <p className="text-[var(--ink-2)]">{t("perfil.reiniciarTexto")}</p>
          {confirmar ? (
            <div role="alertdialog" aria-labelledby="perfil-conf" className="space-y-3 rounded-[11px] border border-[var(--ko)] bg-[var(--ko-soft)] p-4">
              <p id="perfil-conf" className="font-semibold">{t("perfil.reiniciarPregunta")}</p>
              <p>{t("perfil.reiniciarAviso")}</p>
              <div className="flex gap-3">
                <button type="button" className="rounded-[11px] bg-[var(--ko)] px-4 py-2 text-[var(--on-ink)]" onClick={() => void reiniciar()}>{t("perfil.reiniciarSi")}</button>
                <button type="button" className={boton} onClick={() => setConfirmar(false)}>{t("ajustes.cancelar")}</button>
              </div>
            </div>
          ) : (
            <button type="button" className={boton} onClick={() => setConfirmar(true)}>{t("perfil.reiniciar")}</button>
          )}
        </section>
      )}

      {error && <p role="alert" className="rounded-[11px] bg-[var(--ko-soft)] px-4 py-3 text-[var(--ko)]">{t("app.error")}</p>}

      {asignaturaId && (
        <details className={seccion}>
          <summary className="cursor-pointer text-lg font-semibold">{t("perfil.avanzado")}</summary>
          <div className="mt-4"><Settings asignaturaId={asignaturaId} client={client} /></div>
        </details>
      )}
    </main>
  );
}
