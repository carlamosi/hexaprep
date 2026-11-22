// Agregados de presentación del historial: todo lo que se decide antes de pintar (sin React).
import type { Analytics, Hex, Serie } from "../../api";
import { t } from "../../i18n";
import { colorTema } from "../../colorTema";
import { group } from "../HexMap";
import { sinPrefijoTema } from "../../rotulo";

/** Por debajo de este n un porcentaje engaña: la marca se atenúa y lo dice. */
export const MIN_N = 5;
/** Por debajo de estas respuestas en total, el historial avisa de que las cifras aún bailan. */
export const POCOS_DATOS = 30;

export type Estado = "vacio" | "pocos" | "normal";
export const estado = (respondidas: number): Estado => (respondidas === 0 ? "vacio" : respondidas < POCOS_DATOS ? "pocos" : "normal");
export const fiable = (n: number) => n >= MIN_N;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const DIAS_CORTOS = ["L", "M", "X", "J", "V", "S", "D"];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const deIso = (f: string) => { const [y, m, d] = f.split("-").map(Number); return new Date(y, m - 1, d); };

export const fechaCorta = (f: string) => { const d = deIso(f); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
export const fechaLarga = (f: string) => { const d = deIso(f); return `${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}`; };
export const hora = (h: number) => `${String(h).padStart(2, "0")}:00`;
export const pct = (p: number | null) => (p === null ? t("hist.sinDatos") : `${p} %`);
export const segundos = (s: number | null) => (s === null ? t("hist.sinDatos") : `${String(Math.round(s * 10) / 10).replace(".", ",")} s`);
export function duracion(s: number): string {
  const m = Math.round(s / 60);
  return m < 1 ? t("hist.menosDeUnMin") : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
export const respuestas = (n: number) => `${n} ${t(n === 1 ? "hist.respuesta" : "hist.respuestas")}`;

// ---------- Mapa de calor de actividad ----------

export interface Celda { fecha: string; n: number; aciertos: number; nivel: 0 | 1 | 2 | 3 | 4; futura: boolean }

/** Semanas (lunes a domingo) que acaban en la de `hoy`. Intensidad por cuartos del día con más preguntas. */
export function semanasActividad(actividad: Analytics["actividad"], hoy: Date, semanas: number): Celda[][] {
  const por = new Map(actividad.map((a) => [a.fecha, a]));
  const max = Math.max(0, ...actividad.map((a) => a.n));
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7) - 7 * (semanas - 1));
  const hoyIso = iso(hoy);
  return Array.from({ length: semanas }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const f = iso(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + w * 7 + d));
      const a = por.get(f);
      const n = a?.n ?? 0;
      const nivel = (n === 0 ? 0 : Math.min(4, Math.ceil((4 * n) / max))) as Celda["nivel"];
      return { fecha: f, n, aciertos: a?.aciertos ?? 0, nivel, futura: f > hoyIso };
    }));
}

/** Cuántas semanas enseña el mapa según el rango; con «todo», desde la primera práctica (entre 12 y 26). */
export function semanasDeRango(dias: 0 | 7 | 30, actividad: Analytics["actividad"], hoy: Date): number {
  if (dias === 7) return 2;
  if (dias === 30) return 5;
  if (!actividad.length) return 12;
  const dif = (hoy.getTime() - deIso(actividad[0].fecha).getTime()) / 864e5;
  return Math.max(12, Math.min(26, Math.ceil((dif + 7) / 7)));
}

// ---------- Evolución del dominio ----------

export type Vista = { nivel: "asignatura" } | { nivel: "temas" } | { nivel: "subtemas"; temaId: string };
export interface Linea { id: string; nombre: string; color: string; trazo?: string; puntos: Serie[] }

export const DASH = [undefined, "7 4", "2 4", "10 4 2 4", "1 6"];

/**
 * Orden y color de temas y subtemas tal como los pinta el panal (orden del mapa), para que
 * un tema tenga el mismo color aquí y en la portada aunque la analítica los devuelva en otro orden.
 */
