import { useEffect, useState } from "react";
import { api, type Subject } from "./api";

const KEY = "hexaprep.asignatura";

/** La asignatura elegida en la cabecera (guardada en el navegador) o, si no hay, la primera. */
export function elegirAsignatura(subjects: Subject[]): Subject | undefined {
  let id: string | null = null;
  try { id = localStorage.getItem(KEY); } catch { /* sin almacenamiento: se usa la primera */ }
  return subjects.find((s) => s.id === id) ?? subjects[0];
}

/** Cambia de asignatura recargando: todas las pantallas leen la elegida al montarse. */
export function guardarAsignatura(id: string): void {
  try { localStorage.setItem(KEY, id); } catch { /* sin almacenamiento: no se recuerda */ }
  window.location.hash = "panal";
  window.location.reload();
}

interface Estado { id: string | null; nombre: string | null; failed: boolean; subjects: Subject[] }

export function useAsignatura(): Estado {
  const [state, setState] = useState<Estado>({ id: null, nombre: null, failed: false, subjects: [] });
  useEffect(() => {
    let alive = true;
    api.getSubjects()
      .then((s) => { const a = elegirAsignatura(s); if (alive) setState({ id: a?.id ?? null, nombre: a?.nombre ?? null, failed: false, subjects: s }); })
      .catch(() => alive && setState({ id: null, nombre: null, failed: true, subjects: [] }));
    return () => { alive = false; };
  }, []);
  return state;
}
