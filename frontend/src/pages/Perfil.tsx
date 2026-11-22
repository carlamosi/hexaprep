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

/** Iconos de trazo (24 px, color del texto de la fila). */
const ICONOS = {
  sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  luna: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
  pantalla: <><rect x="3" y="4.5" width="18" height="12" rx="2.5" /><path d="M9 20h6M12 16.5V20" /></>,
  guia: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>,
  instalar: <path d="M12 3v12M7 10.5l5 5 5-5M5 20h14" />,
  oculto: <path d="M3 3l18 18M10.6 5.2A9.6 9.6 0 0 1 12 5c5 0 8.5 4.2 9.5 7a11 11 0 0 1-2.4 3.7M6.7 6.8A11.5 11.5 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.4 9.4 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
  llave: <path d="M14.5 6.5a4 4 0 0 0 4.9 4.9L21 13l-3 3-1.6-1.6L8 22.8 5.2 20l8.4-8.4A4 4 0 0 1 14.5 6.5z" />,
};
function Ico({ n }: { n: keyof typeof ICONOS }) {
  return <svg className="perfil-ico" viewBox="0 0 24 24" aria-hidden="true">{ICONOS[n]}</svg>;
}

/** Interruptor de fila entera (área de toque de 60 px): el pulgar se estira al pulsar y recorre el carril con la salida suave. */
function Interruptor({ etiqueta, activo, onCambio, icono, cielo }: { etiqueta: string; activo: boolean; onCambio: (v: boolean) => void; icono: "sol" | "luna" | "pantalla"; cielo?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={activo} className="sw-fila" onClick={() => onCambio(!activo)}>
      <span className="sw-txt"><Ico n={icono} />{etiqueta}</span>
      <span className={`sw${cielo ? " sw-cielo" : ""}`} aria-hidden="true"><span className="sw-pulgar" /></span>
    </button>
  );
}

/** Días de práctica a partir de la lista de fechas (AAAA-MM-DD, en hora local): cuántos, desde cuándo y cuántos de los últimos 7. No es una racha. */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function resumenDias(dias: string[], hoy = new Date()) {
  const hace6 = new Date(hoy); hace6.setDate(hace6.getDate() - 6);
  return { total: dias.length, primero: dias[0] ?? null, ultimos: dias.filter((d) => d >= iso(hace6) && d <= iso(hoy)).length };
}

/** Los 7 últimos días, el más viejo primero y hoy al final, cada uno con su inicial y si hubo práctica. */
export function semanaDias(dias: string[], hoy = new Date()) {
  const hay = new Set(dias);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy); d.setDate(d.getDate() - (6 - i));
    return { letra: "DLMXJVS"[d.getDay()], activo: hay.has(iso(d)), hoy: i === 6 };
  });
}

