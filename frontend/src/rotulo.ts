/* Rótulos de tema: los bancos nombran los temas «T1 Normativa general»; el «T1» ya lo dice el rótulo «Tema 1», así que se quita al mostrar. Solo presentación: ids y bancos no cambian. */
const PREFIJO = /^T(\d+)\s+/;

export const sinPrefijoTema = (nombre: string) => nombre.replace(PREFIJO, "");

/** Número del nombre si lo trae («T2 …» es el tema 2 aunque sea el primero que hay); si no, `orden` (1 es el primero). */
export const numeroTema = (nombre: string, orden: number) => Number(PREFIJO.exec(nombre)?.[1] ?? orden);

/** Números de rótulo de todos los temas, en orden: los de los nombres si no se repiten; si chocan («Verbs» sin número entre «T1» y «T2»), el orden de cada uno. */
export function numerosTemas(nombres: string[]): number[] {
  const n = nombres.map((x, i) => numeroTema(x, i + 1));
  return new Set(n).size === n.length ? n : nombres.map((_, i) => i + 1);
}
