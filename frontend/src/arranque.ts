/** Señales de que la app ya puede enseñarse. La splash espera a todas (con un máximo) para no dejar una pantalla en blanco detrás
 * y su barra de carga se completa cuando llegan, no a un tiempo inventado. */
const necesarias = ["acceso", "fuentes"] as const;
type Clave = (typeof necesarias)[number];

const hechas = new Set<Clave>();
const oyentes = new Set<() => void>();

export function marcarListo(clave: Clave) {
  hechas.add(clave);
  oyentes.forEach((f) => f());
}
export const todoListo = () => necesarias.every((c) => hechas.has(c));
export function alCambiar(f: () => void) {
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}

// Las fuentes se piden aquí, no al renderizar: así «listo» significa que el texto ya sale con su tipografía definitiva.
if (typeof document !== "undefined" && document.fonts?.load) {
  Promise.all([document.fonts.load("400 1rem Lexend"), document.fonts.load("600 1rem Lexend")])
    .catch(() => {}) // sin fuentes la app se ve con la de reserva: no se espera más
    .finally(() => marcarListo("fuentes"));
} else {
  marcarListo("fuentes");
}
