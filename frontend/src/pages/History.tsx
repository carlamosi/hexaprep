import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type Analytics, type MapResponse } from "../api";
import { Hexagon } from "../components/Hexagon";
import { Actividad } from "../components/historial/Actividad";
import { Barras, Columnas, type Fila } from "../components/historial/Barras";
import {
  conclusionesMas, datosTema, DIAS, DIAS_CORTOS, estado, hora, MIN_N, ordenPanal, pct, pendientes, POCOS_DATOS, segundos, semanasActividad, semanasDeRango,
  titularDominio, titularMueve, titularOlvido,
} from "../components/historial/datos";
import { Evolucion } from "../components/historial/Evolucion";
import { Duda } from "../components/historial/Duda";
import { Mueve } from "../components/historial/Mueve";
import { Olvido } from "../components/historial/Olvido";
import { Repasar } from "../components/historial/Repasar";
import { TemaDetalle } from "../components/historial/TemaDetalle";
import { TiraSesiones } from "../components/historial/TiraSesiones";
import { Debiles, Dificiles, ErroresEscritura, Sesiones, Trampas } from "../components/historial/Listas";
import "../components/historial/historial.css";
import { t, tn } from "../i18n";
import { ErrorCarga } from "../components/ErrorCarga";
import "./guardados.css";

type Dias = 0 | 7 | 30;
const RANGOS: Dias[] = [7, 30, 0];

/** `mes` fija el día de referencia (AAAA-MM o AAAA-MM-DD); sin él, hoy. */
function referencia(mes?: string): Date {
  if (!mes) return new Date();
  const [y, m, d] = mes.split("-").map(Number);
  return d ? new Date(y, m - 1, d) : new Date(y, m, 0);
}

/** Tarjeta de la vista principal: el título es la conclusión, no el nombre de la gráfica. */
function Bloque({ etiqueta, titulo, sub, children }: { etiqueta: string; titulo: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <section className="hp-card" aria-label={etiqueta}>
      <header className="hp-card-head">
        <h3>{titulo}</h3>
        {sub && <p>{sub}</p>}
      </header>
      {children}
    </section>
  );
}

/** Una gráfica de «Más análisis»: cerrada solo se lee su conclusión; abierta, la gráfica entera. */
function Fila({ titulo, conclusion, children }: { titulo: string; conclusion: string; children: ReactNode }) {
  return (
    <details className="hp-det">
      <summary>
        <span><h3>{titulo}</h3>{conclusion && <small>{conclusion}</small>}</span>
      </summary>
      <div className="hp-det-body">{children}</div>
    </details>
  );
}

function Stat({ valor, etiqueta, nota }: { valor: ReactNode; etiqueta: string; nota?: string }) {
  return (
    <div className="hp-stat">
      <b>{valor}</b>
      <span>{etiqueta}</span>
      {nota && <small>{nota}</small>}
    </div>
  );
}

