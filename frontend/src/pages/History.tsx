import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Analytics, type MapResponse } from "../api";
import { Hexagon } from "../components/Hexagon";
import { Actividad } from "../components/historial/Actividad";
import { Barras, Columnas, type Fila } from "../components/historial/Barras";
import {
  DIAS, DIAS_CORTOS, estado, hora, MIN_N, mejorGrupo, ordenPanal, pct, segundos, semanasDeRango,
} from "../components/historial/datos";
import { Evolucion } from "../components/historial/Evolucion";
import { Debiles, Dificiles, Sesiones, Trampas } from "../components/historial/Listas";
import "../components/historial/historial.css";
import { t, tn } from "../i18n";

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

  if (failed && !data) return <p role="alert" className="px-4 py-8">{t("app.error")}</p>;
  if (!data) return <p role="status" className="px-4 py-8 text-[var(--ink-3)]">{t("app.cargando")}</p>;

  const r = data.resumen;
  const est = estado(r.respondidas);
  const filas = <T extends { n: number; aciertos_pct: number | null }>(xs: T[], id: (x: T) => string, et: (x: T) => string, corto?: (x: T) => string): Fila[] =>
    xs.map((x) => ({ id: id(x), etiqueta: et(x), corto: corto?.(x), n: x.n, valor: x.aciertos_pct }));
  const mejorDia = mejorGrupo(data.semana);
  const tiempos = data.fatiga.map((f) => f.tiempo_medio_s ?? 0);

  return (
    <main className="wrap hp" aria-busy={cargando}>
      <header className="hp-head">
        <div>
          {map && <span className="kicker">{map.asignatura}</span>}
          <h1>{t("hist.titulo")}</h1>
          <p className="lede">{t("hist.lede")}</p>
        </div>
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
                <Stat valor={r.sesiones} etiqueta={t(r.sesiones === 1 ? "hist.sesion" : "hist.sesiones")} />
              </div>
            </section>

            <p className="hp-key-low" aria-hidden="true"><i /> {t("hist.leyendaPocos").replace("{n}", String(MIN_N))}</p>

            <Grupo id="g-ritmo" titulo={t("hist.g.constancia")}>
              <Card id="c-act" titulo={t("hist.actividad")} sub={t("hist.actividadSub")} wide>
                <Actividad actividad={data.actividad} semanas={semanasDeRango(dias, data.actividad, hoy)} hoy={hoy} ampliable={dias === 0 && r.dias_estudiados >= 7} />
              </Card>
              <Card id="c-evo" titulo={t("hist.evolucion")} sub={t("hist.evolucionSub")} wide>
                <Evolucion evolucion={data.evolucion} orden={orden} />
              </Card>
            </Grupo>

            <Grupo id="g-acierto" titulo={t("hist.g.acierto")}>
              <Card id="c-dif" titulo={t("hist.dificultad")} sub={t("hist.dificultadSub")}>
                <Columnas titulo={t("hist.dificultad")} valores media={r.aciertos_pct}
                  filas={filas(data.dificultad, (x) => String(x.dificultad), (x) => `${t("hist.nivel")} ${x.dificultad}`, (x) => String(x.dificultad))} />
              </Card>
            </Grupo>

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
              <Card id="c-fat" titulo={t("hist.fatiga")} sub={t("hist.fatigaSub")}>
                <div className="hp-pair">
                  <div>
                    <h4>{t("hist.acierto")}</h4>
                    <Columnas titulo={`${t("hist.fatiga")}, ${t("hist.acierto")}`} valores alto={120} media={r.aciertos_pct}
                      filas={filas(data.fatiga, (x) => x.tramo, (x) => `${t("hist.preguntas")} ${x.tramo}`, (x) => x.tramo)} />
                  </div>
                  <div>
                    <h4>{t("hist.tiempoMedio")}</h4>
                    <Columnas titulo={`${t("hist.fatiga")}, ${t("hist.tiempoMedio")}`} valores alto={120} color="var(--indigo)"
                      max={Math.max(1, ...tiempos) * 1.15}
                      filas={data.fatiga.map((x) => ({ id: x.tramo, etiqueta: `${t("hist.preguntas")} ${x.tramo}`, corto: x.tramo, n: x.n, valor: x.tiempo_medio_s, texto: segundos(x.tiempo_medio_s) }))} />
                  </div>
                </div>
              </Card>
              <Card id="c-vel" titulo={t("hist.velocidad")} sub={t("hist.velocidadSub")}>
                <Barras titulo={t("hist.velocidad")} media={r.aciertos_pct}
                  filas={filas(data.velocidad, (x) => x.tramo, (x) => x.tramo)} />
              </Card>
            </Grupo>

            <Grupo id="g-fallos" titulo={t("hist.g.fallos")}>
              <Card id="c-tra" titulo={t("hist.trampas")} sub={t("hist.trampasSub")}><Trampas trampas={data.trampas} /></Card>
              <Card id="c-deb" titulo={t("hist.debiles")} sub={t("hist.debilesSub")}><Debiles debiles={data.debiles} /></Card>
              <Card id="c-difi" titulo={t("hist.dificiles")} sub={t("hist.dificilesSub")}><Dificiles dificiles={data.dificiles} /></Card>
              <Card id="c-ses" titulo={t("hist.sesionesRecientes")} sub={t("hist.sesionesSub")}><Sesiones sesiones={data.sesiones_recientes} /></Card>
            </Grupo>
          </>
        )}
      </div>
    </main>
  );
}
