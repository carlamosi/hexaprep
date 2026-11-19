// Cliente tipado de la API local (backend/hexaprep/api.py). Mismo origen; en desarrollo Vite hace de proxy.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export type Letra = "a" | "b" | "c" | "d";
export type Confianza = "seguro" | "dudo" | "adivino";
export type Modo = "practica" | "repaso_subtema" | "repaso_fallos";

export interface Filtro {
  asignatura_id: string;
  tema_id?: string;
  subtema_id?: string;
  solo_fallos?: boolean;
  /** test, vf, problema; sin indicar, todos. */
  tipos?: string[];
}

export interface Subject { id: string; nombre: string; idioma: string; color: string; acento: string; percent: number; tipos?: string[] }
export interface Hex {
  concepto_id: string; nombre: string; subtema_id: string; subtema: string; tema: string; tema_id: string; color: string; percent: number;
}
export interface MapResponse {
  asignatura: string; percent: number; hexes: Hex[]; subtemas: { id: string; nombre: string; percent: number }[];
}
export interface Question {
  pregunta_id: string; concepto_id: string; subtema_id: string; enunciado: string;
  opciones: { letra: Letra; texto: string }[]; orden: Letra[]; dificultad: number;
  ayuda_larga: string | null; fuente_id: string | null; fuente_pagina: number | null; fuente_cara: number | null;
  tema?: string; subtema?: string; tipo?: "test" | "vf" | "problema" | "escrita";
  /** Imagen del enunciado (ruta relativa a banks/<asignatura>/img/) y datos de un problema con apartados. */
  imagen?: string | null; grupo?: string | null; contexto?: string | null; apartado?: string | null;
  /** Solo escritas: la etiqueta de cada hueco (Gerundi, Participi...). */
  campos?: string[];
  /** Repetición de una escrita que acabas de fallar. */
  reintento?: boolean;
}
export interface SessionState { sesion_id: string; modo: Modo; filtro: Record<string, unknown>; respondidas: string[]; pendiente: string | null }
export interface AnswerBody {
  sesion_id: string; pregunta_id: string; orden_opciones: Letra[]; elegida: Letra;
  confianza?: Confianza | null; tiempos?: Record<string, number>;
  /** Solo problemas: el número escrito, sin unidades. */
  respuesta?: string;
  /** Solo escritas: un texto por hueco. */
  respuestas?: string[];
}
export interface AnswerResult {
  correcta: boolean; opcion_correcta: Letra; trampa: string | null; explicacion: string | null;
  trampas: Partial<Record<Letra, string>>; fuente_id: string | null; fuente_pagina: number | null;
  fuente_cara: number | null; percent: number;
  /** Solo problemas: la solución numérica. */
  solucion?: number | number[] | null;
  /** Solo escritas: acierto, formas válidas y pista de cada hueco. */
  campos?: { etiqueta: string; correcto: boolean; esperado: string[]; nota: string | null }[] | null;
}
export interface PerfilDatos { email: string | null; nombre: string; online: boolean; reiniciar: boolean }
export interface Examen {
  fecha: string | null; dias: number | null; por_dia: number | null; total: number; tocados: number; sin_tocar: number;
}
export interface Nota { fecha: string; nota: number; dominio: number }
export interface Suggestion {
  tipo: "concepto" | "placement"; concepto_id: string | null; concepto: string | null; subtema_id: string | null;
  motivo: string; ganancia_por_minuto: number; riesgo_olvido: number; score: number;
}
export interface History {
  dias: string[];
  evolucion: { subtema_id: string; subtema: string; puntos: { fecha: string; percent: number }[] }[];
}
/** Un grupo de respuestas: cuántas hay (n) y qué % acertó (null si n es 0). */
export interface Grupo { n: number; aciertos_pct: number | null }
export interface Serie { fecha: string; percent: number }
export interface Analytics {
  resumen: {
    respondidas: number; aciertos_pct: number | null; dias_estudiados: number; tiempo_medio_s: number | null; ritmo?: number | null;
    mejor_hora: number | null; sesiones: number; dominio_pct: number; dominio_delta: number;
  };
  actividad: { fecha: string; n: number; aciertos: number }[];
  evolucion: {
    asignatura: Serie[];
    temas: { tema_id: string; tema: string; puntos: Serie[]; subtemas: { subtema_id: string; subtema: string; puntos: Serie[] }[] }[];
  };
  confianza: (Grupo & { confianza: Confianza | "sin" })[];
  horas: (Grupo & { hora: number })[];
  semana: (Grupo & { dia: number })[];
  fatiga: (Grupo & { tramo: string; desde: number; tiempo_medio_s: number | null; ritmo?: number | null })[];
  velocidad: (Grupo & { tramo: string })[];
  dificultad: (Grupo & { dificultad: number })[];
  trampas: { trampa: string; n: number; concepto: string }[];
  debiles: (Grupo & { concepto_id: string; concepto: string; subtema: string; percent: number })[];
  dificiles: { pregunta_id: string; enunciado: string; n: number; fallos: number }[];
  sesiones_recientes: { sesion_id: string; modo: Modo; inicio: string; duracion_s: number; n: number; aciertos: number }[];
}
export interface QuestionContent {
  pregunta_id: string; version: number; excluida: boolean; enunciado: string;
  opciones: { texto: string; trampa?: string | null }[]; correcta: Letra; explicacion: string;
  ayuda_larga: string; dificultad: number; fuente_pagina: number; fuente_cara: number;
}
export interface ReportedQuestion { pregunta_id: string; enunciado: string; motivo: string | null }
export type Alcance = "pregunta" | "concepto" | "tema";
export interface Oculto { id: string; alcance: Alcance; nombre: string; claves: string[] }
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
    if (res.status === 401 && !path.startsWith("/api/auth/")) window.location.reload(); // la sesión caducó: vuelve a la entrada
    const detail = data && typeof data.detail === "string" ? data.detail : `Error ${res.status}`;
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

