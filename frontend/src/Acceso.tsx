import { useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, api } from "./api";
import { t } from "./i18n";
import { marcarListo } from "./arranque";
import { enAppInstalada } from "./instalar"; // en la app instalada la ventana emergente de Google no funciona en iOS
import { ErrorCarga } from "./components/ErrorCarga";
import { LEMA, MarcaHex } from "./components/Marca";
import { CAMBIO_TEMA } from "./tema";
import "./acceso.css";

declare global {
  interface Window {
    google?: {
      accounts: { id: { initialize(o: { client_id: string; callback?: (r: { credential: string }) => void; ux_mode?: "popup" | "redirect"; login_uri?: string }): void; renderButton(el: HTMLElement | null, o: object): void } };
    };
  }
}

export type AccesoClient = Pick<typeof api, "getAuthConfig" | "authMe" | "authGoogle" | "authLogout">;

type Estado = { tipo: "cargando" } | { tipo: "libre" } | { tipo: "fuera"; clientId: string } | { tipo: "dentro"; clientId: string; email: string } | { tipo: "error" };

function cargarGoogle(): Promise<void> {
  if (window.google) return Promise.resolve();
  return new Promise((ok, fallo) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => fallo(new Error("google"));
    document.head.appendChild(s);
  });
}

function Entrada({ clientId, aviso, onCredencial }: { clientId: string; aviso: string | null; onCredencial: (c: string) => void }) {
  const boton = useRef<HTMLDivElement>(null);
  const alRecibir = useRef(onCredencial);
  alRecibir.current = onCredencial;
  const [sinGoogle, setSinGoogle] = useState(false);
  useEffect(() => {
    cargarGoogle()
      .then(() => {
        window.google!.accounts.id.initialize(enAppInstalada()
          // con redirección Google envía el token por formulario a nuestra API y vuelve aquí (flujo fiable dentro de la app instalada)
          ? { client_id: clientId, ux_mode: "redirect", login_uri: `${window.location.origin}/api/auth/google/redirect` }
          : { client_id: clientId, callback: (r) => alRecibir.current(r.credential) });
        window.google!.accounts.id.renderButton(boton.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", logo_alignment: "left", width: Math.min(340, window.innerWidth - 48), locale: "es" });
      })
      .catch(() => setSinGoogle(true));
  }, [clientId]);
  useEffect(() => { // la barra del navegador y la de iOS toman el color de la portada; al entrar, el encabezado la repinta
    const meta = document.querySelector('meta[name="theme-color"]');
    const antes = meta?.getAttribute("content");
    meta?.setAttribute("content", "#2A1030");
    return () => { if (antes) meta?.setAttribute("content", antes); window.dispatchEvent(new Event(CAMBIO_TEMA)); };
  }, []);
  const mensaje = aviso ?? (sinGoogle ? t("acceso.sinGoogle") : null);
  return (
    <main className="acceso">
      <div className="acceso-marca">
        <MarcaHex />
        <span className="acceso-nombre">{t("app.nombre")}</span>
        <p lang="en" className="acceso-lema">{LEMA}</p>
      </div>
      <section className="acceso-form">
        <h1>{t("acceso.titulo")}</h1>
        <p>{t("acceso.nota")}</p>
        {mensaje && (
          <div role="alert" className="acceso-aviso">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 21.5 20h-19z" /><path d="M12 10v4.5M12 17.5v.01" /></svg>
            <p>{mensaje}</p>
          </div>
        )}
        {sinGoogle ? (
          <button type="button" className="acceso-recargar" onClick={() => window.location.reload()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" /></svg>
            {t("acceso.recargar")}
          </button>
        ) : <div ref={boton} className="acceso-boton" />}
      </section>
    </main>
  );
}

/** Envuelve la app: si el servidor pide Google, enseña la entrada hasta que haya sesión; en local no pide nada. */
export function Acceso({ children, client = api }: { children: ReactNode; client?: AccesoClient }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => { if (estado.tipo !== "cargando") marcarListo("acceso"); }, [estado.tipo]); // la splash espera a saber si hay sesión

  useEffect(() => { // al volver de Google con redirección, el motivo del fallo llega en la dirección
    const motivo = new URLSearchParams(window.location.search).get("acceso");
    if (!motivo) return;
    setAviso(t(motivo === "denegado" ? "acceso.denegado" : "acceso.error"));
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { google_client_id: clientId } = await client.getAuthConfig();
        if (!clientId) return vivo && setEstado({ tipo: "libre" });
        try {
          const { email } = await client.authMe();
          vivo && setEstado({ tipo: "dentro", clientId, email });
        } catch (e) {
          vivo && setEstado(e instanceof ApiError && e.status === 401 ? { tipo: "fuera", clientId } : { tipo: "error" });
        }
      } catch {
        vivo && setEstado({ tipo: "error" });
      }
    })();
    return () => { vivo = false; };
  }, [client]);

  async function credencial(c: string) {
    if (estado.tipo !== "fuera") return;
    try {
      const { email } = await client.authGoogle(c);
      setAviso(null);
      setEstado({ tipo: "dentro", clientId: estado.clientId, email });
    } catch (e) {
      setAviso(t(e instanceof ApiError && e.status === 403 ? "acceso.denegado" : "acceso.error"));
    }
  }

  // mientras se comprueba la sesión no se ve nada (la portada cubre ese rato): el texto «Cargando» solo queda para lectores de pantalla
  if (estado.tipo === "cargando") return <p role="status" className="sr-only">{t("app.cargando")}</p>;
  if (estado.tipo === "error") return <ErrorCarga />;
  if (estado.tipo === "fuera") return <Entrada clientId={estado.clientId} aviso={aviso} onCredencial={(c) => void credencial(c)} />;
  return <>{children}</>;
}
