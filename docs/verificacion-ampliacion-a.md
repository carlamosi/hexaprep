# Verificación de la muestra de ampliación A

Archivo revisado: `docs/muestra-ampliacion-a.json` (48 preguntas: 36 problemas de Matemáticas y 12 test de Economía).

Método. Matemáticas: cada problema resuelto de cero a mano y comprobado numéricamente con Python (búsqueda de raíces con descarte de dominio, productos e inversas de matrices, sustitución en la ecuación original). Se revisó también cómo corrige la app: `backend/hexaprep/events.py` (`coincide`) ordena las dos listas antes de comparar si `ordenada` no es true. Economía: cada pregunta contrastada con `banks/economia/texto/t1_apuntes.md`, `t2_apuntes.md` y `t3_apuntes.md`.

## Tabla por pregunta

| id | Resultado | Motivo |
|---|---|---|
| mat-s-0129 | OK | Soluciones -1 y 3; el caso negativo no tiene raíces reales |
| mat-s-0190 | Fallo | Valor 4 correcto, pero dificultad 5 excesiva para dos conjugados directos |
| mat-s-0140 | OK | -1 y 2 correctas (ver duplicado mat-s-0205) |
| mat-s-0227 | OK | 5; se descarta -2 por el dominio |
| mat-s-0176 | OK | a=2000, b=4000, c=4000; piden B = 4000 |
| mat-s-0144 | OK | x=4 |
| mat-s-0217 | OK | (-4,-1] unión [1,3); enteros -3,-2,-1,1,2 = 5 |
| mat-s-0131 | OK | Solo 5; se descarta 1 porque 2x-4<0 |
| mat-s-0143 | OK | -1, -1/2, 1/2, 1 |
| mat-g-0028 | OK | F3 = F1+F2; con y=1, x=2, z=0; orden indicado |
| mat-s-0198 | OK | 5; se descarta -1 |
| mat-s-0155 | Fallo | Solución 10 y 100 correcta, pero el ejemplo de `ayuda_larga` es el mismo problema resuelto y la dificultad 5 es excesiva |
| mat-s-0221 | OK | 1 y 3 |
| mat-s-0226 | OK | x=2 |
| mat-s-0253 | Fallo crítico | X correcta (1;2;0;-1), pero falta `ordenada: true`: la app aceptaría cualquier permutación de los elementos |
| mat-g-0025 | OK | (2,-1,3) cumple las tres ecuaciones; pasos de Gauss correctos |
| mat-s-0224 | OK | t=4 y t=1/2, x=2 y x=-1 |
| mat-s-0130 | OK | 0, 2, 4, 6 |
| mat-s-0214 | OK | (2,5]; extremos 2 y 5 (el orden no se pide, así que no hace falta `ordenada`) |
| mat-s-0133 | OK | -1, 1, 3; las tres cumplen x+1 mayor o igual que 0 |
| mat-s-0243 | OK | a=2, b=3; las cuatro posiciones cuadran |
| mat-s-0248 | OK | A^50 = A^2 = -I |
| mat-s-0251 | Fallo crítico | X correcta (1;2;3;0), pero falta `ordenada: true`: la app aceptaría por ejemplo 0;1;2;3 |
| mat-s-0223 | OK | 11·3^x=99, x=2 |
| mat-s-0187 | OK | Exponente 2, valor 4 |
| mat-s-0197 | OK | -8 y 0; ninguna anula denominadores y ambas verifican |
| mat-s-0182 | OK | 4 |
| mat-s-0152 | OK | 4; se descarta -3 |
| mat-s-0205 | Fallo | Enunciado y solución idénticos a mat-s-0140 (x^6-7x^3-8=0): pregunta duplicada |
| mat-s-0137 | OK | -2, 0, 1, 3 |
| mat-s-0178 | OK | 15 conejos; el contexto da datos suficientes |
| mat-s-0179 | OK | 25·6+15·18 = 420 |
| mat-s-0249 | OK | AB = (4,-2;6,0) |
| mat-s-0250 | OK | BA = (2,-2;4,2), traza 4 |
| mat-s-0180 | OK | 15 y 20, de menor a mayor |
| mat-s-0181 | OK | Altura 300/25 = 12 |
| eco-a2-0024 | OK | ITPAJD indirecto (t2 p. 10 y 11); nota menor: es la única opción con "indirecto" |
| eco-a1-0013 | OK | Subvención y bonificación premian, multa castiga (t1 p. 4) |
| eco-a1-0014 | OK | Flujo monetario empresa a familias (t1 p. 4); la correcta es algo más larga, sin llegar a ser pista clara |
| eco-a2-0002 | OK | Mercantilismo SXVI a XVIII (t2 p. 1) |
| eco-a2-0006 | OK | Literal de t2 p. 3 |
| eco-a2-0004 | Fallo | Contenido correcto (t2 p. 2), pero la correcta mide unos 100 caracteres frente a unos 65 de las demás: pista por longitud |
| eco-a2-0019 | Fallo | Contenido correcto (t2 p. 9), pero la correcta es la más larga con diferencia y la única con los tres matices: pista por longitud |
| eco-a1-0016 | OK | Renta o alquiler, interés, beneficio (t1 p. 4 y 5) |
| eco-a3-0018 | Fallo | Contenido correcto (t3 p. 5 y 6), pero la correcta casi dobla en longitud a las demás: pista por longitud |
| eco-a3-0003 | OK | Valores y estilos de vida son factor social (t3 p. 1) |
| eco-a3-0012 | OK | "Se acostumbra fácilmente al cambio" es amenaza de sustitutivos (t3 p. 4) |
| eco-a2-0007 | OK | La riqueza de las naciones, 1776 (t2 p. 3) |

