// Sistema de color (E1): cada tema parte del color de la asignatura y gira el tono hasta ARCO grados a lo largo del temario;
// la claridad alterna entre temas vecinos para que no se confundan. Los subtemas se mueven poco dentro de su tema.
const ARCO = 40; // hasta 4 temas; con más, el arco crece para que los vecinos no se confundan
const LILA = "#B05A8F";

function hsl(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex) ?? /^#([0-9a-f]{6})$/i.exec(LILA)!;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, s * 100, l * 100];
}
const css = (h: number, s: number, l: number) => `hsl(${Math.round(h) % 360} ${Math.round(s)}% ${Math.round(l)}%)`;

/** Color del tema `i` de `n` a partir del color de la asignatura (#rrggbb; otro valor cae al lila de la marca). */
export function colorTema(base: string, i: number, n: number): string {
  const [h, s, l] = hsl(base);
  const paso = n > 1 ? (ARCO + Math.max(0, n - 4) * 20) / (n - 1) : 0;
  return css(h + i * paso, Math.min(s, 78), Math.max(36, Math.min(58, l + (i % 2 ? 7 : -3))));
}

/** Color de fondo del banner: el de la asignatura, oscurecido hasta una claridad en la que el texto blanco se lee. */
export function tonoBanner(base: string): string {
  const [h, s, l] = hsl(base);
  return css(h, s, Math.min(l, 40));
}
