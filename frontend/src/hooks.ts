import { useEffect, useState } from "react";
import { api } from "./api";

/** Id de la primera asignatura (de momento la app trabaja con una: Economía). */
export function useAsignaturaId(): { id: string | null; failed: boolean } {
  const [state, setState] = useState<{ id: string | null; failed: boolean }>({ id: null, failed: false });
  useEffect(() => {
    let alive = true;
    api.getSubjects()
      .then((s) => alive && setState({ id: s[0]?.id ?? null, failed: false }))
      .catch(() => alive && setState({ id: null, failed: true }));
    return () => { alive = false; };
  }, []);
  return state;
}
