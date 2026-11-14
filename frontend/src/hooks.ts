import { useEffect, useState } from "react";
import { api } from "./api";

/** Id y nombre de la primera asignatura (de momento la app trabaja con una: Economía). */
export function useAsignatura(): { id: string | null; nombre: string | null; failed: boolean } {
  const [state, setState] = useState<{ id: string | null; nombre: string | null; failed: boolean }>({ id: null, nombre: null, failed: false });
  useEffect(() => {
    let alive = true;
    api.getSubjects()
      .then((s) => alive && setState({ id: s[0]?.id ?? null, nombre: s[0]?.nombre ?? null, failed: false }))
      .catch(() => alive && setState({ id: null, nombre: null, failed: true }));
    return () => { alive = false; };
  }, []);
  return state;
}
