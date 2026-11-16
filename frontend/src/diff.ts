export interface Segmento { texto: string; ok: boolean }

function empujar(segs: Segmento[], c: string, ok: boolean) {
  const ultimo = segs[segs.length - 1];
  if (ultimo && ultimo.ok === ok) ultimo.texto += c;
  else segs.push({ texto: c, ok });
}

/** Alinea lo escrito con lo correcto letra a letra (mayúsculas aparte): `ok` = la letra coincide, el resto es lo que hay que mirar. */
export function compararLetras(escrito: string, correcto: string): { tu: Segmento[]; correcto: Segmento[] } {
  const a = [...escrito.trim().toLowerCase()];
  const b = [...correcto.trim().toLowerCase()];
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const tu: Segmento[] = [];
  const bien: Segmento[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      empujar(tu, a[i++], true);
      empujar(bien, b[j++], true);
    } else if (j >= b.length || (i < a.length && lcs[i + 1][j] >= lcs[i][j + 1])) {
      empujar(tu, a[i++], false);
    } else {
      empujar(bien, b[j++], false);
    }
  }
  return { tu, correcto: bien };
}

function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return fila[b.length];
}

/** De varias formas válidas, la que más se parece a lo escrito (la diferencia se enseña contra esa). */
export function masCercana(escrito: string, formas: string[]): string {
  const e = escrito.trim().toLowerCase();
  return formas.reduce((mejor, f) => (mejor === "" || distancia(e, f.toLowerCase()) < distancia(e, mejor.toLowerCase()) ? f : mejor), "");
}

function normalizar(t: string): string {
  return t.trim().replace(/\s+/g, " ").toLowerCase().replace(/[’‘]/g, "'").replace(/(?<=l)[.•∙‧](?=l)/g, "·");
}

/** ¿Es lo escrito una de las formas válidas? Igual que el servidor: sin mayúsculas ni espacios de más, y con los acentos exigidos. */
export function mismaForma(escrito: string, validas: string[]): boolean {
  const e = normalizar(escrito);
  return e !== "" && validas.some((v) => normalizar(v) === e);
}
