import { useEffect, useState } from "react";
import { api, type Guardado, type TipoGuardado } from "../api";
import { t } from "../i18n";
import "./guardar.css";

/* Lo guardado se pide una vez por visita y se mantiene aquí: cada pregunta pinta el botón sin ir al servidor. */
let cache: Promise<Guardado[]> | null = null;
const lista = () => (cache ??= api.guardados().catch(() => { cache = null; return []; }));
export const olvidarGuardados = () => { cache = null; };

/** «Guardar» la ayuda del concepto o la explicación del ejemplo de esta pregunta; pulsarlo otra vez lo quita.
 * `huella` es el texto que lo identifica: la ayuda (tipo ayuda) o el enunciado (tipo ejemplo). */
export function BotonGuardar({ preguntaId, tipo, huella }: { preguntaId: string; tipo: TipoGuardado; huella: string }) {
  const [estado, setEstado] = useState<{ id: string | null } | null>(null); // null: aún no se sabe
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true;
    lista().then((gs) => vivo && setEstado({ id: gs.find((g) => g.tipo === tipo && (tipo === "ayuda" ? g.texto : g.enunciado) === huella)?.id ?? null }));
    return () => { vivo = false; };
  }, [tipo, huella]);
  const alternar = async () => {
    if (ocupado || !estado) return;
    setOcupado(true); setError(false);
    try {
      if (estado.id) { await api.quitarGuardado(estado.id); setEstado({ id: null }); }
      else { const g = await api.guardar(preguntaId, tipo); setEstado({ id: g.id }); }
      olvidarGuardados();
    } catch { setError(true); } finally { setOcupado(false); }
  };
  const guardado = !!estado?.id;
  return (
    <button type="button" className={`guardar${guardado ? " is-on" : ""}`} aria-pressed={guardado} disabled={!estado || ocupado}
      aria-label={guardado ? t("practica.guardado") : t(tipo === "ayuda" ? "practica.guardarAyuda" : "practica.guardarEjemplo")} onClick={alternar}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2h9v12L8 10.8 3.5 14z" /></svg>
      <span>{error ? "!" : guardado ? t("practica.guardado") : t("practica.guardar")}</span>
    </button>
  );
}
