import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/api";
import { Acceso, type AccesoClient } from "../src/Acceso";

let callback: ((r: { credential: string }) => void) | null = null;
function conGoogle() {
  (window as unknown as { google: unknown }).google = {
    accounts: { id: { initialize: vi.fn((o) => { callback = o.callback; }), renderButton: vi.fn() } },
  };
}
afterEach(() => { delete (window as unknown as { google?: unknown }).google; callback = null; });

function cliente(over: Partial<AccesoClient> = {}): AccesoClient {
  return {
    getAuthConfig: vi.fn().mockResolvedValue({ google_client_id: "id.apps.googleusercontent.com" }),
    authMe: vi.fn().mockRejectedValue(new ApiError(401, "Inicia sesión")),
    authGoogle: vi.fn().mockResolvedValue({ email: "carla@gmail.com", nombre: "Carla" }),
    authLogout: vi.fn().mockResolvedValue({ ok: true }),
    ...over,
  };
}
const app = <p>CONTENIDO DE LA APP</p>;

describe("acceso con Google", () => {
  it("sin_google_configurado_enseña_la_app_directamente", async () => {
    render(<Acceso client={cliente({ getAuthConfig: vi.fn().mockResolvedValue({ google_client_id: null }) })}>{app}</Acceso>);
    expect(await screen.findByText("CONTENIDO DE LA APP")).toBeInTheDocument();
    expect(screen.queryByText("Cerrar sesión")).toBeNull();
  });

  it("sin_sesion_pide_entrar_con_google_y_no_enseña_la_app", async () => {
    conGoogle();
    render(<Acceso client={cliente()}>{app}</Acceso>);
    expect(await screen.findByRole("heading", { name: /cuenta de Google/ })).toBeInTheDocument();
    expect(screen.queryByText("CONTENIDO DE LA APP")).toBeNull();
    await waitFor(() => expect(callback).not.toBeNull());
  });

  it("al_recibir_el_token_de_google_entra_y_enseña_la_app", async () => {
    conGoogle();
    const c = cliente();
    render(<Acceso client={c}>{app}</Acceso>);
    await waitFor(() => expect(callback).not.toBeNull());
    callback!({ credential: "tok" });
    expect(await screen.findByText("CONTENIDO DE LA APP")).toBeInTheDocument();
    expect(c.authGoogle).toHaveBeenCalledWith("tok");
    expect(screen.getByText("carla@gmail.com")).toBeInTheDocument();
  });

  it("un_email_sin_acceso_muestra_el_aviso_y_sigue_en_la_pantalla_de_entrada", async () => {
    conGoogle();
    render(<Acceso client={cliente({ authGoogle: vi.fn().mockRejectedValue(new ApiError(403, "Este email no tiene acceso")) })}>{app}</Acceso>);
    await waitFor(() => expect(callback).not.toBeNull());
    callback!({ credential: "tok" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/no tiene acceso/i);
    expect(screen.queryByText("CONTENIDO DE LA APP")).toBeNull();
  });

  it("con_sesion_abierta_enseña_la_app_y_cerrar_sesion_vuelve_a_la_entrada", async () => {
    conGoogle();
    const c = cliente({ authMe: vi.fn().mockResolvedValue({ email: "carla@gmail.com" }) });
    render(<Acceso client={c}>{app}</Acceso>);
    expect(await screen.findByText("CONTENIDO DE LA APP")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(c.authLogout).toHaveBeenCalled();
    expect(await screen.findByRole("heading", { name: /cuenta de Google/ })).toBeInTheDocument();
  });
});

describe("acceso dentro de la app instalada (iPhone)", () => {
  function ajustes() {
    return (window as unknown as { google: { accounts: { id: { initialize: ReturnType<typeof vi.fn> } } } }).google.accounts.id.initialize;
  }
  afterEach(() => { delete (window as unknown as { matchMedia?: unknown }).matchMedia; window.history.replaceState(null, "", "/"); });

  it("en_la_app_instalada_usa_el_flujo_con_redireccion_porque_la_ventana_emergente_no_funciona", async () => {
    conGoogle();
    (window as unknown as { matchMedia: unknown }).matchMedia = vi.fn((q: string) => ({ matches: q.includes("standalone") }));
    render(<Acceso client={cliente()}>{app}</Acceso>);
    await waitFor(() => expect(ajustes()).toHaveBeenCalled());
    expect(ajustes().mock.calls[0][0]).toMatchObject({ ux_mode: "redirect", login_uri: `${window.location.origin}/api/auth/google/redirect` });
    expect(ajustes().mock.calls[0][0].callback).toBeUndefined();
  });

  it("en_el_navegador_normal_sigue_con_la_ventana_emergente", async () => {
    conGoogle();
    render(<Acceso client={cliente()}>{app}</Acceso>);
    await waitFor(() => expect(ajustes()).toHaveBeenCalled());
    expect(ajustes().mock.calls[0][0].ux_mode).toBeUndefined();
    expect(typeof ajustes().mock.calls[0][0].callback).toBe("function");
  });

  it("al_volver_de_google_con_un_fallo_muestra_el_aviso_y_limpia_la_direccion", async () => {
    conGoogle();
    window.history.replaceState(null, "", "/?acceso=denegado");
    render(<Acceso client={cliente()}>{app}</Acceso>);
    expect(await screen.findByRole("alert")).toHaveTextContent(/no tiene acceso/i);
    expect(window.location.search).toBe("");
  });
});
