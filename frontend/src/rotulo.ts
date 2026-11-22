/* Rótulos de tema: los bancos nombran los temas «T1 Normativa general»; el «T1» ya lo dice el rótulo «Tema 1», así que se quita al mostrar. Solo presentación: ids y bancos no cambian. */
const PREFIJO = /^T(\d+)\s+/;

export const sinPrefijoTema = (nombre: string) => nombre.replace(PREFIJO, "");

/** Número del nombre si lo trae («T2 …» es el tema 2 aunque sea el primero que hay); si no, `orden` (1 es el primero). */
export const numeroTema = (nombre: string, orden: number) => Number(PREFIJO.exec(nombre)?.[1] ?? orden);
