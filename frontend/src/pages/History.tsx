import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Analytics, type MapResponse } from "../api";
import { Hexagon } from "../components/Hexagon";
import { Actividad } from "../components/historial/Actividad";
import { Barras, Columnas, type Fila } from "../components/historial/Barras";
import {
  DIAS, DIAS_CORTOS, estado, hora, MIN_N, mejorGrupo, ordenPanal, pct, pendientes, segundos, semanasDeRango, titularDuda, titularOlvido, titularPendientes, titularSesiones,
} from "../components/historial/datos";
import { Evolucion } from "../components/historial/Evolucion";
import { Duda } from "../components/historial/Duda";
import { Olvido } from "../components/historial/Olvido";
import { TiraSesiones } from "../components/historial/TiraSesiones";
import { Pendiente } from "../components/historial/Pendiente";
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

function Card({ id, titulo, sub, children, wide = false }: { id: string; titulo: string; sub?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`hp-card ${wide ? "is-wide" : ""}`} aria-labelledby={id}>
      <header className="hp-card-head">
        <h3 id={id}>{titulo}</h3>
        {sub && <p>{sub}</p>}
      </header>
      {children}
    </section>
  );
}

function Grupo({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section className="hp-group" aria-labelledby={id}>
      <h2 id={id} className="hp-group-h"><i aria-hidden="true" />{titulo}</h2>
      <div className="hp-grid">{children}</div>
    </section>
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

/** Historial como panel de análisis: todo lo que la app registra al responder, con el rango elegido. */
export function History({ asignaturaId, client = api, mes }: {
  asignaturaId: string; client?: Pick<typeof api, "analytics" | "getMap">; mes?: string;
}) {
  const [dias, setDias] = useState<Dias>(0);
  const [data, setData] = useState<Analytics | null>(null);
  const [map, setMap] = useState<MapResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [failed, setFailed] = useState(false);
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

  if (failed && !data) return <ErrorCarga />;
  if (!data) return <p role="status" className="sr-only">{t("app.cargando")}</p>;

  const r = data.resumen;
  const est = estado(r.respondidas);
  const filas = <T extends { n: number; aciertos_pct: number | null }>(xs: T[], id: (x: T) => string, et: (x: T) => string, corto?: (x: T) => string): Fila[] =>
    xs.map((x) => ({ id: id(x), etiqueta: et(x), corto: corto?.(x), n: x.n, valor: x.aciertos_pct }));
  const mejorDia = mejorGrupo(data.semana);
  const conceptos = data.conceptos ?? [];
  const tDuda = titularDuda(conceptos);
  const olvido = data.olvido?.temas.length ? data.olvido : null;
  const titularSes = titularSesiones(data.sesiones_recientes);
  const titular = titularPendientes(pendientes(data.evolucion, orden));
  // Composición en columnas: Evolución va con «pendiente»; si no hay, con el olvido (de dónde vienes | adónde vas); lo que quede suelto va ancho.
  const olvidoConEvolucion = !!olvido && !titular && !tDuda;
  const ritmos = data.fatiga.map((f) => f.ritmo ?? 0);
  const x1 = (v: number | null | undefined) => (v == null ? t("hist.sinDatos") : `×${(Math.round(v * 10) / 10).toString().replace(".", ",")}`);

  return (
    <main className="wrap hp" aria-busy={cargando}>
      <header className="hp-head">
        <div>
          {map && <span className="kicker">{map.asignatura}</span>}
          <h1>{t("hist.titulo")}</h1>
          <p className="lede">{t("hist.lede")}</p>
        </div>
        <a className="hp-guardados" href="#guardados">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2h9v12L8 10.8 3.5 14z" /></svg>
          {t("hist.guardados")}
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

            <section className="hp-summary" aria-label={t("hist.resumen")}>
              <div className="hp-hero">
                <span className="hp-hero-hex"><Hexagon percent={r.dominio_pct} color="var(--lila)" big /></span>
                <div>
                  <span className="hp-hero-l">{t("hist.dominio")}</span>
                  {r.dominio_delta !== 0 ? (
                    <span className={`hp-delta ${r.dominio_delta > 0 ? "up" : "down"}`}>
                      <span aria-hidden="true">{r.dominio_delta > 0 ? "▲" : "▼"}</span> {r.dominio_delta > 0 ? "+" : ""}{r.dominio_delta} {t("hist.puntos")}
                      <small> {t("hist.enElPeriodo")}</small>
                    </span>
                  ) : <span className="hp-delta">{t("hist.sinCambio")}</span>}
                </div>
              </div>
              <div className="hp-stats">
                <Stat valor={r.respondidas} etiqueta={t(r.respondidas === 1 ? "hist.respuesta" : "hist.respuestas")} />
                <Stat valor={pct(r.aciertos_pct)} etiqueta={t("hist.acierto")} />
                <Stat valor={r.dias_estudiados} etiqueta={t(r.dias_estudiados === 1 ? "hist.diaConPractica" : "hist.diasConPractica")} />
                <Stat valor={segundos(r.tiempo_medio_s)} etiqueta={t("hist.tiempoMedio")} />
                <Stat valor={r.mejor_hora === null ? t("hist.aunNo") : hora(r.mejor_hora)} etiqueta={t("hist.mejorHora")} nota={r.mejor_hora === null ? t("hist.mejorHoraFalta") : undefined} />
                {r.retencion && <Stat valor={r.retencion.d1.pct === null ? t("hist.aunNo") : `${r.retencion.d1.pct} %${r.retencion.d7.pct === null ? "" : ` · ${r.retencion.d7.pct} %`}`}
                  etiqueta={t("hist.retencion")} nota={t("hist.retencionNota").replace("{n1}", String(r.retencion.d1.n)).replace("{n7}", String(r.retencion.d7.n))} />}
                <Stat valor={r.sesiones} etiqueta={t(r.sesiones === 1 ? "hist.sesion" : "hist.sesiones")} />
              </div>
            </section>

            <p className="hp-key-low" aria-hidden="true"><i /> {t("hist.leyendaPocos").replace("{n}", String(MIN_N))}</p>

            <Grupo id="g-ritmo" titulo={t("hist.g.constancia")}>
              <Card id="c-act" titulo={t("hist.actividad")} sub={t("hist.actividadSub")} wide>
                <Actividad actividad={data.actividad} semanas={semanasDeRango(dias, data.actividad, hoy)} hoy={hoy} ampliable={dias === 0 && r.dias_estudiados >= 7} />
              </Card>
              <Card id="c-evo" titulo={t("hist.evolucion")} sub={t("hist.evolucionSub")} wide={!titular && !olvidoConEvolucion}>
                <Evolucion evolucion={data.evolucion} orden={orden} />
              </Card>
              {titular && (
                <Card id="c-pen" titulo={titular} sub="Dominio de cada tema el primer día del periodo frente a hoy. En color, los que se mueven más de 5 puntos; en gris, los que se estancan.">
                  <Pendiente evolucion={data.evolucion} orden={orden} />
                </Card>
              )}
              {olvido && olvidoConEvolucion && (
                <Card id="c-olv" titulo={titularOlvido(olvido)} sub="Lo que recordarás de cada tema en los próximos 21 días si no repasas, calculado con el ritmo al que olvidas cada concepto.">
                  <Olvido olvido={olvido} orden={orden} />
                </Card>
              )}
            </Grupo>

            <Grupo id="g-acierto" titulo={t("hist.g.acierto")}>
              <Card id="c-dif" titulo={t("hist.dificultad")} sub={t("hist.dificultadSub")}>
                <Columnas titulo={t("hist.dificultad")} valores media={r.aciertos_pct}
                  filas={filas(data.dificultad, (x) => String(x.dificultad), (x) => `${t("hist.nivel")} ${x.dificultad}`, (x) => String(x.dificultad))} />
              </Card>
              <Card id="c-vel" titulo={t("hist.velocidad")} sub={t("hist.velocidadSub")}>
                <Barras titulo={t("hist.velocidad")} media={r.aciertos_pct}
                  filas={filas(data.velocidad, (x) => x.tramo, (x) => x.tramo)} />
              </Card>
            </Grupo>

            {(tDuda || (olvido && !olvidoConEvolucion)) && (
              <Grupo id="g-memoria" titulo="Qué sabes y qué se te escapa">
                {tDuda && (
                  <Card id="c-duda" titulo={tDuda} sub="Cada punto es un concepto con 3 o más respuestas. A la derecha de «lo esperado» tardas más de lo normal; por encima de la línea de 70 % aciertas. Pasa el ratón por un punto para ver cuál es." wide={!olvido}>
                    <Duda conceptos={conceptos} />
                  </Card>
                )}
                {olvido && !olvidoConEvolucion && (
                  <Card id="c-olv" titulo={titularOlvido(olvido)} sub="Lo que recordarás de cada tema en los próximos 21 días si no repasas, calculado con el ritmo al que olvidas cada concepto." wide={!tDuda}>
                    <Olvido olvido={olvido} orden={orden} />
                  </Card>
                )}
              </Grupo>
            )}

            <Grupo id="g-cuando" titulo={t("hist.g.cuando")}>
              <Card id="c-hora" titulo={t("hist.horas")} sub={r.mejor_hora === null ? t("hist.horasSub") : `${t("hist.mejorHoraTexto")} ${hora(r.mejor_hora)}.`}>
                <Columnas titulo={t("hist.horas")} media={r.aciertos_pct}
                  filas={filas(data.horas, (x) => String(x.hora), (x) => hora(x.hora), (x) => (x.hora % 3 === 0 ? String(x.hora) : ""))} />
              </Card>
              <Card id="c-sem" titulo={t("hist.semana")} sub={mejorDia ? `${t("hist.mejorDiaTexto")} ${DIAS[mejorDia.dia]}.` : t("hist.horasSub")}>
                <Columnas titulo={t("hist.semana")} valores media={r.aciertos_pct}
                  filas={filas(data.semana, (x) => String(x.dia), (x) => DIAS[x.dia], (x) => DIAS_CORTOS[x.dia])} />
              </Card>
            </Grupo>

            <Grupo id="g-sesion" titulo={t("hist.g.sesion")}>
              <Card id="c-fat" titulo={t("hist.fatiga")} sub={t("hist.fatigaSub")} wide>
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
              </Card>
            </Grupo>

            <Grupo id="g-fallos" titulo={t("hist.g.fallos")}>
              <Card id="c-tra" titulo={t("hist.trampas")} sub={t("hist.trampasSub")}><Trampas trampas={data.trampas} /></Card>
              {!!data.errores_escritura?.length && (
                <Card id="c-esc" titulo={t("hist.erroresEscritura")} sub={t("hist.erroresEscrituraSub")}><ErroresEscritura errores={data.errores_escritura} /></Card>
              )}
              <Card id="c-deb" titulo={t("hist.debiles")} sub={t("hist.debilesSub")}><Debiles debiles={data.debiles} /></Card>
              <Card id="c-difi" titulo={t("hist.dificiles")} sub={t("hist.dificilesSub")} wide={!data.errores_escritura?.length}> {/* sin errores de escritura quedan 3 tarjetas: la última ocupa el ancho para no dejar un hueco */}<Dificiles dificiles={data.dificiles} /></Card>
              <Card id="c-ses" titulo={titularSes || t("hist.sesionesRecientes")} sub={t("hist.sesionesSub")} wide>
                <TiraSesiones sesiones={data.sesiones_recientes} />
                <Sesiones sesiones={data.sesiones_recientes} />
              </Card>
            </Grupo>
          </>
        )}
      </div>
    </main>
  );
}
