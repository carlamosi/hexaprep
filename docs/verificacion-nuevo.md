# Verificación de la muestra nueva (docs/muestra-nuevo.json)

Fuentes: banks/quimica/texto/t2.md (páginas 5 a 11, 13 y 19), banks/quimica/img/INDEX.md y matemática estándar. Se abrieron las 21 imágenes distintas usadas. Todos los problemas se resolvieron de cero (Python para Química, a mano y comprobación para Matemáticas).

## Tabla por pregunta

| id | resultado | motivo |
|---|---|---|
| qui-t2-0166 | OK | Imagen corrosiu (tubos que gotean sobre metal y mano); a según booklet p5; distractores plausibles |
| qui-t2-0168 | OK | Imagen bombona; booklet p5: si está refrigerado causa cremadas por frío; Vertader correcto |
| qui-t2-0170 | OK | Imagen calavera; toxicidad aguda, efectos inmediatos (b) |
| qui-t2-0176 | OK | Imagen llama; alcohol inflamable (p5); amoníaco irritación, permanganato comburente, mercurio medio acuático |
| qui-t2-0162 | OK | Imagen bomba que estalla; Explosiu |
| qui-t2-0165 | OK | Imagen bombona; d coincide literal con p5 |
| qui-t2-0171 | OK | Imagen silueta con estrella en el pecho; nombre del booklet «Perillós per aspiració» |
| qui-t2-0169 | OK | Imagen exclamación; Irritació cutània |
| qui-t2-0177 | OK | Imagen llama sobre círculo; nitrato de potasio en ejemplos de comburent (p5) |
| qui-t2-0163 | OK | Imagen llama; «Crema molt fàcilment, fins i tot per sota de 0 °C» literal p5 |
| qui-t2-0187 | OK | Imagen pipeta con escala; graduat, cualquier volumen (p7) |
| qui-t2-0213 | OK | Imagen montaje Büchner + kitasatos + trompa; p10: el vacío hace la filtración más rápida; Fals correcto |
| qui-t2-0208 | fallo | Imagen y respuesta correctas, pero la explicación dice «es tanca la clau quan ha sortit tot», que es incorrecto |
| qui-t2-0183 | OK | Imagen bureta con llave; abocar gota a gota con mucha precisión (p7) |
| qui-t2-0214 | OK | Imagen balón de fondo redondo de una boca; distractores distinguibles |
| qui-t2-0209 | OK | Imagen embudo de decantación; separa agua y aceite (p10) |
| qui-t2-0204 | OK | Imagen mechero Bunsen; p9: lo calienta desde debajo |
| qui-t2-0185 | fallo | Imagen pera de goma correcta, pero el enunciado («quan es treballa amb pipetes») delata la única opción que dice «pipeta» |
| qui-t2-0195 | OK | Imagen Erlenmeyer; p8: no sirve para medir volúmenes; Fals correcto (las marcas de la foto son aproximadas) |
| qui-t2-0207 | OK | Imagen matraz con salida lateral; Kitasatos |
| qui-t2-0218 | OK | Imagen rotavapor; orden p11: refrigerant, rotavapor, cristal·litzador, assecador; d correcto |
| qui-t2-0221 | fallo | Afirmación «serveix per condensar el vapor» marcada Fals, pero el rotavapor lleva un refrigerante visible en la foto y sí condensa el vapor del disolvente: Vertader defendible |
| qui-t2-0200 | OK | Imagen pesasustancias con tapa; p8: pesar en balanza analítica; los flascons del booklet son botellas de tapón azul, distinguibles |
| qui-t2-0193 | OK | Imagen frascos lavadores; agua destilada, lavar y preparar disoluciones (p8) |
| qui-t2-0203 | OK | Imagen mechero Bunsen; «Per escalfar» (p9) |
| qui-t2-0201 | OK | Imagen morteros con mano; triturar sólidos (p8) |
| qui-t2-0222 | OK | 5/134,5 · 6,022e23 = 2,239e22 |
| qui-t2-0223 | OK | 2 · 2,239e22 = 4,477e22 |
| qui-t2-0224 | OK | 3 · 2,239e22 = 6,716e22 (6,72e22 dentro del 1 %) |
| qui-t2-0225 | OK | 8,50/17,0 = 0,500 mol |
| qui-t2-0226 | OK | 0,5 · 6,022e23 = 3,011e23 |
| qui-t2-0227 | OK | 3 · 3,011e23 = 9,033e23 |
| qui-t2-0234 | OK | 21,0/28,0 = 0,750 mol |
| qui-t2-0235 | OK | 0,750 · 22,4 = 16,8 L |
| qui-t2-0236 | OK | 0,750 · 6,022e23 = 4,517e23 |
| qui-t2-0252 | OK | 24 g/L · 0,250 L = 6,0 g |
| qui-t2-0253 | OK | 6,0 · 100/36 = 16,7 g |
| qui-t2-0254 | OK | 24 · 0,050 = 1,2 g; 1,2/0,200 = 6,0 g/L |
| mat-s-0113 | OK | t = x²: t = 4, 9; x = ±2, ±3; positivas 2 y 3 |
| mat-s-0114 | OK | (-3)(-2)(2)(3) = 36 |
| mat-s-0115 | OK | Soluciones (5, 3) y (-3, -5); con x > 0, (5, 3) |
| mat-s-0116 | OK | 5 + (-3) = 2 |
| mat-s-0120 | OK | AB = [[4, 7], [6, -3]] |
| mat-s-0121 | OK | traza 4 - 3 = 1 |
| mat-s-0122 | OK | det = 6 · (-9) = -54 = 4·(-3) - 7·6 |
| mat-g-0020 | OK | det = a - 2; a = 2 da compatible indeterminado |
| mat-g-0021 | OK | a = 1: (1, 1, 0); cumple las tres ecuaciones |
| mat-g-0022 | OK | 1 + 1 + 0 = 2 (correcto, aunque trivial: es la primera ecuación) |

