import { useCallback, useEffect, useState } from "react";
import { api, type Subject } from "./api";

const KEY = "hexaprep.asignatura";

/** La asignatura elegida en la cabecera (guardada en el navegador) o, si no hay, la primera. */
export function elegirAsignatura(subjects: Subject[]): Subject | undefined {
  let id: string | null = null;
  try { id = localStorage.getItem(KEY); } catch { /* sin almacenamiento: se usa la primera */ }
  return subjects.find((s) => s.id === id) ?? subjects[0];
}

interface Estado { id: string | null; nombre: string | null; failed: boolean; subjects: Subject[] }

export function useAsignatura(): Estado & { elegir: (id: string) => void; refrescar: () => void } {
  const [state, setState] = useState<Estado>({ id: null, nombre: null, failed: false, subjects: [] });

  const cargar = useCallback((alive: () => boolean = () => true) => {
    api.getSubjects()
      .then((s) => {
        if (!alive()) return;
        const a = elegirAsignatura(s);
        setState((prev) => ({ id: prev.id && s.some((x) => x.id === prev.id) ? prev.id : a?.id ?? null, nombre: null, failed: false, subjects: s }));
      })
      .catch(() => alive() && setState({ id: null, nombre: null, failed: true, subjects: [] }));
  }, []);

  useEffect(() => {
    let vivo = true;
    cargar(() => vivo);
    return () => { vivo = false; };
  }, [cargar]);

  /** Cambia de asignatura sin recargar: las páginas se montan de nuevo con la nueva (key en App). */
  const elegir = useCallback((id: string) => {
    try { localStorage.setItem(KEY, id); } catch { /* sin almacenamiento: no se recuerda */ }
    setState((prev) => ({ ...prev, id }));
  }, []);

  const actual = state.subjects.find((s) => s.id === state.id);
  return { ...state, nombre: actual?.nombre ?? null, elegir, refrescar: () => cargar() };
}
