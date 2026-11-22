import { useState } from "react";
import { colorTema } from "../colorTema";
import { t } from "../i18n";
import { sinPrefijoTema } from "../rotulo";
import "./novedad.css";

export const CLAVE_NOVEDAD = "hexaprep.novedad.catala-materias";

/** Solo quien ya tenía progreso en Català (el temario cambió de forma) y solo hasta que lo cierra. */
export function debeMostrarse(asignatura: string, hayProgreso: boolean): boolean {
  if (asignatura !== "Català" || !hayProgreso || navigator.webdriver) return false; // los navegadores automatizados no ven avisos: taparían las pruebas
  try { return localStorage.getItem(CLAVE_NOVEDAD) !== "1"; } catch { return false; } // sin almacenamiento no se insiste
}

/** Aviso breve y único: el temario de Català ahora va por materias. Los cinco hexágonos son los temas, con su color del panal. */
export function NovedadTemario({ temas, base }: { temas: string[]; base: string }) {
  const [saliendo, setSaliendo] = useState(false);
  const [oculto, setOculto] = useState(false);
  if (oculto) return null;
  const cerrar = () => {
    try { localStorage.setItem(CLAVE_NOVEDAD, "1"); } catch { /* opcional */ }
    // con movimiento reducido se oculta ya; si no, tras la salida de .22 s (un temporizador no depende de que llegue animationend)
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setOculto(true);
    else { setSaliendo(true); window.setTimeout(() => setOculto(true), 230); }
  };
  return (
    <aside
      className={`novedad${saliendo ? " novedad-sale" : ""}`}
      role="region" aria-label={t("novedad.catala.titulo")}
    >
      <ul className="novedad-hex" aria-hidden="true">
        {temas.map((nombre, i) => (
          <li key={nombre} title={sinPrefijoTema(nombre)} style={{ "--tc": colorTema(base, i, temas.length), "--i": i } as React.CSSProperties} />
        ))}
      </ul>
      <div className="novedad-txt">
        <h2>{t("novedad.catala.titulo")}</h2>
        <p>{t("novedad.catala.texto")}</p>
      </div>
      <button type="button" className="novedad-ok btn-duro" onClick={cerrar}>{t("novedad.catala.ok")}</button>
    </aside>
  );
}
