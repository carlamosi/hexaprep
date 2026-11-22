import { useEffect, useState } from "react";
import { api, type Oculto, type PerfilDatos } from "../api";
import { t } from "../i18n";
import { enAppInstalada, useInstalar } from "../instalar";
import { ABRIR_GUIA } from "../components/Onboarding";
import { aplicarTema, leerTema, type Tema } from "../tema";
import { Settings, type SettingsClient } from "./Settings";
import "./perfil.css";

export type PerfilClient = Pick<typeof api, "getPerfil" | "reiniciarPerfil" | "authLogout"> & SettingsClient & Partial<Pick<typeof api, "ocultos" | "mostrarOculto" | "history">>;

const boton = "rounded-[11px] border border-[var(--rule-2)] bg-[var(--card)] px-4 py-2 font-medium text-[var(--lila-ink)] btn-suave";
const tarjeta = "rounded-[16px] border border-[var(--rule)] bg-[var(--card)] p-5 perfil-sec";
const seccion = `space-y-3 ${tarjeta}`;

/** Interruptor de fila entera (área de toque de 48 px): el pulgar se estira al pulsar y recorre el carril con la salida suave. */
function Interruptor({ etiqueta, activo, onCambio, icono, cielo }: { etiqueta: string; activo: boolean; onCambio: (v: boolean) => void; icono: "sol" | "luna" | "pantalla"; cielo?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={activo} className="sw-fila" onClick={() => onCambio(!activo)}>
      <span className="sw-txt">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {icono === "luna" ? <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
            : icono === "pantalla" ? <><rect x="3" y="4.5" width="18" height="12" rx="2.5" /><path d="M9 20h6M12 16.5V20" /></>
            : <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>}
        </svg>
        {etiqueta}
      </span>
      <span className={`sw${cielo ? " sw-cielo" : ""}`} aria-hidden="true"><span className="sw-pulgar" /></span>
    </button>
  );
}

/** Días de práctica a partir de la lista de fechas (AAAA-MM-DD, en hora local): cuántos, desde cuándo y cuántos de los últimos 7. No es una racha. */
export function resumenDias(dias: string[], hoy = new Date()) {
  const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hace6 = new Date(hoy); hace6.setDate(hace6.getDate() - 6);
  return { total: dias.length, primero: dias[0] ?? null, ultimos: dias.filter((d) => d >= f(hace6) && d <= f(hoy)).length };
}

function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

