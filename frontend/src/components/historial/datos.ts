// Agregados de presentación del historial: todo lo que se decide antes de pintar (sin React).
import type { Analytics, Hex, Serie } from "../../api";
import { t } from "../../i18n";
import { group, TEMA_COLORS } from "../HexMap";

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
  group(hexes).forEach((t, ti) => temas.set(t.id, {
    color: TEMA_COLORS[ti % TEMA_COLORS.length], indice: ti, subtemas: new Map(t.subtemas.map((s, si) => [s.id, si])),
  }));
  return temas;
}

const subTone = (color: string, si: number) => (si === 0 ? color : `color-mix(in srgb, ${color} ${Math.max(40, 100 - si * 16)}%, #fff)`);

export function lineas(evo: Analytics["evolucion"], vista: Vista, orden: ReturnType<typeof ordenPanal>): Linea[] {
  const pos = (id: string) => orden.get(id)?.indice ?? 99;
  const temas = [...evo.temas].sort((a, b) => pos(a.tema_id) - pos(b.tema_id));
  if (vista.nivel === "asignatura") return [{ id: "asignatura", nombre: t("hist.vistaAsignatura"), color: "var(--lila)", puntos: evo.asignatura }];
  if (vista.nivel === "temas") {
    return temas.map((x, i) => ({ id: x.tema_id, nombre: x.tema, color: orden.get(x.tema_id)?.color ?? TEMA_COLORS[i % TEMA_COLORS.length], puntos: x.puntos }));
  }
  const tema = temas.find((x) => x.tema_id === vista.temaId);
  if (!tema) return [];
  const o = orden.get(tema.tema_id);
  const color = o?.color ?? TEMA_COLORS[0];
  const si = (id: string) => o?.subtemas.get(id) ?? 99;
  return [...tema.subtemas].sort((a, b) => si(a.subtema_id) - si(b.subtema_id)).map((s, k) => ({
    id: s.subtema_id, nombre: s.subtema, color: subTone(color, k), trazo: DASH[k % DASH.length], puntos: s.puntos,
  }));
}

// ---------- Calibración de la confianza ----------

/** Una frase que lee la calibración; solo opina cuando los grupos tienen respuestas suficientes. */
export function lecturaCalibracion(c: Analytics["confianza"]): string {
  const g = (k: string) => c.find((x) => x.confianza === k);
  const seguro = g("seguro");
  const dudas = [g("dudo"), g("adivino")].filter((x) => x && fiable(x.n) && x.aciertos_pct !== null);
  if (!seguro || !fiable(seguro.n) || seguro.aciertos_pct === null) return t("hist.cal.pocas");
  const s = seguro.aciertos_pct;
  const peor = dudas.length ? Math.max(...dudas.map((x) => x!.aciertos_pct!)) : null;
  if (peor !== null && s <= peor) return t("hist.cal.igual").replace("{p} %", `${s} %`);
  if (s >= 80) return t("hist.cal.bien").replace("{p} %", `${s} %`);
  return t("hist.cal.exceso").replace("{p} %", `${s} %`);
}

/** El grupo con mejor acierto entre los que tienen respuestas suficientes. */
export function mejorGrupo<T extends { n: number; aciertos_pct: number | null }>(xs: T[]): T | null {
  const ok = xs.filter((x) => fiable(x.n) && x.aciertos_pct !== null);
  return ok.length ? ok.reduce((a, b) => (b.aciertos_pct! > a.aciertos_pct! ? b : a)) : null;
}

export const modo = (m: string) => t(`hist.modo.${m}`);