## Recuento

- Preguntas revisadas: 48 (36 Matemáticas, 12 Economía).
- OK: 40.
- Fallos: 8, de ellos 2 críticos (mat-s-0251, mat-s-0253) y 6 no críticos.
- No se ha encontrado ningún error de cálculo, ninguna solución espuria incluida, ningún enunciado ambiguo ni ninguna opción incorrecta defendible.

## Fallos y corrección propuesta

### Críticos

1. **mat-s-0251**: añadir `"ordenada": true`. Sin él, `coincide` ordena las listas y da por buena cualquier permutación de 1;2;3;0, aunque el enunciado pide los elementos fila a fila.
2. **mat-s-0253**: añadir `"ordenada": true`, por el mismo motivo (1;2;0;-1).

### No críticos

3. **mat-s-0205**: duplicado exacto de mat-s-0140. Cambiar la ecuación, por ejemplo $x^6+7x^3-8=0$ (t=1 y t=-8, soluciones -2 y 1), o eliminar una de las dos.
4. **mat-s-0155**: el ejemplo de `ayuda_larga` es el propio problema ya resuelto. Cambiar el ejemplo, por ejemplo $(\log x)^2-\log x^2=0$ (t=0 y t=2, x=1 y x=100), o cambiar el problema, por ejemplo $(\log x)^2-\log x^4+3=0$ (x=10 y x=1000). Bajar la dificultad a 3.
5. **mat-s-0190**: bajar la dificultad de 5 a 2 o 3.
6. **eco-a2-0004**: acortar la correcta a algo como "Porque ha habido distintos modelos y hoy predominan los mixtos", o alargar las incorrectas hasta una longitud parecida.
7. **eco-a2-0019**: acortar la correcta, por ejemplo "Bienes y servicios finales producidos en un país en un período", y equilibrar las incorrectas (por ejemplo "Bienes intermedios y finales producidos en un país en un año").
8. **eco-a3-0018**: acortar la correcta a "Oligopolio: pocos e interdependientes; monopolística: muchos y diferenciados" y dar a las incorrectas la misma estructura de dos rasgos.
