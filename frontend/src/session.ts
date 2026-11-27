import type { SessionState } from "./api";

// La sesión en curso se recuerda en el navegador para poder reanudarla tras cerrar o recargar la página.
// Cada acceso va protegido: el almacenamiento puede estar bloqueado o vacío y la app debe funcionar igual.

export function savedSession(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveSession(key: string, id: string): void {
  try {
    localStorage.setItem(key, id);
  } catch {
    /* sin almacenamiento: la sesión simplemente no se podrá reanudar */
  }
}

export function clearSession(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* igual que arriba */
  }
}

interface Opened {
  sid: string;
  answered: number;
}

/** Reanuda la sesión guardada si el backend aún la conoce; si no, crea una nueva y la guarda. */
export async function openSession(
  key: string,
  client: { getSession?: (id: string) => Promise<SessionState> },
  create: () => Promise<{ sesion_id: string }>,
): Promise<Opened> {
  const saved = savedSession(key);
  if (saved && client.getSession) {
    try {
      const st = await client.getSession(saved);
      return { sid: saved, answered: st.respondidas.length };
    } catch {
      clearSession(key);
    }
  }
  const r = await create();
  saveSession(key, r.sesion_id);
  return { sid: r.sesion_id, answered: 0 };
}

// Pregunta en curso y ruta de práctica: permiten volver exactamente donde se estaba tras cerrar la app o la pestaña.
const CLAVE_PREGUNTA = "hexaprep.pregunta.";
const CLAVE_RUTA = "hexaprep.ruta";

export function guardarPregunta(sesionId: string, q: unknown): void {
  try { localStorage.setItem(CLAVE_PREGUNTA + sesionId, JSON.stringify(q)); } catch { /* sin almacenamiento */ }
}

export function preguntaGuardada<T extends { pregunta_id: string }>(sesionId: string): T | null {
  try {
    const q = JSON.parse(localStorage.getItem(CLAVE_PREGUNTA + sesionId) ?? "null") as T | null;
    return q && typeof q.pregunta_id === "string" ? q : null;
  } catch { return null; }
}

/** Ruta de práctica en curso (`practica/...` o `subtema/...`); vacía al salir de ella. */
export function guardarRuta(ruta: string | null): void {
  try { ruta ? localStorage.setItem(CLAVE_RUTA, ruta) : localStorage.removeItem(CLAVE_RUTA); } catch { /* igual */ }
}

export function rutaGuardada(): string | null {
  try { return localStorage.getItem(CLAVE_RUTA); } catch { return null; }
}