export function ordenPanal(hexes: Hex[]) {
  const temas = new Map<string, { color: string; indice: number; subtemas: Map<string, number> }>();
  const grupos = group(hexes);
  grupos.forEach((t, ti) => temas.set(t.id, {
    color: colorTema(hexes[0]?.color ?? "", ti, grupos.length), indice: ti, subtemas: new Map(t.subtemas.map((s, si) => [s.id, si])),
  }));
  return temas;
}

const subTone = (color: string, si: number) => (si === 0 ? color : `color-mix(in srgb, ${color} ${Math.max(40, 100 - si * 16)}%, var(--card))`);

export function lineas(evo: Analytics["evolucion"], vista: Vista, orden: ReturnType<typeof ordenPanal>): Linea[] {
  const pos = (id: string) => orden.get(id)?.indice ?? 99;
  const temas = [...evo.temas].sort((a, b) => pos(a.tema_id) - pos(b.tema_id));
  if (vista.nivel === "asignatura") return [{ id: "asignatura", nombre: t("hist.vistaAsignatura"), color: "var(--lila)", puntos: evo.asignatura }];
  if (vista.nivel === "temas") {
    return temas.map((x) => ({ id: x.tema_id, nombre: sinPrefijoTema(x.tema), color: orden.get(x.tema_id)?.color ?? "var(--ink-3)", puntos: x.puntos }));
  }
  const tema = temas.find((x) => x.tema_id === vista.temaId);
  if (!tema) return [];
  const o = orden.get(tema.tema_id);
  const color = o?.color ?? "var(--ink-3)";
  const si = (id: string) => o?.subtemas.get(id) ?? 99;
  return [...tema.subtemas].sort((a, b) => si(a.subtema_id) - si(b.subtema_id)).map((s, k) => ({
    id: s.subtema_id, nombre: s.subtema, color: subTone(color, k), trazo: DASH[k % DASH.length], puntos: s.puntos,
  }));
}

// ---------- Pendiente por tema (antes y después) ----------

/** Un cambio menor que esto es ruido: el tema «se estanca». */
export const UMBRAL_CAMBIO = 5;
export interface Pendiente { id: string; nombre: string; color: string; antes: number; ahora: number; delta: number; desde: string; hasta: string }

/** Primer y último dominio de cada tema en el periodo, de más a menos subida. Sin dos días distintos no hay pendiente. */
export function pendientes(evo: Analytics["evolucion"], orden: ReturnType<typeof ordenPanal>): Pendiente[] {
  return evo.temas.flatMap((x) => {
    const a = x.puntos[0], b = x.puntos[x.puntos.length - 1];
    if (!a || !b || a.fecha === b.fecha) return [];
    return [{ id: x.tema_id, nombre: sinPrefijoTema(x.tema), color: orden.get(x.tema_id)?.color ?? "var(--ink-3)",
      antes: a.percent, ahora: b.percent, delta: b.percent - a.percent, desde: a.fecha, hasta: b.fecha }];
  }).sort((p, q) => q.delta - p.delta);
}

const puntos = (n: number) => `${Math.abs(n)} puntos`;
/** La conclusión en una frase: quién sube, y quién baja o se estanca. */
export function titularPendientes(ps: Pendiente[]): string {
  if (!ps.length) return "";
  const sube = ps[0].delta >= UMBRAL_CAMBIO ? ps[0] : null;
  const peor = ps[ps.length - 1];
  const otro = peor !== sube ? peor : null;
  const partes = [
    sube && `${sube.nombre} sube ${puntos(sube.delta)}`,
    otro && (otro.delta <= -UMBRAL_CAMBIO ? `${otro.nombre} baja ${puntos(otro.delta)}` : sube && `${otro.nombre} se estanca`),
  ].filter(Boolean);
  return partes.length ? partes.join(" y ") : `Ningún tema se ha movido más de ${UMBRAL_CAMBIO} puntos`;
}