function fechaCorta(f: string): string {
  const [a, m, d] = f.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

/** Perfil: quién eres, cuánto has practicado, preferencias, ayuda, datos y, al final, empezar de cero. */
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
  const local = !!perfil && !perfil.email;
  let orden = 0; // las tarjetas que hay entran en cadena, sin huecos aunque falten algunas
  const entra = () => ({ "--i": orden++ }) as React.CSSProperties;

  const grupo = (titulo: string, hijos: React.ReactNode) => (
    <section className="perfil-sec" style={entra()} aria-label={titulo}>
      <h2 className="perfil-h2">{titulo}</h2>
      <div className="perfil-grupo">{hijos}</div>
    </section>
  );

  return (
    <main className="perfil">
      <div className="perfil-lado">
        <header className="perfil-hero">
          <h1>{t("perfil.titulo")}</h1>
          <svg className="perfil-marca" viewBox="0 0 140 124" aria-hidden="true">
            <defs>
              <radialGradient id="perfil-luz"><stop offset="0" stopColor="#E27FB8" stopOpacity=".85" /><stop offset=".6" stopColor="#B05A8F" stopOpacity=".3" /><stop offset="1" stopColor="#B05A8F" stopOpacity="0" /></radialGradient>
              <linearGradient id="perfil-cuerpo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF6FB" /><stop offset=".55" stopColor="#F7C6E0" /><stop offset="1" stopColor="#E58FC0" /></linearGradient>
            </defs>
            <circle cx="70" cy="62" r="62" fill="url(#perfil-luz)" />
            <polygon points="105,62 87.5,92.3 52.5,92.3 35,62 52.5,31.7 87.5,31.7" fill="url(#perfil-cuerpo)" stroke="url(#perfil-cuerpo)" strokeWidth="10" strokeLinejoin="round" />
            {inicial && <text x="70" y="73" textAnchor="middle" fontSize="34" fontWeight="600" fill="#5A2556">{inicial}</text>}
          </svg>
          {perfil?.email && (
            <>
              <p className="perfil-nombre" aria-label={t("perfil.cuenta")}>{perfil.nombre || perfil.email}</p>
              {perfil.nombre && <p className="perfil-correo">{perfil.email}</p>}
              <button type="button" className="perfil-salir" onClick={() => void salir()}>{t("perfil.salir")}</button>
            </>
          )}
          {local && (
            <>
              <p className="perfil-nombre">{t("perfil.local")}</p>
              <p className="perfil-correo perfil-nota-local">{t("perfil.localNota")}</p>
            </>
          )}
        </header>

        {dias && (() => {
          const r = resumenDias(dias);
          return (
            <section className="perfil-practica perfil-sec" style={entra()} aria-label={t("perfil.practica")}>
              <h2>{t("perfil.practica")}</h2>
              {dias.length === 0 ? (
                <div className="perfil-practica-cifra">
                  <svg className="perfil-hex-vacio" viewBox="0 0 92 80" aria-hidden="true"><polygon points="76,40 61,66 31,66 16,40 31,14 61,14" /><text x="46" y="50" textAnchor="middle">0</text></svg>
                  <div><b>{t("perfil.sinDias")}</b><small>{t("perfil.sinDiasTexto")}</small></div>
                </div>
              ) : (
                <>
                  <div className="perfil-practica-cifra">
                    <span className="perfil-hex-n">{r.total}</span>
                    <div>
                      <b>{t(r.total === 1 ? "perfil.diaPracticado" : "perfil.diasPracticados")}</b>
                      <small>{t("perfil.practicasDesde")} {r.primero ? fechaCorta(r.primero) : ""}</small>
                    </div>
                  </div>
                  <div>
                    <p className="perfil-semana-cab"><span>{t("perfil.ultimos7")}</span><b>{t("perfil.ultimos7Valor").replace("{n}", String(r.ultimos))}</b></p>
                    <ol className="perfil-semana" aria-hidden="true">
                      {semanaDias(dias).map((d, k) => (
                        <li key={k} className={d.hoy ? "es-hoy" : undefined} style={{ "--k": k } as React.CSSProperties}>
                          <span className={`hx${d.activo ? " on" : ""}`} /><span className="dia">{d.letra}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              )}
              <p className="perfil-nota">{t("perfil.practicaNota")}</p>
            </section>
          );
        })()}
      </div>

      <div className="perfil-cuerpo">
        {grupo(t("perfil.preferencias"), (
          <>
            <Interruptor etiqueta={t("perfil.modoOscuro")} activo={oscuro} icono={oscuro ? "luna" : "sol"} cielo onCambio={(v) => elegirTema(v ? "oscuro" : "claro")} />
            <Interruptor etiqueta={t("perfil.igualSistema")} activo={tema === "sistema"} icono="pantalla" onCambio={(v) => elegirTema(v ? "sistema" : oscuro ? "oscuro" : "claro")} />
          </>
        ))}

        {grupo(t("perfil.ayuda"), (
          <>
            <button type="button" className="perfil-fila" onClick={() => window.dispatchEvent(new Event(ABRIR_GUIA))}>
              <Ico n="guia" /><span className="perfil-fila-txt"><b>{t("perfil.verGuia")}</b></span>
            </button>
            {!enAppInstalada() && (
              <details className="perfil-det" open={instalador.disponible || undefined}>
                <summary className="perfil-fila">
                  <Ico n="instalar" /><span className="perfil-fila-txt"><b>{t("perfil.instalar")}</b></span>
                </summary>
                <div className="perfil-detalle">
                  {instalador.disponible && (
                    <button type="button" onClick={() => void instalador.instalar()} className={`${boton} mb-3`}>{t("perfil.instalarBoton")}</button>
                  )}
                  <ul className="list-disc space-y-2 pl-5 text-[var(--ink-2)]">
                    <li>{t("perfil.instalarIphone")}</li>
                    <li>{t("perfil.instalarAndroid")}</li>
                    <li>{t("perfil.instalarOrdenador")}</li>
                  </ul>
                  <p className="mt-3 text-sm text-[var(--ink-3)]">{t("perfil.instalarNota")}</p>
                </div>
              </details>
            )}
          </>
        ))}

        {(client.ocultos || asignaturaId) && grupo(t("perfil.datos"), (
          <>
            {client.ocultos && (ocultos.length === 0 ? (
              <div className="perfil-fila perfil-fila-quieta">
                <Ico n="oculto" /><span className="perfil-fila-txt"><b>{t("perfil.ocultos")}</b><small>{t("perfil.ocultosVacio")}</small></span>
              </div>
            ) : (
              <details className="perfil-det">
                <summary className="perfil-fila">
                  <Ico n="oculto" />
                  <span className="perfil-fila-txt"><b>{t("perfil.ocultos")}</b><small>{ocultos.length === 1 ? t("perfil.ocultosUno") : t("perfil.ocultosVarios").replace("{n}", String(ocultos.length))}</small></span>
                </summary>
                <ul className="perfil-detalle space-y-2">
                  {ocultos.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-3">
                      <span><span className="text-sm text-[var(--ink-3)]">{t(`perfil.alcance.${o.alcance}`)}</span> {o.nombre}</span>
                      <button type="button" className={boton} onClick={() => void volverAMostrar(o.id)}>{t("perfil.volverAMostrar")}</button>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            {asignaturaId && (
              <details className="perfil-det">
                <summary className="perfil-fila">
                  <Ico n="llave" />
                  <span className="perfil-fila-txt"><b>{t("perfil.avanzado")}</b><small>{t(perfil?.online ? "perfil.avanzadoNotaOnline" : "perfil.avanzadoNota")}</small></span>
                </summary>
                <div className="perfil-detalle"><Settings asignaturaId={asignaturaId} client={client} /></div>
              </details>
            )}
          </>
        ))}

        {perfil?.reiniciar && (
          <section className="perfil-sec" style={entra()} aria-label={t("perfil.reiniciarTitulo")}>
            <div className="perfil-grupo">
              {confirmar ? (
                <div role="alertdialog" aria-labelledby="perfil-conf" onKeyDown={(e) => e.key === "Escape" && setConfirmar(false)} className="perfil-conf">
                  <p id="perfil-conf" className="font-semibold">{t("perfil.reiniciarPregunta")}</p>
                  <p>{t("perfil.reiniciarAviso")}</p>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className="perfil-ko perfil-ko-solido" onClick={() => void reiniciar()}>{t("perfil.reiniciarSi")}</button>
                    <button type="button" autoFocus className={boton} onClick={() => setConfirmar(false)}>{t("ajustes.cancelar")}</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="perfil-fila perfil-fila-ko" onClick={() => setConfirmar(true)}>{t("perfil.reiniciar")}</button>
              )}
            </div>
            <p className="perfil-nota perfil-nota-pie">{t("perfil.reiniciarTexto")}</p>
          </section>
        )}

        {error && <p role="alert" className="rounded-[11px] bg-[var(--ko-soft)] px-4 py-3 text-[var(--ko)]">{t("app.error")}</p>}
      </div>
    </main>
  );
}