/** Perfil: quién eres, cuánto has practicado, preferencias, ayuda, herramientas y, al final, empezar de cero. */
export function Perfil({ asignaturaId, client = api }: { asignaturaId?: string | null; client?: PerfilClient }) {
  const [perfil, setPerfil] = useState<PerfilDatos | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState(false);
  const [ocultos, setOcultos] = useState<Oculto[]>([]);
  const [dias, setDias] = useState<string[] | null>(null);
  const [tema, setTema] = useState<Tema>(leerTema);
  const instalador = useInstalar();
  const [sisOscuro, setSisOscuro] = useState(() => !!window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  useEffect(() => { // «igual que el dispositivo» sigue al sistema también si cambia con la pantalla abierta
    const m = window.matchMedia?.("(prefers-color-scheme: dark)");
    const f = () => setSisOscuro(!!m?.matches);
    m?.addEventListener?.("change", f);
    return () => m?.removeEventListener?.("change", f);
  }, []);
  const oscuro = tema === "sistema" ? sisOscuro : tema === "oscuro";
  const elegirTema = (x: Tema) => { aplicarTema(x); setTema(x); };

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
    let vivo = true;
    client.history?.().then((h) => vivo && setDias(h.dias)).catch(() => {});
    return () => { vivo = false; };
  }, [client]);

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

  const inicial = (perfil?.nombre || perfil?.email || "").trim().charAt(0).toUpperCase();
  let orden = 0; // las tarjetas que hay entran en cadena, sin huecos aunque falten algunas
  const entra = () => ({ "--i": orden++ }) as React.CSSProperties;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("perfil.titulo")}</h1>

      {perfil?.email && (
        <section className={`${tarjeta} flex flex-wrap items-center gap-4`} style={entra()} aria-label={t("perfil.cuenta")}>
          <span className="perfil-avatar" aria-hidden="true">{inicial}</span>
          <div className="min-w-[10rem] flex-1"> {/* si no cabe junto al botón, el botón baja a su línea en vez de recortar el nombre */}
            <p className="text-lg font-semibold break-words">{perfil.nombre || perfil.email}</p>
            {perfil.nombre && <p className="text-[var(--ink-2)] break-all">{perfil.email}</p>}
          </div>
          <button type="button" className={boton} onClick={() => void salir()}>{t("perfil.salir")}</button>
        </section>
      )}

      {dias && dias.length > 0 && (() => {
        const r = resumenDias(dias);
        return (
          <section className={seccion} style={entra()} aria-label={t("perfil.practica")}>
            <h2 className="text-lg font-semibold">{t("perfil.practica")}</h2>
            <dl className="perfil-stats">
              <div><dd>{r.total}</dd><dt>{t(r.total === 1 ? "perfil.diaPracticado" : "perfil.diasPracticados")}</dt></div>
              <div><dd>{r.primero ? fechaCorta(r.primero) : ""}</dd><dt>{t("perfil.practicasDesde")}</dt></div>
              <div><dd>{t("perfil.ultimos7Valor").replace("{n}", String(r.ultimos))}</dd><dt>{t("perfil.ultimos7")}</dt></div>
            </dl>
            <p className="text-sm text-[var(--ink-3)]">{t("perfil.practicaNota")}</p>
          </section>
        );
      })()}

      {client.ocultos && (
        <section className={seccion} style={entra()} aria-label={t("perfil.ocultos")}>
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

      <section className={seccion} style={entra()} aria-label={t("perfil.apariencia")}>
        <h2 className="text-lg font-semibold">{t("perfil.apariencia")}</h2>
        <div role="group" aria-label={t("perfil.apariencia")} className="sw-grupo">
          <Interruptor etiqueta={t("perfil.modoOscuro")} activo={oscuro} icono={oscuro ? "luna" : "sol"} cielo onCambio={(v) => elegirTema(v ? "oscuro" : "claro")} />
          <Interruptor etiqueta={t("perfil.igualSistema")} activo={tema === "sistema"} icono="pantalla" onCambio={(v) => elegirTema(v ? "sistema" : oscuro ? "oscuro" : "claro")} />
        </div>
      </section>

      <section className={seccion} style={entra()} aria-label={t("perfil.ayuda")}>
        <h2 className="text-lg font-semibold">{t("perfil.ayuda")}</h2>
        <button type="button" className={boton} onClick={() => window.dispatchEvent(new Event(ABRIR_GUIA))}>{t("perfil.verGuia")}</button>
        {!enAppInstalada() && (
          <details className="perfil-det" open={instalador.disponible || undefined}>
            <summary>{t("perfil.instalar")}</summary>
            {instalador.disponible && (
              <button type="button" onClick={() => void instalador.instalar()} className={`${boton} mt-1`}>{t("perfil.instalarBoton")}</button>
            )}
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--ink-2)]">
              <li>{t("perfil.instalarIphone")}</li>
              <li>{t("perfil.instalarAndroid")}</li>
              <li>{t("perfil.instalarOrdenador")}</li>
            </ul>
            <p className="mt-3 text-sm text-[var(--ink-3)]">{t("perfil.instalarNota")}</p>
          </details>
        )}
      </section>

      {asignaturaId && (
        <details className={tarjeta} style={entra()}>
          <summary className="perfil-herr">
            <span className="perfil-herr-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M14.5 6.5a4 4 0 0 0 4.9 4.9L21 13l-3 3-1.6-1.6L8 22.8 5.2 20l8.4-8.4A4 4 0 0 1 14.5 6.5z" /></svg>
            </span>
            <span><b>{t("perfil.avanzado")}</b><small>{t(perfil?.online ? "perfil.avanzadoNotaOnline" : "perfil.avanzadoNota")}</small></span>
          </summary>
          <div className="mt-5"><Settings asignaturaId={asignaturaId} client={client} /></div>
        </details>
      )}

      {perfil?.reiniciar && (
        <section className={`${seccion} perfil-riesgo`} style={entra()}>
          <h2 className="text-lg font-semibold">{t("perfil.reiniciarTitulo")}</h2>
          <p className="text-[var(--ink-2)]">{t("perfil.reiniciarTexto")}</p>
          {confirmar ? (
            <div role="alertdialog" aria-labelledby="perfil-conf" onKeyDown={(e) => e.key === "Escape" && setConfirmar(false)} className="space-y-3 rounded-[11px] border border-[var(--ko)] bg-[var(--ko-soft)] p-4">
              <p id="perfil-conf" className="font-semibold">{t("perfil.reiniciarPregunta")}</p>
              <p>{t("perfil.reiniciarAviso")}</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={`perfil-ko perfil-ko-solido`} onClick={() => void reiniciar()}>{t("perfil.reiniciarSi")}</button>
                <button type="button" autoFocus className={boton} onClick={() => setConfirmar(false)}>{t("ajustes.cancelar")}</button>
              </div>
            </div>
          ) : (
            <button type="button" className="perfil-ko" onClick={() => setConfirmar(true)}>{t("perfil.reiniciar")}</button>
          )}
        </section>
      )}

      {error && <p role="alert" className="rounded-[11px] bg-[var(--ko-soft)] px-4 py-3 text-[var(--ko)]">{t("app.error")}</p>}
    </main>
  );
}
