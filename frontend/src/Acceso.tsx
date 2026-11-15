import { useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, api } from "./api";
import { t } from "./i18n";

declare global {
  interface Window {
    google?: {
      accounts: { id: { initialize(o: { client_id: string; callback?: (r: { credential: string }) => void; ux_mode?: "popup" | "redirect"; login_uri?: string }): void; renderButton(el: HTMLElement | null, o: object): void } };
    };
  }
}

export type AccesoClient = Pick<typeof api, "getAuthConfig" | "authMe" | "authGoogle" | "authLogout">;

type Estado = { tipo: "cargando" } | { tipo: "libre" } | { tipo: "fuera"; clientId: string } | { tipo: "dentro"; clientId: string; email: string } | { tipo: "error" };

/** ¿Está abierta como app instalada (pantalla de inicio)? Allí la ventana emergente de Google no funciona en iOS. */
function enAppInstalada(): boolean {
  return (navigator as unknown as { standalone?: boolean }).standalone === true || !!window.matchMedia?.("(display-mode: standalone)").matches;
}

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
        window.google!.accounts.id.renderButton(boton.current, { theme: "outline", size: "large", text: "signin_with", locale: "es" });
      })
      .catch(() => setSinGoogle(true));
  }, [clientId]);
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">{t("acceso.titulo")}</h1>
      <p className="text-[var(--ink-2)]">{t("acceso.nota")}</p>
      <div ref={boton} />
      {(aviso || sinGoogle) && <p role="alert" className="text-sm text-[var(--ko)]">{aviso ?? t("acceso.sinGoogle")}</p>}
    </main>
  );
}

/** Envuelve la app: si el servidor pide Google, enseña la entrada hasta que haya sesión; en local no pide nada. */
export function Acceso({ children, client = api }: { children: ReactNode; client?: AccesoClient }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [aviso, setAviso] = useState<string | null>(null);

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

  async function salir() {
    if (estado.tipo !== "dentro") return;
    await client.authLogout().catch(() => null);
    setEstado({ tipo: "fuera", clientId: estado.clientId });
  }

  if (estado.tipo === "cargando") return <p className="px-4 py-8 text-[var(--ink-3)]">{t("app.cargando")}</p>;
  if (estado.tipo === "error") return <p role="alert" className="px-4 py-8">{t("app.error")}</p>;
  if (estado.tipo === "fuera") return <Entrada clientId={estado.clientId} aviso={aviso} onCredencial={(c) => void credencial(c)} />;
  return (
    <>
      {estado.tipo === "dentro" && (
        <div className="flex justify-end gap-3 px-4 py-1 text-xs text-[var(--ink-3)]">
          <span>{estado.email}</span>
          <button type="button" onClick={() => void salir()} className="underline underline-offset-2">{t("acceso.salir")}</button>
        </div>
      )}
      {children}
    </>
  );
}
