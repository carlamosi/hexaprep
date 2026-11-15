import type { Analytics } from "../../api";
import { t } from "../../i18n";
import { Hexagon } from "../Hexagon";
import { RichText } from "../RichText";
import { duracion, fiable, modo, pct, respuestas } from "./datos";

const Vacio = ({ texto }: { texto: string }) => <p className="hp-empty-line">{texto}</p>;

/** Las trampas en las que más cae: ranking con barras de recuento. */
export function Trampas({ trampas }: { trampas: Analytics["trampas"] }) {
  if (!trampas.length) return <Vacio texto={t("hist.trampasVacio")} />;
  const max = trampas[0].n;
  return (
    <ol className="hp-rank">
      {trampas.map((x, i) => (
        <li key={x.trampa}>
          <span className="hp-rank-i" aria-hidden="true">{i + 1}</span>
          <div className="hp-rank-body">
            <p className="hp-rank-t">{x.trampa}</p>
            <p className="hp-rank-sub">{t("hist.sobreTodoEn")} {x.concepto}</p>
          </div>
          <span className="hp-rank-bar" aria-hidden="true"><i style={{ width: `${(100 * x.n) / max}%` }} /></span>
          <b className="hp-rank-n">{x.n} <small>{t(x.n === 1 ? "hist.vez" : "hist.veces")}</small></b>
        </li>
      ))}
    </ol>
  );
}

/** Conceptos con menos dominio: el hexágono de la marca con su relleno, y el acierto con su n. */
export function Debiles({ debiles }: { debiles: Analytics["debiles"] }) {
  if (!debiles.length) return <Vacio texto={t("hist.debilesVacio")} />;
  return (
    <ul className="hp-weak">
      {debiles.map((d) => (
        <li key={d.concepto_id}>
          <span className="hp-weak-hex"><Hexagon percent={d.percent} color="var(--lila)" /></span>
          <div>
            <p className="hp-rank-t">{d.concepto}</p>
            <p className="hp-rank-sub">{d.subtema}</p>
          </div>
          <span className={`hp-weak-stat ${fiable(d.n) ? "" : "is-low"}`}>
            {pct(d.aciertos_pct)} <small>{t("hist.deAcierto")}</small>
            <small className="hp-n">n {d.n}{fiable(d.n) ? "" : ` · ${t("hist.pocos")}`}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Preguntas que falla en la mitad o más de sus intentos (con al menos dos). */
export function Dificiles({ dificiles }: { dificiles: Analytics["dificiles"] }) {
  if (!dificiles.length) return <Vacio texto={t("hist.dificilesVacio")} />;
  return (
    <ul className="hp-hard">
      {dificiles.map((d) => (
        <li key={d.pregunta_id}>
          <p className="hp-hard-q"><RichText text={d.enunciado} /></p>
          <div className="hp-hard-stat">
            <b>{d.fallos} {t("practica.de")} {d.n}</b> <small>{t("hist.fallos")}</small>
            <span className="hp-meter ko" aria-hidden="true"><i style={{ width: `${(100 * d.fallos) / d.n}%` }} /></span>
          </div>
        </li>
      ))}
    </ul>
  );
}

const cuando = (isoUtc: string) => {
  const d = new Date(isoUtc);
  return d.toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

/** Últimas sesiones: cuándo, qué modo, cuánto duró y cómo fue. */
export function Sesiones({ sesiones }: { sesiones: Analytics["sesiones_recientes"] }) {
  if (!sesiones.length) return <Vacio texto={t("hist.sesionesVacio")} />;
  return (
    <table className="hp-ses">
      <thead>
        <tr><th scope="col">{t("hist.cuando")}</th><th scope="col">{t("hist.modoCol")}</th><th scope="col" className="hp-ses-dur">{t("hist.duracion")}</th><th scope="col">{t("hist.acierto")}</th></tr>
      </thead>
      <tbody>
        {sesiones.map((s) => {
          const p = s.n ? Math.round((100 * s.aciertos) / s.n) : null;
          return (
            <tr key={s.sesion_id}>
              <td className="tabular">{cuando(s.inicio)}</td>
              <td>{modo(s.modo)}</td>
              <td className="hp-ses-dur tabular">{duracion(s.duracion_s)}</td>
              <td className={fiable(s.n) ? "" : "is-low"}>
                <span className="hp-ses-acc">
                  <b>{pct(p)}</b>
                  <small>{s.aciertos}/{s.n}</small>
                </span>
                <span className="hp-meter" aria-hidden="true"><i style={{ width: `${p ?? 0}%` }} /></span>
                <span className="sr-only">{respuestas(s.n)}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
