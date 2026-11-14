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
