import { useEffect, useState } from "react";
import { api, type PerfilDatos } from "../api";
import { Examen, type ExamenClient } from "../components/Examen";
import { t } from "../i18n";
import { Settings, type SettingsClient } from "./Settings";

export type PerfilClient = Pick<typeof api, "getPerfil" | "reiniciarPerfil" | "authLogout"> & ExamenClient & SettingsClient;

const boton = "rounded-[11px] border border-[var(--rule-2)] bg-white px-4 py-2 font-medium text-[var(--lila-ink)] hover:bg-[var(--lila-soft)]";
const seccion = "space-y-3 rounded-[16px] border border-[var(--rule)] bg-white p-5";

/** Perfil: quién eres, fecha de examen, empezar de cero, instalar la app y, plegado, lo técnico. */
export function Perfil({ asignaturaId, client = api }: { asignaturaId?: string | null; client?: PerfilClient }) {
  const [perfil, setPerfil] = useState<PerfilDatos | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    client.getPerfil().then((p) => vivo && setPerfil(p)).catch(() => vivo && setError(true));
    return () => { vivo = false; };
  }, [client]);

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
                <button type="button" className="rounded-[11px] bg-[var(--ko)] px-4 py-2 text-white" onClick={() => void reiniciar()}>{t("perfil.reiniciarSi")}</button>
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
