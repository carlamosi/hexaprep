// Diccionario de textos de la interfaz. Castellano ahora; el catalán se añade rellenando `ca`.
type Dict = Record<string, string>;

const es: Dict = {
  "app.nombre": "HexaPrep",
  "nav.panal": "Panal",
  "nav.hoy": "Hoy",
  "nav.historial": "Historial",
  "nav.ajustes": "Ajustes",
  "nav.principal": "Principal",
  "app.cargando": "Cargando",
  "app.error": "No se ha podido cargar. Comprueba que HexaPrep está en marcha.",
  "panal.titulo": "Panal de dominio",
  "panal.tema": "Tema",
  "panal.dominio": "dominio",
  "panal.concepto": "concepto",
  "panal.conceptos": "conceptos",
  "panal.conceptosDe": "Conceptos de",
  "panal.porCientoDominio": "por ciento de dominio",
  "panal.temas": "temas",
  "panal.subtemas": "subtemas",
  "practica.confianza": "Confianza (opcional)",
  "conf.seguro": "Segura",
  "conf.dudo": "Dudo",
  "conf.adivino": "Adivino",
  "practica.opciones": "Opciones de respuesta",
  "practica.opcion": "Opción",
  "practica.reportar": "Reportar",
  "practica.reporte_pregunta": "¿Qué le pasa a esta pregunta?",
  "practica.reporte_mal": "Está mal formulada",
  "practica.reporte_dudosa": "La respuesta es dudosa",
  "practica.reporte_nota": "Sale de tus estadísticas hasta que la revises en el editor.",
  "practica.reportada": "Pregunta reportada. Sale de tus estadísticas hasta que la revises en el editor.",
  "practica.ayuda": "Ayuda: entender el concepto",
  "practica.ver_explicacion": "Ver explicación",
  "practica.acierto": "Bien. Lo tienes.",
  "practica.fallo": "Casi. Fíjate en esta trampa:",
  "practica.booklet": "Abrir el booklet en la página",
  "practica.booklet_falta": "No se encuentra el PDF del booklet. Copia el archivo en la carpeta banks/economia/fuentes.",
  "practica.siguiente": "Siguiente",
  "practica.respondidas": "respondidas",
  "practica.dominio": "Dominio del concepto",
  "panal.sinAsignaturas": "Todavía no hay ninguna asignatura importada.",
};

const ca: Dict = {};

const dictionaries: Record<string, Dict> = { es, ca };
let lang = "es";

export function setLang(next: string): void {
  if (next in dictionaries) lang = next;
}

/** Texto de la interfaz. Si falta en el idioma activo usa el castellano; si falta del todo, devuelve la clave. */
export function t(key: string): string {
  return dictionaries[lang][key] ?? es[key] ?? key;
}
