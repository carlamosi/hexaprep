// Genera los iconos de la app (favicon.svg y los PNG de frontend/public) con Chromium de playwright.
// Uso, desde frontend/: node ../tools/hacer_iconos.mjs
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { chromium } = createRequire(resolve(process.cwd(), "package.json"))("playwright-core");

const OUT = resolve(process.cwd(), "public");
// Hexágono de vértices a izquierda y derecha (como el de la marca), con esquinas redondeadas por el trazo.
const hex = (r) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 180) * 60 * i;
  return `${(256 + r * Math.cos(a)).toFixed(1)},${(256 + r * Math.sin(a)).toFixed(1)}`;
}).join(" ");

/** forma: "squircle" (iconos any), "lleno" (apple-touch: iOS redondea solo) o "maskable" (hexágono en la zona segura). */
function icono(forma) {
  const k = forma === "maskable" ? 0.8 : 1; // zona segura del 80 %
  const fondo = forma === "squircle"
    ? `<rect width="512" height="512" rx="116" fill="url(#bg)"/>`
    : `<rect width="512" height="512" fill="url(#bg)"/>`;
  const clip = forma === "squircle" ? `<rect width="512" height="512" rx="116"/>` : `<rect width="512" height="512"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
<clipPath id="c">${clip}</clipPath>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A3470"/><stop offset=".55" stop-color="#4A1E4C"/><stop offset="1" stop-color="#2A1030"/></linearGradient>
<radialGradient id="luz" cx=".5" cy=".47" r=".55"><stop offset="0" stop-color="#E27FB8" stop-opacity=".95"/><stop offset=".45" stop-color="#B05A8F" stop-opacity=".42"/><stop offset="1" stop-color="#B05A8F" stop-opacity="0"/></radialGradient>
<linearGradient id="cuerpo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6FB"/><stop offset=".55" stop-color="#F7C6E0"/><stop offset="1" stop-color="#E58FC0"/></linearGradient>
<linearGradient id="brillo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="halo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="sombra" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="14"/></filter>
</defs>
<g clip-path="url(#c)">
${fondo}
<rect width="512" height="512" fill="url(#luz)"/>
<rect width="512" height="260" fill="url(#cielo)"/>
<g transform="translate(256 256) scale(${k}) translate(-256 -256)">
<polygon points="${hex(150)}" fill="#FF9AD0" opacity=".75" filter="url(#halo)" stroke="#FF9AD0" stroke-width="30" stroke-linejoin="round"/>
<polygon points="${hex(138)}" transform="translate(0 14)" fill="#2A0F2E" opacity=".45" filter="url(#sombra)" stroke="#2A0F2E" stroke-width="30" stroke-linejoin="round"/>
<polygon points="${hex(136)}" fill="url(#cuerpo)" stroke="url(#cuerpo)" stroke-width="30" stroke-linejoin="round"/>
</g>
${forma === "squircle" ? `<rect x=".75" y=".75" width="510.5" height="510.5" rx="115.5" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="1.5"/>` : ""}
</g>
</svg>`;
}

// Favicon: forma simple y sin efectos, que se lea a 16 px.
const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A3470"/><stop offset="1" stop-color="#2A1030"/></linearGradient><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6FB"/><stop offset="1" stop-color="#E58FC0"/></linearGradient></defs><rect width="32" height="32" rx="7.5" fill="url(#b)"/><polygon points="${Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 180) * 60 * i; return `${(16 + 8.4 * Math.cos(a)).toFixed(2)},${(16 + 8.4 * Math.sin(a)).toFixed(2)}`; }).join(" ")}" fill="url(#h)" stroke="url(#h)" stroke-width="3.2" stroke-linejoin="round"/></svg>
`;
writeFileSync(resolve(OUT, "favicon.svg"), FAVICON);

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
for (const [archivo, forma, px] of [
  ["icon-512.png", "squircle", 512], ["icon-192.png", "squircle", 192],
  ["icon-maskable-512.png", "maskable", 512], ["apple-touch-icon.png", "lleno", 180],
]) {
  await pagina.setViewportSize({ width: px, height: px });
  await pagina.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${px}px;height:${px}px}</style>${icono(forma)}`);
  await pagina.screenshot({ path: resolve(OUT, archivo), omitBackground: true });
}
await navegador.close();
console.log("iconos listos");