/** Historial: la conclusión arriba, lo que se mueve y lo que repasar, y el análisis completo plegado. */
export function History({ asignaturaId, client = api, mes }: {
  asignaturaId: string; client?: Pick<typeof api, "analytics" | "getMap">; mes?: string;
}) {
  const [dias, setDias] = useState<Dias>(0);
  const [data, setData] = useState<Analytics | null>(null);
  const [map, setMap] = useState<MapResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [failed, setFailed] = useState(false);
  const [temaId, setTemaId] = useState<string | null>(null);
  const abridor = useRef<HTMLElement | null>(null);
  const hoy = useMemo(() => referencia(mes), [mes]);

  useEffect(() => {
    let alive = true;
    client.getMap(asignaturaId).then((m) => alive && setMap(m)).catch(() => {});
    return () => { alive = false; };
  }, [client, asignaturaId]);

  useEffect(() => {
    let alive = true;
    setCargando(true);
    client.analytics(asignaturaId, dias)
      .then((d) => { if (alive) { setData(d); setFailed(false); } })
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setCargando(false));
    return () => { alive = false; };
  }, [client, asignaturaId, dias]);

  const orden = useMemo(() => ordenPanal(map?.hexes ?? []), [map]);
  const abrirTema = useCallback((id: string, el: HTMLElement) => { abridor.current = el; setTemaId(id); }, []);
  const cerrarTema = useCallback(() => { setTemaId(null); abridor.current?.focus(); }, []);

  if (failed && !data) return <ErrorCarga />;
  if (!data) return <p role="status" className="sr-only">{t("app.cargando")}</p>;

  const r = data.resumen;
  const est = estado(r.respondidas);
  const filas = <T extends { n: number; aciertos_pct: number | null }>(xs: T[], id: (x: T) => string, et: (x: T) => string, corto?: (x: T) => string): Fila[] =>
    xs.map((x) => ({ id: id(x), etiqueta: et(x), corto: corto?.(x), n: x.n, valor: x.aciertos_pct }));
  const conceptos = data.conceptos ?? [];
  const olvido = data.olvido?.temas.length ? data.olvido : null;
  const ps = pendientes(data.evolucion, orden);
  const c = conclusionesMas(data, ps);
  const celdas = semanasActividad(data.actividad, hoy, semanasDeRango(dias, data.actividad, hoy)).flat().filter((x) => !x.futura);
  const practicados = celdas.filter((x) => x.n > 0).length;
  const ritmos = data.fatiga.map((f) => f.ritmo ?? 0);
  const x1 = (v: number | null | undefined) => (v == null ? t("hist.sinDatos") : `×${(Math.round(v * 10) / 10).toString().replace(".", ",")}`);
  const detalle = temaId ? datosTema(data, temaId) : null;
  const antes = r.dominio_pct - r.dominio_delta;

  return (
    <main className="wrap hp" aria-busy={cargando}>
      <header className="hp-head">
        <h1>{t("hist.titulo")}</h1>
        <a className="hp-guardados" href="#guardados" aria-label={t("hist.guardados")}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2h9v12L8 10.8 3.5 14z" /></svg>
          <span>{t("hist.guardados")}</span>
        </a>
        <div className="hp-seg hp-range" role="group" aria-label={t("hist.rango")}>
          {RANGOS.map((d) => (
            <button key={d} type="button" aria-pressed={dias === d} onClick={() => setDias(d)}>{t(`hist.rango.${d}`)}</button>
          ))}
        </div>
      </header>

      {failed && <p role="alert" className="hp-banner">{t("app.error")}</p>}

      <div className={`hp-body ${cargando ? "is-loading" : ""}`}>
        {est === "vacio" ? (
          <section className="hp-empty" aria-labelledby="hp-vacio">
            <span className="hp-empty-hex"><Hexagon percent={0} color="var(--lila)" /></span>
            <div>
              <h2 id="hp-vacio">{t(dias ? "hist.vacioRango" : "hist.vacio")}</h2>
              <p>{t(dias ? "hist.vacioRangoTexto" : "hist.vacioTexto")}</p>
              {dias !== 0 && <button type="button" className="hp-btn" onClick={() => setDias(0)}>{t("hist.verTodo")}</button>}
              {dias === 0 && (
                <ul className="hp-preview" aria-label={t("hist.loQueVeras")}>
                  {["hist.actividad", "hist.evolucion", "hist.dificultad", "hist.horas", "hist.trampas", "hist.debiles"].map((k) => <li key={k}>{t(k)}</li>)}
                </ul>
              )}
            </div>
          </section>
        ) : (
          <>
            {est === "pocos" && (
              <p className="hp-banner" role="note">
                <i aria-hidden="true" />
                <span><b>{tn("hist.respuestas", r.respondidas)}.</b> {t("hist.pocosTexto").replace("{n}", String(MIN_N))}</span>
              </p>
            )}

            <section className={`hp-top${est === "pocos" ? " is-pocos" : ""}`} aria-label={t("hist.resumen")}>
              <div className="hp-top-main">
                <span className="hp-top-hex" aria-hidden="true">{r.dominio_pct} %</span>
                <div>
                  <h2>{est === "pocos" ? "Estás empezando" : titularDominio(r.dominio_delta, dias)}</h2>
                  <p>{est === "pocos"
                    ? `Con ${POCOS_DATOS} respuestas empezaremos a contarte qué se mueve.`
                    : `${t("hist.dominio")}.${r.dominio_delta !== 0 && dias !== 0 ? ` Antes estabas en el ${antes} %.` : ""}`}</p>
                </div>
              </div>
              <dl className="hp-top-datos">
                <div><dd>{r.respondidas}</dd><dt>{t(r.respondidas === 1 ? "hist.respuesta" : "hist.respuestas")}</dt></div>
                <div><dd>{pct(r.aciertos_pct)}</dd><dt>{t("hist.deAcierto")}</dt></div>
                <div><dd>{r.dias_estudiados}</dd><dt>{t(r.dias_estudiados === 1 ? "hist.diaConPractica" : "hist.diasConPractica")}</dt></div>
              </dl>
            </section>

            <div className="hp-main">
              <Bloque etiqueta="Constancia" titulo={`Practicaste ${practicados} de los últimos ${celdas.length} días`} sub={t("hist.actividadSub")}>
                <Actividad actividad={data.actividad} semanas={semanasDeRango(dias, data.actividad, hoy)} hoy={hoy} ampliable={dias === 0 && r.dias_estudiados >= 7} />
              </Bloque>

              {ps.length > 0 && (
                <Bloque etiqueta="Qué se mueve" titulo={titularMueve(ps)}
                  sub="Dominio de cada tema el primer día del periodo frente a hoy. En color los que se mueven más de 5 puntos; en gris los que se quedan. Toca un tema para ver su historia.">
                  <Mueve ps={ps} onAbrir={abrirTema} />
                  <p className="hp-mv-clave" aria-hidden="true"><span><i className="a" />antes</span><span><i className="h" />hoy</span></p>
                </Bloque>
              )}

              {olvido && (
                <Bloque etiqueta="Qué repasar" titulo={titularOlvido(olvido)} sub="Lo que recordarás de cada tema si no repasas, calculado con el ritmo al que olvidas cada concepto. La parte rayada es lo que perderías.">
                  <Repasar olvido={olvido} />
                </Bloque>
              )}

              <section className="hp-mas-an" aria-label="Más análisis">
                <h2>Más análisis</h2>
                <div className="hp-acc">
                  <Fila titulo="Más cifras" conclusion={c.cifras}>
                    <div className="hp-stats">
                      <Stat valor={segundos(r.tiempo_medio_s)} etiqueta={t("hist.tiempoMedio")} />
                      <Stat valor={r.mejor_hora === null ? t("hist.aunNo") : hora(r.mejor_hora)} etiqueta={t("hist.mejorHora")} nota={r.mejor_hora === null ? t("hist.mejorHoraFalta") : undefined} />
                      {r.retencion && <Stat valor={r.retencion.d1.pct === null ? t("hist.aunNo") : `${r.retencion.d1.pct} %${r.retencion.d7.pct === null ? "" : ` · ${r.retencion.d7.pct} %`}`}
                        etiqueta={t("hist.retencion")} nota={t("hist.retencionNota").replace("{n1}", String(r.retencion.d1.n)).replace("{n7}", String(r.retencion.d7.n))} />}
                      <Stat valor={r.sesiones} etiqueta={t(r.sesiones === 1 ? "hist.sesion" : "hist.sesiones")} />
                    </div>
                  </Fila>
                  <Fila titulo={t("hist.evolucion")} conclusion={c.evolucion}>
                    <p className="hp-det-sub">{t("hist.evolucionSub")}</p>
                    <Evolucion evolucion={data.evolucion} orden={orden} />
                  </Fila>
                  {c.duda && (
                    <Fila titulo="Lo que sabes y lo que se te escapa" conclusion={c.duda}>
                      <p className="hp-det-sub">Cada punto es un concepto con 3 o más respuestas. A la derecha de «lo esperado» tardas más de lo normal; por encima de la línea de 70 % aciertas. Pasa el ratón por un punto para ver cuál es.</p>
                      <Duda conceptos={conceptos} />
                    </Fila>
                  )}
                  {olvido && (
                    <Fila titulo="Curva de olvido" conclusion={c.olvido}>
                      <p className="hp-det-sub">Lo que recordarás de cada tema en los próximos 21 días si no repasas.</p>
                      <Olvido olvido={olvido} orden={orden} />
                    </Fila>
                  )}
                  <Fila titulo={t("hist.dificultad")} conclusion={c.dificultad}>
                    <Columnas titulo={t("hist.dificultad")} valores media={r.aciertos_pct}
                      filas={filas(data.dificultad, (x) => String(x.dificultad), (x) => `${t("hist.nivel")} ${x.dificultad}`, (x) => String(x.dificultad))} />
                  </Fila>
                  <Fila titulo={t("hist.velocidad")} conclusion={c.velocidad}>
                    <Barras titulo={t("hist.velocidad")} media={r.aciertos_pct} filas={filas(data.velocidad, (x) => x.tramo, (x) => x.tramo)} />
                  </Fila>
                  <Fila titulo={t("hist.horas")} conclusion={c.horas}>
                    <Columnas titulo={t("hist.horas")} media={r.aciertos_pct}
                      filas={filas(data.horas, (x) => String(x.hora), (x) => hora(x.hora), (x) => (x.hora % 3 === 0 ? String(x.hora) : ""))} />
                  </Fila>
                  <Fila titulo={t("hist.semana")} conclusion={c.semana}>
                    <Columnas titulo={t("hist.semana")} valores media={r.aciertos_pct}
                      filas={filas(data.semana, (x) => String(x.dia), (x) => DIAS[x.dia], (x) => DIAS_CORTOS[x.dia])} />
                  </Fila>
                  <Fila titulo={t("hist.fatiga")} conclusion={c.fatiga}>
                    <p className="hp-det-sub">{t("hist.fatigaSub")}</p>
                    <div className="hp-pair">
                      <div>
                        <h4>{t("hist.acierto")}</h4>
                        <Columnas titulo={`${t("hist.fatiga")}, ${t("hist.acierto")}`} valores alto={120} media={r.aciertos_pct}
                          filas={filas(data.fatiga, (x) => x.tramo, (x) => `${t("hist.preguntas")} ${x.tramo}`, (x) => x.tramo)} />
                      </div>
                      <div>
                        <h4>{t("hist.ritmo")}</h4>
                        <Columnas titulo={`${t("hist.fatiga")}, ${t("hist.ritmo")}`} valores alto={120} color="var(--indigo)"
                          max={Math.max(1, ...ritmos) * 1.15}
                          filas={data.fatiga.map((x) => ({ id: x.tramo, etiqueta: `${t("hist.preguntas")} ${x.tramo}`, corto: x.tramo, n: x.n, valor: x.ritmo ?? null, texto: x1(x.ritmo) }))} />
                      </div>
                    </div>
                  </Fila>
                  <Fila titulo={t("hist.trampas")} conclusion={c.trampas}>
                    <p className="hp-det-sub">{t("hist.trampasSub")}</p>
                    <Trampas trampas={data.trampas} />
                  </Fila>
                  {!!data.errores_escritura?.length && (
                    <Fila titulo={t("hist.erroresEscritura")} conclusion={c.escritura}>
                      <p className="hp-det-sub">{t("hist.erroresEscrituraSub")}</p>
                      <ErroresEscritura errores={data.errores_escritura} />
                    </Fila>
                  )}
                  <Fila titulo={t("hist.debiles")} conclusion={c.debiles}>
                    <p className="hp-det-sub">{t("hist.debilesSub")}</p>
                    <Debiles debiles={data.debiles} />
                  </Fila>
                  <Fila titulo={t("hist.dificiles")} conclusion={c.dificiles}>
                    <p className="hp-det-sub">{t("hist.dificilesSub")}</p>
                    <Dificiles dificiles={data.dificiles} />
                  </Fila>
                  <Fila titulo={t("hist.sesionesRecientes")} conclusion={c.sesiones}>
                    <p className="hp-det-sub">{t("hist.sesionesSub")}</p>
                    <TiraSesiones sesiones={data.sesiones_recientes} />
                    <Sesiones sesiones={data.sesiones_recientes} />
                  </Fila>
                </div>
                <p className="hp-key-low" aria-hidden="true"><i /> {t("hist.leyendaPocos").replace("{n}", String(MIN_N))}</p>
              </section>
            </div>
          </>
        )}
      </div>

      {detalle && <TemaDetalle datos={detalle} umbral={data.olvido?.umbral ?? 70} onCerrar={cerrarTema} />}
    </main>
  );
}
