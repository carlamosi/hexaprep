/** Hexágono de vértices a izquierda y derecha: el mismo que el icono de la app. Devuelve el `d` de un path. */
export const HEX = (cx: number, cy: number, r: number) =>
  `M${Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * 60 * i;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join("L")}Z`;

/** Los seis hexágonos pequeños de la marca, a mano y sin simetría (ángulo en grados, distancia al centro, radio, opacidad). */
export const SAT_BASE = [
  { a: -75, l: 96, r: 17, o: 0.95 }, { a: -20, l: 118, r: 11, o: 0.6 }, { a: 35, l: 100, r: 20, o: 0.9 },
  { a: 120, l: 112, r: 13, o: 0.55 }, { a: 165, l: 92, r: 18, o: 0.95 }, { a: 235, l: 124, r: 9, o: 0.5 },
];

export const LEMA = "Master it, one hexagon at a time.";

/** La marca quieta (hexágono central con halo y los seis pequeños), para pantallas que no son la splash. */
export function MarcaHex() {
  return (
    <svg viewBox="-20 -20 280 280" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="marca-luz"><stop offset="0" stopColor="#E27FB8" stopOpacity=".9" /><stop offset=".55" stopColor="#B05A8F" stopOpacity=".35" /><stop offset="1" stopColor="#B05A8F" stopOpacity="0" /></radialGradient>
        <linearGradient id="marca-cuerpo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF6FB" /><stop offset=".55" stopColor="#F7C6E0" /><stop offset="1" stopColor="#E58FC0" /></linearGradient>
      </defs>
      <circle cx="120" cy="120" r="125" fill="url(#marca-luz)" />
      {SAT_BASE.map((s, i) => (
        <g key={i} opacity={s.o}>
          <path d={HEX(120 + s.l * Math.cos((Math.PI / 180) * s.a), 120 + s.l * Math.sin((Math.PI / 180) * s.a), s.r)} fill="#F7C6E0" stroke="#F7C6E0" strokeWidth="8" strokeLinejoin="round" />
        </g>
      ))}
      <path d={HEX(120, 120, 44)} fill="url(#marca-cuerpo)" stroke="url(#marca-cuerpo)" strokeWidth="18" strokeLinejoin="round" />
    </svg>
  );
}
