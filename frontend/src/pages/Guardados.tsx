import { useEffect, useState } from "react";
import { api, type Guardado } from "../api";
import { ErrorCarga } from "../components/ErrorCarga";
import { olvidarGuardados } from "../components/BotonGuardar";
import { RichText } from "../components/RichText";
import { t } from "../i18n";
import { sinPrefijoTema } from "../rotulo";
import "./guardados.css";

type Filtro = "todos" | "ayuda" | "ejemplo";
const FILTROS: [Filtro, string][] = [["todos", "guardados.todos"], ["ayuda", "guardados.ayudas"], ["ejemplo", "guardados.ejemplos"]];

/** Lo guardado de la asignatura (ayudas de concepto y explicaciones de ejemplos), lo último primero. */
export function Guardados({ asignaturaId }: { asignaturaId: string }) {
  const [items, setItems] = useState<Guardado[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  useEffect(() => {
    let vivo = true;
    api.guardados(asignaturaId).then((g) => vivo && setItems(g)).catch(() => vivo && setFallo(true));
    return () => { vivo = false; };
  }, [asignaturaId]);
  if (fallo) return <ErrorCarga />;
  const quitar = async (g: Guardado) => {
    await api.quitarGuardado(g.id);
    olvidarGuardados();
    setItems((xs) => xs && xs.filter((x) => x.id !== g.id));
  };
  const vistos = (items ?? []).filter((g) => filtro === "todos" || g.tipo === filtro);
  return (
    <main id="main" className="wrap gd" aria-busy={items === null}>
      <a className="gd-volver" href="#historial">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>{t("guardados.volver")}
      </a>
      <header className="gd-head">
        <h1>{t("guardados.titulo")}</h1>
        <p className="lede">{t("guardados.lede")}</p>
        <div className="hp-seg gd-filtro" role="group" aria-label={t("guardados.titulo")}>
          {FILTROS.map(([k, txt]) => (
            <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{t(txt)}</button>
          ))}
        </div>
      </header>
      {items && vistos.length === 0 && <p className="gd-vacio">{t("guardados.vacio")}</p>}
      <ul className="gd-lista">
        {vistos.map((g, i) => (
          <li key={g.id} className="gd-card" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
            <div className="gd-meta">
              <span className={`gd-tipo gd-${g.tipo}`}>{t(g.tipo === "ayuda" ? "guardados.ayuda" : "guardados.ejemplo")}</span>
              <span className="gd-ruta">{sinPrefijoTema(g.tema)} · {g.subtema}</span>
            </div>
            <h2>{g.titulo}</h2>
            {g.enunciado && <p className="gd-enun"><RichText text={g.enunciado} /></p>}
            <p className="gd-texto"><RichText text={g.texto} /></p>
            <button type="button" className="gd-quitar" onClick={() => void quitar(g)}>{t("guardados.quitar")}</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