export const api = {
  getPerfil: () => request<PerfilDatos>("/api/perfil"),
  reiniciarPerfil: () => request<{ archivado: string }>("/api/perfil/reiniciar", "POST", { confirmar: true }),
  getExamen: (asignaturaId: string) => request<Examen>(`/api/examen/${asignaturaId}`),
  setExamen: (asignaturaId: string, fecha: string | null) => request<Examen>(`/api/examen/${asignaturaId}`, "PUT", { fecha }),
  getAuthConfig: () => request<{ google_client_id: string | null }>("/api/auth/config"),
  authMe: () => request<{ email: string }>("/api/auth/me"),
  authGoogle: (credential: string) => request<{ email: string; nombre: string }>("/api/auth/google", "POST", { credential }),
  authLogout: () => request<{ ok: boolean }>("/api/auth/logout", "POST", {}),
  getSubjects: () => request<Subject[]>("/api/subjects"),
  getMap: (asignaturaId: string) => request<MapResponse>(`/api/map/${asignaturaId}`),
  createSession: (modo: Modo, filtro: Filtro) =>
    request<{ sesion_id: string }>("/api/sessions", "POST", { modo, filtro }),
  getSession: (id: string) => request<SessionState>(`/api/sessions/${id}`),
  nextQuestion: (id: string) => request<Question | null>(`/api/sessions/${id}/next`),
  answer: (body: AnswerBody) => request<AnswerResult>("/api/answers", "POST", body),
  skip: (sesionId: string, preguntaId: string) =>
    request<{ ok: boolean }>(`/api/sessions/${sesionId}/skip`, "POST", { pregunta_id: preguntaId }),
  /** Señal de uso (explicación cerrada, ayuda abierta, contexto, vuelta a la pestaña). Nunca debe romper la práctica. */
  evento: (sesionId: string, tipo: string, preguntaId: string | null, payload: Record<string, unknown> = {}) =>
    request<{ ok: boolean }>(`/api/sessions/${sesionId}/evento`, "POST", { tipo, pregunta_id: preguntaId, payload }),
  getNotas: (asignaturaId: string) => request<Nota[]>(`/api/examen/${asignaturaId}/nota`),
  addNota: (asignaturaId: string, nota: number) => request<Nota[]>(`/api/examen/${asignaturaId}/nota`, "POST", { nota }),
  markCorrect: (sesionId: string, preguntaId: string) =>
    request<{ percent: number }>("/api/answers/correct", "POST", { sesion_id: sesionId, pregunta_id: preguntaId }),
  reportQuestion: (id: string, motivo: string, sesionId?: string) =>
    request<{ ok: boolean }>(`/api/questions/${id}/report`, "POST", { motivo, sesion_id: sesionId ?? null }),
  ocultar: (preguntaId: string, alcance: Alcance) =>
    request<Oculto>("/api/ocultos", "POST", { pregunta_id: preguntaId, alcance }),
  ocultos: () => request<Oculto[]>("/api/ocultos"),
  mostrarOculto: (id: string) => request<{ ok: boolean }>(`/api/ocultos/${encodeURIComponent(id)}`, "DELETE"),
  facil: (id: string, sesionId?: string) =>
    request<{ ok: boolean }>(`/api/questions/${id}/facil`, "POST", { motivo: "facil", sesion_id: sesionId ?? null }),
  alternativa: (id: string, texto: string) =>
    request<{ ok: boolean }>(`/api/questions/${id}/alternativa`, "POST", { texto }),
  editQuestion: (id: string, cambios: Record<string, unknown>) =>
    request<{ version: number }>(`/api/questions/${id}`, "PUT", cambios),
  getQuestion: (id: string) => request<QuestionContent>(`/api/questions/${id}`),
  reportedQuestions: () => request<ReportedQuestion[]>("/api/questions/reported"),
  suggestions: () => request<Suggestion[]>("/api/suggestions"),
  history: () => request<History>("/api/history"),
  analytics: (asignaturaId: string, dias: 0 | 7 | 30 = 0) =>
    request<Analytics>(`/api/analytics?asignatura_id=${encodeURIComponent(asignaturaId)}&dias=${dias}`),
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
