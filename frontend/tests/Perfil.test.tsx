import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/api";
import { Perfil } from "../src/pages/Perfil";

const EXAMEN = { fecha: null, dias: null, por_dia: null, total: 77, tocados: 10, sin_tocar: 67 };

function cliente(perfil: object) {
  return {
    getPerfil: vi.fn().mockResolvedValue(perfil), reiniciarPerfil: vi.fn().mockResolvedValue({ archivado: "archivo_x" }),
    authLogout: vi.fn().mockResolvedValue({ ok: true }),
    getExamen: vi.fn().mockResolvedValue(EXAMEN), setExamen: vi.fn().mockResolvedValue(EXAMEN),
    getBackup: vi.fn().mockResolvedValue(null), makeBackup: vi.fn(), restoreBackup: vi.fn(), exportWeak: vi.fn(), exportEvents: vi.fn(),
    exportBank: vi.fn(), reportedQuestions: vi.fn().mockResolvedValue([]), getQuestion: vi.fn(), editQuestion: vi.fn(),
  };
}
const ONLINE = { email: "carla@gmail.com", nombre: "Carla Monté", online: true, reiniciar: true };

afterEach(() => vi.restoreAllMocks());

describe("perfil", () => {
  it("enseña_quien_eres_y_cierra_la_sesion", async () => {
    const c = cliente(ONLINE);
    const recarga = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload: recarga } as Location);
    render(<Perfil asignaturaId="a1" client={c} />);
    expect(await screen.findByRole("heading", { name: "Perfil" })).toBeInTheDocument();
    expect(screen.getByText("Carla Monté")).toBeInTheDocument();
    expect(screen.getByText("carla@gmail.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(c.authLogout).toHaveBeenCalled();
    await waitFor(() => expect(recarga).toHaveBeenCalled());
  });

  it("en_local_sin_cuenta_no_hay_cerrar_sesion_ni_reiniciar_pero_si_el_resto", async () => {
    render(<Perfil asignaturaId="a1" client={cliente({ email: null, nombre: "", online: false, reiniciar: false })} />);
    expect(await screen.findByRole("heading", { name: "Perfil" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reiniciar mi progreso" })).toBeNull();
    expect(await screen.findByRole("button", { name: "Poner fecha de examen" })).toBeInTheDocument();
    expect(screen.getByText(/Instalar la app/)).toBeInTheDocument();
  });

  it("reiniciar_pide_confirmacion_y_explica_que_se_archiva", async () => {
    const c = cliente(ONLINE);
    const user = userEvent.setup();
    render(<Perfil asignaturaId="a1" client={c} />);
    await user.click(await screen.findByRole("button", { name: "Reiniciar mi progreso" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/archiva/i);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(c.reiniciarPerfil).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Reiniciar mi progreso" }));
    await user.click(screen.getByRole("button", { name: "Sí, empezar de cero" }));
    expect(c.reiniciarPerfil).toHaveBeenCalledTimes(1);
  });

  it("lo_tecnico_va_plegado_en_avanzado_y_online_no_ofrece_copias_ni_exportaciones_de_archivo", async () => {
    const c = cliente(ONLINE);
    c.getBackup = vi.fn().mockRejectedValue(new ApiError(501, "No disponible online"));
    render(<Perfil asignaturaId="a1" client={c} />);
    const resumen = await screen.findByText("Avanzado");
    expect(resumen.closest("details")).not.toHaveAttribute("open");
    expect(await screen.findByText("Preguntas reportadas")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Copia de seguridad" })).toBeNull());
    expect(screen.queryByRole("heading", { name: "Exportar datos" })).toBeNull();
  });
});
