# Banco de Matemáticas 1º Bachillerato: formato de las fuentes y reglas

Material de partida: `banks/mates/texto/simulacro.md` (texto de un simulacro de examen con soluciones al final, marcas `<!-- pagina N -->`). Es el temario de la alumna: úsalo para el tipo de ejercicios, la notación y el nivel. Las soluciones están al final (páginas 11 y 12). El texto sale de un PDF y las fracciones y matrices salen desordenadas: **no te fíes de cómo se ven, resuelve tú cada ejercicio de cero**.

## SOLO hay problemas
En Matemáticas NO hay preguntas tipo test ni verdadero/falso. Cada pregunta es un **problema**: o bien resolver una ecuación, sistema o inecuación, o bien un problema con enunciado. La alumna escribe la respuesta en un campo de texto.

## Qué entregas
Un archivo JSON por subtema en la carpeta que te indique el encargo. Estructura:

```json
{
 "tema": "T1 Ecuaciones, sistemas e inecuaciones",
 "subtema": "Ecuaciones bicuadradas y polinómicas",
 "conceptos": [
  {
   "nombre": "Ecuaciones bicuadradas",
   "pagina": 1,
   "ayuda": "4 a 8 frases que explican el método desde cero, con un ejemplo resuelto. Fórmulas entre $...$.",
   "problemas": [
     [dificultad, "enunciado", solucion, "explicación paso a paso", "expresión de Python que da la solución", ordenada]
   ]
  }
 ]
}
```
- `"tema"` en el archivo lo fija el encargo (cópialo tal cual). `pagina` es la página del simulacro donde está el tipo de ejercicio (la marca `<!-- pagina N -->`); para Gauss pon 1.
- 3 a 6 conceptos por subtema, varias preguntas por concepto con ángulos y números distintos. Nombre de concepto estable y propio.
- `dificultad` 1 a 5: reparto aproximado 10 % nivel 1, 20 % nivel 2, 30 % nivel 3, 25 % nivel 4, 15 % nivel 5. El nivel 1 ya es nivel examen básico.
- No copies los ejercicios del simulacro: haz **variantes con otros números** del mismo tipo (puedes incluir como mucho 2 o 3 casi idénticos a los del simulacro, con números cambiados).

## La respuesta: número, varios números o fracción
`solucion` es un número (3.358) **o una lista de números** ([1, 4]). Escribe decimales con punto en el JSON. Reglas:
- Una sola incógnita con una solución: un número. Con varias soluciones: lista, y el programa acepta cualquier orden (`ordenada` omitido o false), salvo que el orden importe.
- `ordenada: true` (sexto elemento, `true`) cuando el orden importa: coordenadas de una solución de un sistema («x; y»), elementos de una matriz (siempre «fila a fila»), pares de valores pedidos en un orden concreto. El enunciado debe decir el orden.
- El enunciado dice SIEMPRE exactamente qué hay que escribir: «Escribe las soluciones separadas por punto y coma», «escribe x; y», «escribe los elementos de la matriz fila a fila separados por punto y coma», «redondea a 3 decimales». Nunca pidas unidades en la respuesta (el enunciado puede decir «en euros»): se escribe solo el número. Máximo 6 valores.
- Si una ecuación tiene soluciones que no valen (radicales, logaritmos, denominadores), la respuesta contiene solo las que valen.
- Sistemas con varias soluciones: pide una concreta («la solución con x > 0») o la suma de las x, etc. Si hay conjunto solución con infinitas soluciones o intervalos (inecuaciones), pide algo numérico: los extremos de los intervalos (lista sin orden), el número de enteros que cumplen la inecuación en un rango dado, la suma de los enteros que la cumplen, el menor entero que la cumple, etc. Dilo claramente en el enunciado.
- Fracciones: la alumna puede escribir 1/2 o 0,5; en `solucion` pon el valor decimal (0.5), con 3 decimales si es periódico (0.333). Prefiere ejercicios con soluciones limpias.

## Verificación automática (obligatoria)
El último campo, `expr`, es una expresión de Python que calcula la solución **de forma independiente a tu resolución a mano**: o bien una fórmula directa con los datos del enunciado, o bien una **búsqueda por fuerza bruta** de los valores que cumplen la ecuación original. Ejemplo para $x^4-5x^2+4=0$:
`[x for x in range(-20, 21) if abs(x**4 - 5*x**2 + 4) < 1e-9]`
Para soluciones no enteras: `[k/4 for k in range(-80, 81) if abs(f(k/4)) < 1e-9]` escribiendo f inline (no hay funciones definidas por ti: usa comprensiones y expresiones). Para logaritmos: `math.log(40)/math.log(3)`. Disponibles: números, operadores, `math`, `range, abs, sorted, sum, min, max, len, round, float, int, all, any, zip, pow`. Un programa recalcula `expr` y exige que coincida con `solucion` (diferencia relativa menor del 0,5 %); si `solucion` es lista, compara elemento a elemento (ordenando ambas si no es `ordenada`). Una discrepancia es un error que se corrige: un error de cálculo es el peor fallo posible. Comprueba también a mano que el enunciado tiene datos suficientes, que la respuesta es única y que las soluciones espurias están descartadas.

## Reglas de redacción
- Todo en castellano, nivel 1º Bachillerato. Prohibido el guion largo (— y –). Fórmulas en LaTeX entre `$...$` (por ejemplo `$x^4-5x^2+4=0$`, `$\log_2(x+1)$`, `$\sqrt{x}$`, `$\frac{x}{x-2}$`); matrices con `$\begin{pmatrix}1&2\0&3\end{pmatrix}$`. En el JSON las barras invertidas se escriben dobles (`\frac`).
- `explicacion`: la resolución paso a paso y la regla que se aplica (3 a 6 frases). Si hay solución descartada, di por qué.
- Importes en euros y datos realistas. Sin enunciados ambiguos.
- Comprueba que el JSON es válido y, si existe, ejecuta `.venv\Scripts\python tools\build_quimica.py --check <carpeta>` desde la raíz (puede no existir todavía: en ese caso comprueba tú las `expr` con Python).
