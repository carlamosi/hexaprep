import { useEffect, useState } from "react";
import { api } from "../api";
import { t } from "../i18n";

export type FocoClient = Pick<typeof api, "getMap" | "getFoco" | "setFoco">;

/** Tema en curso (opcional): la práctica mezclada le da más peso. Vive en «Hoy», donde se decide qué repasar. */
export function TemaEnCurso({ asignaturaId, client = api }: { asignaturaId: string; client?: FocoClient }) {
  const [temas, setTemas] = useState<{ id: string; nombre: string }[]>([]);
  const [foco, setFoco] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    client.getMap(asignaturaId).then((m) => vivo && setTemas([...new Map(m.hexes.map((h) => [h.tema_id, { id: h.tema_id, nombre: h.tema }])).values()])).catch(() => {});
    client.getFoco(asignaturaId).then((f) => vivo && setFoco(f.tema_id ?? "")).catch(() => {});
    return () => { vivo = false; };
  }, [client, asignaturaId]);

  async function cambiar(id: string) {
    try {
      await client.setFoco(asignaturaId, id || null);
      setFoco(id);
      setError(false);
    } catch {
      setError(true);
    }
  }

  if (temas.length === 0) return null;
  return (
    <section className="foco">
      <header className="foco-cab">
        <span className="foco-hex" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>
        </span>
        <h2><label htmlFor="foco-tema">{t("perfil.foco")}</label></h2>
      </header>
      <select id="foco-tema" value={foco} onChange={(e) => void cambiar(e.target.value)}>
        <option value="">{t("perfil.focoNinguno")}</option>
        {temas.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
      </select>
      <p className="foco-nota">{t("perfil.focoNota")}</p>
      {error && <p role="alert" className="foco-error">{t("app.error")}</p>}
    </section>
  );
}
