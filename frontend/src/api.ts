// Cliente tipado de la API local (backend/hexaprep/api.py). Mismo origen; en desarrollo Vite hace de proxy.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export type Letra = "a" | "b" | "c" | "d";
export type Confianza = "seguro" | "dudo" | "adivino";
export type Modo = "nivel" | "practica" | "repaso_subtema" | "repaso_fallos";

export interface Filtro {
  asignatura_id: string;
  tema_id?: string;
  subtema_id?: string;
  solo_fallos?: boolean;
}

export interface Subject { id: string; nombre: string; idioma: string; color: string; acento: string; percent: number }
export interface Hex {
  concepto_id: string; nombre: string; subtema_id: string; subtema: string; tema: string; color: string; percent: number;
}
export interface MapResponse {
  asignatura: string; percent: number; hexes: Hex[]; subtemas: { id: string; nombre: string; percent: number }[];
}
export interface Question {
  pregunta_id: string; concepto_id: string; subtema_id: string; enunciado: string;
  opciones: { letra: Letra; texto: string }[]; orden: Letra[]; dificultad: number;
  ayuda_larga: string | null; fuente_id: string | null; fuente_pagina: number | null; fuente_cara: number | null;
}
export interface SessionState { sesion_id: string; modo: Modo; filtro: Record<string, unknown>; respondidas: string[]; pendiente: string | null }
export interface AnswerBody {
  sesion_id: string; pregunta_id: string; orden_opciones: Letra[]; elegida: Letra;
  confianza?: Confianza | null; tiempos?: Record<string, number>;
}
export interface AnswerResult {
  correcta: boolean; opcion_correcta: Letra; trampa: string | null; explicacion: string | null;
  trampas: Partial<Record<Letra, string>>; fuente_id: string | null; fuente_pagina: number | null;
  fuente_cara: number | null; percent: number;
}
export interface Suggestion {
  tipo: "concepto" | "placement"; concepto_id: string | null; concepto: string | null; subtema_id: string | null;
  motivo: string; ganancia_por_minuto: number; riesgo_olvido: number; score: number;
}
export interface History {
  dias: string[];
  evolucion: { subtema_id: string; subtema: string; puntos: { fecha: string; percent: number }[] }[];
}
export interface BackupRow { ruta: string; verificada: boolean; n_eventos: number; fecha: string }

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(path, init);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data && typeof data.detail === "string" ? data.detail : `Error ${res.status}`;
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

export const api = {
  getSubjects: () => request<Subject[]>("/api/subjects"),
  getMap: (asignaturaId: string) => request<MapResponse>(`/api/map/${asignaturaId}`),
  createSession: (modo: Modo, filtro: Filtro) =>
    request<{ sesion_id: string; aviso: string | null }>("/api/sessions", "POST", { modo, filtro }),
  getSession: (id: string) => request<SessionState>(`/api/sessions/${id}`),
  nextQuestion: (id: string) => request<Question | null>(`/api/sessions/${id}/next`),
  answer: (body: AnswerBody) => request<AnswerResult>("/api/answers", "POST", body),
  reportQuestion: (id: string, motivo: string, sesionId?: string) =>
    request<{ ok: boolean }>(`/api/questions/${id}/report`, "POST", { motivo, sesion_id: sesionId ?? null }),
  editQuestion: (id: string, cambios: Record<string, unknown>) =>
    request<{ version: number }>(`/api/questions/${id}`, "PUT", cambios),
  suggestions: () => request<Suggestion[]>("/api/suggestions"),
  history: () => request<History>("/api/history"),
  getBackup: () => request<BackupRow | null>("/api/backup"),
  makeBackup: () => request<BackupRow>("/api/backup", "POST"),
  restoreBackup: (ruta: string) => request<{ ok: boolean }>("/api/restore", "POST", { ruta }),
  exportWeak: (n = 20) => request<{ ruta: string }>("/api/export/weak", "POST", { n }),
  exportEvents: () => request<{ ruta: string }>("/api/export/events", "POST"),
  exportBank: (asignaturaId: string) => request<{ ruta: string }>(`/api/export/bank/${asignaturaId}`, "POST"),
  importBank: (ruta: string) => request<{ created: number; updated: number; unchanged: number }>("/api/import", "POST", { ruta }),
};

/** URL del PDF del booklet, abierto en la cara indicada. */
export function bookletUrl(fuenteId: string, cara?: number | null): string {
  return `/api/booklet/${fuenteId}${cara ? `#page=${cara}` : ""}`;
}
