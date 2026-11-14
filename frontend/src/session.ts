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
  aviso: string | null;
}

/** Reanuda la sesión guardada si el backend aún la conoce; si no, crea una nueva y la guarda. */
export async function openSession(
  key: string,
  client: { getSession?: (id: string) => Promise<SessionState> },
  create: () => Promise<{ sesion_id: string; aviso: string | null }>,
): Promise<Opened> {
  const saved = savedSession(key);
  if (saved && client.getSession) {
    try {
      const st = await client.getSession(saved);
      return { sid: saved, answered: st.respondidas.length, aviso: null };
    } catch {
      clearSession(key);
    }
  }
  const r = await create();
  saveSession(key, r.sesion_id);
  return { sid: r.sesion_id, answered: 0, aviso: r.aviso };
}