// ---------- Tira de sesiones ----------

type SesionResumen = Analytics["sesiones_recientes"][number];
const acierto = (xs: SesionResumen[]) => (100 * xs.reduce((a, s) => a + s.aciertos, 0)) / xs.reduce((a, s) => a + s.n, 0);

/** Conclusión: las sesiones más largas (mitad de arriba por duración) frente a las cortas. Con menos de 4 sesiones, nada. */
export function titularSesiones(ses: SesionResumen[]): string {
  const xs = ses.filter((s) => fiable(s.n)).sort((a, b) => a.duracion_s - b.duracion_s);
  if (xs.length < 4) return "";
  const m = Math.floor(xs.length / 2);
  const dif = Math.round(acierto(xs.slice(xs.length - m)) - acierto(xs.slice(0, m)));
  if (Math.abs(dif) < 10) return "Rindes parecido dure lo que dure la sesión";
  return dif < 0 ? `Tus sesiones largas acaban ${-dif} puntos peor que las cortas` : `Tus sesiones largas te salen ${dif} puntos mejor que las cortas`;
}

// ---------- Dudo frente a no sé ----------

export type Concepto = Analytics["conceptos"][number];
export type Cuadrante = "dominado" | "duda" | "descuido" | "nosabe";
/** Acierto mínimo para decir que «lo sabes», y ritmo (1 = el tiempo esperado) a partir del cual vas lento. */
export const ACIERTO_SABE = 70;
export const RITMO_LENTO = 1;

export function cuadrante(c: Concepto): Cuadrante {
  const acierta = (c.aciertos_pct ?? 0) >= ACIERTO_SABE, lento = c.ritmo > RITMO_LENTO;
  return acierta ? (lento ? "duda" : "dominado") : lento ? "nosabe" : "descuido";
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** La conclusión: el cuadrante problemático más poblado. Con menos de 4 conceptos no hay patrón. */
export function titularDuda(cs: Concepto[]): string {
  if (cs.length < 4) return "";
  const n = (q: Cuadrante) => cs.filter((c) => cuadrante(c) === q).length;
  const [ns, du, de] = [n("nosabe"), n("duda"), n("descuido")];
  const max = Math.max(ns, du, de);
  if (!max) return "Aciertas con soltura todos tus conceptos";
  if (max === ns) return `${plural(ns, "concepto aún no lo sabes", "conceptos aún no los sabes")}: tardas y fallas`;
  if (max === du) return `${plural(du, "concepto lo aciertas", "conceptos los aciertas")}, pero con duda`;
  return `${plural(de, "concepto lo fallas", "conceptos los fallas")} yendo deprisa: lee con calma`;
}

// ---------- Curva de olvido ----------

export type Olvido = Analytics["olvido"];
export function titularOlvido(o: Olvido): string {
  const cuantos = (n: number) => plural(n, "concepto bajará", "conceptos bajarán");
  if (o.cruzan_7) return `En 7 días ${cuantos(o.cruzan_7)} del ${o.umbral} %`;
  if (o.cruzan_14) return `En 14 días ${cuantos(o.cruzan_14)} del ${o.umbral} %`;
  if (o.ya_bajo) return `${plural(o.ya_bajo, "concepto ya está", "conceptos ya están")} por debajo del ${o.umbral} %: repásalos hoy`;
  return `Tu memoria aguanta tres semanas por encima del ${o.umbral} %`;
}

/** El grupo con mejor acierto entre los que tienen respuestas suficientes. */
export function mejorGrupo<T extends { n: number; aciertos_pct: number | null }>(xs: T[]): T | null {
  const ok = xs.filter((x) => fiable(x.n) && x.aciertos_pct !== null);
  return ok.length ? ok.reduce((a, b) => (b.aciertos_pct! > a.aciertos_pct! ? b : a)) : null;
}

export const modo = (m: string) => t(`hist.modo.${m}`);
