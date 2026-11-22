import { useCallback, useEffect, useRef, useState } from "react";
import type { Examen as ExamenDatos } from "../api";
import { t } from "../i18n";
import { Examen, fechaLarga, mensaje, type ExamenClient } from "./Examen";
import { Hoja } from "./Hoja";
import { TemaEnCurso, type FocoClient } from "./TemaEnCurso";

export type PlanClient = Partial<ExamenClient> & Partial<FocoClient>;

const Chevron = () => <svg className="hoy-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>;

/** Tu plan: el examen y el tema en curso, dos ajustes opcionales, como filas con su resumen. Tocar una abre la hoja con los dos. */
export function Plan({ asignaturaId, client }: { asignaturaId: string; client: PlanClient }) {
  const hayExamen = !!(client.getExamen && client.setExamen);
  const hayFoco = !!(client.getFoco && client.setFoco && client.getMap);
  const [examen, setExamen] = useState<ExamenDatos | null>(null);
  const [foco, setFoco] = useState<string | null>(null);
  const [temas, setTemas] = useState<Map<string, string>>(new Map());
  const [abierta, setAbierta] = useState(false);
  const abridor = useRef<HTMLElement | null>(null);

  const cargar = useCallback(() => {
    let vivo = true;
    if (hayExamen) client.getExamen!(asignaturaId).then((d) => vivo && setExamen(d)).catch(() => {});
    if (hayFoco) {
      client.getFoco!(asignaturaId).then((f) => vivo && setFoco(f.tema_id)).catch(() => {});
      client.getMap!(asignaturaId).then((m) => vivo && setTemas(new Map(m.hexes.map((h) => [h.tema_id, h.tema])))).catch(() => {});
    }
    return () => { vivo = false; };
  }, [client, asignaturaId, hayExamen, hayFoco]);
  useEffect(() => cargar(), [cargar]);

  if (!hayExamen && !hayFoco) return null;
  const abrir = (el: HTMLElement) => { abridor.current = el; setAbierta(true); };
  const cerrar = () => { setAbierta(false); abridor.current?.focus(); cargar(); }; // al volver, los resúmenes reflejan lo que cambiaste
  const dias = examen?.dias ?? null;
  const tema = foco ? temas.get(foco) : null;
  return (
    <section className="hoy-plan" aria-label={t("hoy.plan")}>
      <h2 className="hoy-h2">{t("hoy.plan")}</h2>
      <div className="hoy-grupo">
        {hayExamen && (
          <button type="button" className="hoy-fila" onClick={(e) => abrir(e.currentTarget)}>
            {examen?.fecha && dias !== null && dias >= 0 ? (
              <span className="hoy-cuenta" aria-hidden="true"><b>{dias === 0 ? t("examen.hoyCorto") : dias}</b>{dias > 0 && <small>{t(dias === 1 ? "examen.dia" : "examen.dias")}</small>}</span>
            ) : (
              <svg className="hoy-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M8.5 3v4M15.5 3v4" /></svg>
            )}
            <span className="hoy-fila-txt">
              <b>{examen?.fecha ? `${t("examen.titulo")}, ${fechaLarga(examen.fecha)}` : t("examen.titulo")}</b>
              {examen && <small>{examen.fecha ? mensaje(examen) : t("hoy.examenSin")}</small>}
            </span>
            <Chevron />
          </button>
        )}
        {hayFoco && (
          <button type="button" className="hoy-fila" onClick={(e) => abrir(e.currentTarget)}>
            <svg className="hoy-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /></svg>
            <span className="hoy-fila-txt">
              <b>{tema ? `Tema en curso: ${tema}` : "Tema en curso"}</b>
              <small>{tema ? t("hoy.focoActivo") : t("hoy.focoNinguno")}</small>
            </span>
            <Chevron />
          </button>
        )}
      </div>
      {abierta && (
        <Hoja titulo={t("hoy.plan")} onCerrar={cerrar}>
          {hayExamen && <Examen asignaturaId={asignaturaId} client={client as ExamenClient} />}
          {hayFoco && <TemaEnCurso asignaturaId={asignaturaId} client={client as FocoClient} />}
        </Hoja>
      )}
    </section>
  );
}