## Recuento

- Preguntas revisadas: 48 (26 con imagen, 12 apartados de Química, 10 apartados de Matemáticas).
- OK: 45.
- Fallos: 3 (1 crítico, 2 no críticos).

## Fallos y corrección propuesta

1. **qui-t2-0221 (crítico, opción incorrecta defendible).** El rotavapor incluye un refrigerante (el serpentín azul de la foto) y condensa el disolvente que evapora, así que «Vertader» es defendible. Propuesta: cambiar el enunciado a «Aquest instrument serveix per obtenir cristalls a partir d'una solució sobresaturada.» (Fals; trampa: confondre el rotavapor amb el cristal·litzador) o a «Aquest instrument serveix per eliminar el dissolvent d'un producte de reacció.» (Vertader).
2. **qui-t2-0185 (no crítico, pista en el enunciado).** «quan es treballa amb pipetes» apunta a la única opción que contiene «pipeta». Propuesta: enunciado «Per a què serveix aquest estri?» y dejar las opciones como están.
3. **qui-t2-0208 (no crítico, explicación incorrecta).** «es tanca la clau quan ha sortit tot» haría salir también el líquido de arriba. Propuesta: «Regla: dens a baix, surt primer; es tanca la clau quan ha sortit tot el líquid de baix.» Quitar también «Al booklet,» del inicio.

## Observaciones menores (no cuentan como fallo)

- pictogrames/corrosiu.png tiene un resto de texto recortado en la esquina inferior derecha, fuera del rombo.
- material/muntatge-buchner.png conserva las líneas guía de las etiquetas sin texto.
- qui-t2-0171: la explicación dice «que a la pàgina 6 s'inhala»; mejor «que s'inhala i fa mal a llarg termini».
- qui-t2-0222 a 0224: el CuCl₂ es iónico («unitats fórmula» sería lo riguroso); se acepta «molècules» si el booklet lo usa así.
- mat-g-0022 es correcto pero no aporta: x + y + z es literalmente la primera ecuación.
