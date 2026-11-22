import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/api";
import { Perfil, resumenDias } from "../src/pages/Perfil";

function cliente(perfil: object) {
  return {
    getPerfil: vi.fn().mockResolvedValue(perfil), reiniciarPerfil: vi.fn().mockResolvedValue({ archivado: "archivo_x" }),
    authLogout: vi.fn().mockResolvedValue({ ok: true }),
    getBackup: vi.fn().mockResolvedValue(null), makeBackup: vi.fn(), restoreBackup: vi.fn(), exportWeak: vi.fn(), exportEvents: vi.fn(),
    exportBank: vi.fn(), reportedQuestions: vi.fn().mockResolvedValue([]), getQuestion: vi.fn(), editQuestion: vi.fn(),
  };
}
const ONLINE = { email: "carla@gmail.com", nombre: "Carla Monté", online: true, reiniciar: true };

afterEach(() => vi.restoreAllMocks());

describe("perfil", () => {
  it("el_examen_y_el_tema_en_curso_ya_no_estan_en_el_perfil", async () => {
    render(<Perfil asignaturaId="a1" client={cliente(ONLINE)} />);
    expect(await screen.findByRole("heading", { name: "Perfil" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Examen" })).toBeNull(); // vive en «Hoy»
    expect(screen.queryByLabelText("Tema en curso (opcional)")).toBeNull();
  });

  it("cuenta_los_dias_practicados_sin_rachas", async () => {
    const hoy = new Date(2026, 10, 22);
    expect(resumenDias(["2026-10-01", "2026-11-10", "2026-11-17", "2026-11-20", "2026-11-22"], hoy)).toEqual({ total: 5, primero: "2026-10-01", ultimos: 3 });
    expect(resumenDias([], hoy)).toEqual({ total: 0, primero: null, ultimos: 0 });
    const d = new Date();
    const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    const c = { ...cliente(ONLINE), history: vi.fn().mockResolvedValue({ dias: ["2026-01-05", iso(d)], evolucion: [] }) };
    render(<Perfil asignaturaId="a1" client={c} />);
    const tarjeta = await screen.findByRole("region", { name: "Tu práctica" });
    expect(tarjeta).toHaveTextContent("2");
    expect(tarjeta).toHaveTextContent("Días practicados");
    expect(tarjeta).toHaveTextContent(/5 ene 2026/);
    expect(tarjeta).toHaveTextContent(/sin rachas/);
  });

  it("lista_lo_ocultado_y_permite_volver_a_mostrarlo", async () => {
    const c = { ...cliente(ONLINE), ocultos: vi.fn().mockResolvedValue([{ id: "tema:t1", alcance: "tema", nombre: "Verbos", claves: ["q1"] }]), mostrarOculto: vi.fn().mockResolvedValue({ ok: true }) };
    render(<Perfil asignaturaId="a1" client={c} />);
    await userEvent.click(await screen.findByRole("button", { name: "Volver a mostrar" }));
    expect(c.mostrarOculto).toHaveBeenCalledWith("tema:t1");
    expect(await screen.findByText("No has ocultado nada.")).toBeInTheDocument();
  });

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

  it("lo_tecnico_va_plegado_en_herramientas_y_online_no_ofrece_copias_ni_exportaciones_de_archivo", async () => {
    const c = cliente(ONLINE);
    c.getBackup = vi.fn().mockRejectedValue(new ApiError(501, "No disponible online"));
    render(<Perfil asignaturaId="a1" client={c} />);
    const resumen = await screen.findByText("Herramientas");
    expect(resumen.closest("details")).not.toHaveAttribute("open");
    expect(await screen.findByText("Preguntas reportadas")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Copia de seguridad" })).toBeNull());
    expect(screen.queryByRole("heading", { name: "Exportar datos" })).toBeNull();
  });
});

describe("apariencia", () => {
  it("permite_elegir_sistema_claro_u_oscuro", async () => {
    render(<Perfil asignaturaId="a1" client={cliente(ONLINE)} />);
    const oscuro = await screen.findByRole("switch", { name: "Modo oscuro" });
    const sistema = screen.getByRole("switch", { name: "Igual que el dispositivo" });
    expect(sistema).toHaveAttribute("aria-checked", "true"); // por defecto sigue al dispositivo
    await userEvent.click(oscuro);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(oscuro).toHaveAttribute("aria-checked", "true");
    expect(sistema).toHaveAttribute("aria-checked", "false"); // elegir a mano deja de seguir al dispositivo
    await userEvent.click(oscuro);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    await userEvent.click(sistema);
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(sistema).toHaveAttribute("aria-checked", "true");
  });
});
