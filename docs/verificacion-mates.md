# Verificación de la muestra de Matemáticas

Muestra: `docs/muestra-mates.json` (26 problemas). Cada problema se resolvió de cero sin mirar la solución y después se comprobó con Python (fracciones exactas y sustitución en las ecuaciones originales, determinantes y rangos en los sistemas). También se comprobaron los ejemplos de cada `ayuda_larga`.

## Resultado por pregunta

| id | Resultado | Motivo |
|---|---|---|
| mat-s-0058 | OK | Pares (2,4) y (-3,9); con x<0 queda -3; 9. |
| mat-s-0111 | OK | x=8, y=5; sistema con determinante -10, solución única. |
| mat-s-0072 | OK | (x-4)/(x+3)<0 en (-3,4); enteros -2..3 suman 3. |
| mat-s-0110 | Fallo menor | Solución 2; 3 correcta. Dificultad 1 baja frente a mat-s-0111 (3), que es el mismo tipo. |
| mat-g-0007 | OK | x=10, y=8, z=2; determinante 10, solución única; se pide z=2. |
| mat-s-0100 | OK | X=A^-1(C-B)=(1,-2;3,0); comprobado A·X+B=C. |
| mat-s-0060 | OK | x²=25, y²=9; con x>0, y<0 queda 5; -3. |
| mat-g-0014 | Fallo menor | k=7 correcto y único (F3=F1+F2, F4=2F1-F2). La ayuda_larga generaliza mal (ver abajo). |
| mat-s-0066 | OK | x=2y, y=±3; con x>0 queda 6; 3. |
| mat-g-0011 | OK | det=-(m-1)²(m+2); m=1 indeterminado, m=-2 incompatible. |
| mat-s-0076 | Fallo menor | 63 correcto y único. La ayuda dice cifras de 0 a 9; la de las decenas va de 1 a 9. |
| mat-s-0025 | OK | 2x²-7x-4=0: x=4 y x=-1/2, ninguna anula denominadores. |
| mat-s-0024 | OK | x=3, comprobado 3/2-2/4=1. |
| mat-s-0103 | OK | A²=(7,12;4,7); x=-4, y=1 (A²-4A+I=0). Dificultad 5 algo alta, 4 bastaría. |
| mat-g-0006 | Fallo menor | Carpeta 5 € correcto (det=2, solución única 2, 3, 5). El dato «múltiplo de 0,5» sobra y sugiere que faltan datos. |
| mat-s-0061 | Fallo menor | (-3,2) correcto. Dificultad 4 incoherente con mat-s-0060 (2), mismo método con un paso más. |
| mat-s-0081 | OK | a+b=19, ab=84: 7 y 12, sin orden. |
| mat-s-0079 | OK | 30 kg y 20 kg en el orden pedido. |
| mat-s-0102 | OK | AB=BA=(2,8;0,2) con a=2, b=0. |
| mat-g-0002 | OK | (1,2,3); pasos de Gauss de la explicación correctos. |
| mat-s-0013 | OK | t=1, t=8; soluciones reales 1 y 2. |
| mat-g-0010 | OK | Queda (m-1)z=1; m=1 da 0=1, incompatible. |
| mat-s-0039 | OK | 4t²-17t+4=0: t=4 y 1/4, x=2 y -2. Dificultad 5 algo alta, 4 bastaría. |
| mat-s-0019 | OK | x=2, comprobado √9=3. |
| mat-s-0012 | OK | t=0 o 3: x=±1, ±2. |
| mat-s-0069 | OK | [1,5]; extremos en orden. |

## Recuento

- Problemas revisados: 26.
- Fallos críticos (cálculo, enunciado ambiguo, solución espuria): 0.
- Fallos menores: 5 (mat-s-0110, mat-g-0014, mat-s-0076, mat-g-0006, mat-s-0061).
- OK: 21 (dos con nota de dificultad algo alta: mat-s-0103 y mat-s-0039).

Todas las soluciones guardadas coinciden con la resolución independiente, en valores, orden y descarte de soluciones no válidas. Ninguna explicación contiene errores de cálculo. Todos los ejemplos de las `ayuda_larga` son correctos numéricamente.

## Fallos y corrección propuesta

1. **mat-g-0014 (ayuda_larga).** La frase «Si una ecuación es combinación de las otras, desaparece al escalonar y deja una variable libre» no es cierta en general: con más ecuaciones que incógnitas (como este sistema de 4 ecuaciones y 3 incógnitas) una ecuación dependiente puede desaparecer sin que quede variable libre. Propuesta: «Si una ecuación es combinación de las otras, desaparece al escalonar. Quedan tantas variables libres como incógnitas menos el rango». Opcional: bajar la dificultad de 5 a 4.
2. **mat-s-0076 (ayuda_larga).** Cambiar «Descarta soluciones que no sean cifras (enteros de 0 a 9)» por «Descarta soluciones que no sean cifras (enteros de 0 a 9, y la de las decenas distinta de 0)».
3. **mat-g-0006 (enunciado).** Quitar «Cada precio es múltiplo de 0,5 euros.»: el sistema ya tiene solución única (determinante 2) y el dato hace pensar que el problema está incompleto.
4. **mat-s-0110 (dificultad).** Subir de 1 a 2: es el mismo tipo que mat-s-0111 (dificultad 3), aunque con la matriz ya escrita.
5. **mat-s-0061 (dificultad).** Bajar de 4 a 3, para que sea coherente con mat-s-0060 (dificultad 2), que usa el mismo método.
6. **Calibración opcional.** mat-s-0103 y mat-s-0039 podrían pasar de 5 a 4; son problemas de un solo cambio o una sola identificación de coeficientes, del nivel de los ejercicios 6a a 6c del simulacro.
