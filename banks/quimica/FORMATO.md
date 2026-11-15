# Banco de Química T2: formato de las fuentes y reglas de redacción

Texto del booklet (catalán, con marcas `<!-- pagina N cara M -->`): `banks/quimica/texto/t2.md`. El texto sale de un PDF y es imperfecto: en las portadas las letras salen dobladas y en las páginas 2 y 3 (resúmenes) las columnas se mezclan. Si dudas de lo que dice el booklet, no preguntes sobre ello. No inventes contenido que no esté en el texto; los datos de cálculo (masas atómicas, constantes) sí pueden usarse si están en el texto o si el enunciado los da.

## Qué entregas
Un archivo JSON por subtema en `banks/quimica/src/T2/NN-nombre.json` (el nombre te lo dice el encargo). Estructura:

```json
{
 "subtema": "Estructura de la matèria i el mol",
 "conceptos": [
  {
   "nombre": "Massa molar",
   "pagina": 11,
   "cara": 11,
   "ayuda": "4 a 8 frases en catalán que explican el concepto desde cero, con un ejemplo.",
   "test": [
     [dificultad, "enunciado", "respuesta correcta", ["incorrecta 1", "trampa 1"], ["incorrecta 2", "trampa 2"], ["incorrecta 3", "trampa 3"], "explicación"]
   ],
   "vf": [
     [dificultad, "afirmación", true, "explicación (justifica por qué es verdadera o falsa)", "trampa: la confusión que lleva a elegir la opción equivocada"]
   ],
   "problemas": [
     [dificultad, "enunciado con todos los datos", 6.02, "explicación paso a paso con la fórmula", "expresión de Python que da la solución, por ejemplo 12.0/44.0*6.022e23"]
   ]
  }
 ]
}
```
- `pagina` y `cara` salen de la marca `<!-- pagina N cara M -->` de la página donde está el contenido que sostiene la pregunta del concepto (un concepto = una página; si cubre varias, elige la principal).
- Cada concepto tiene un nombre estable y propio (3 a 6 conceptos por subtema). Varias preguntas por concepto, con ángulos distintos. Un concepto puede no tener `vf` o `problemas` (lista vacía) si no encajan.
- `dificultad` 1 a 5. Reparto aproximado: 10 % nivel 1, 20 % nivel 2, 30 % nivel 3, 25 % nivel 4, 15 % nivel 5. El nivel 1 ya exige comprender, no recordar una palabra.

## Reglas
- Todo en catalán, nivel de 1r de Batxillerat (PAU de Catalunya). Prohibido el guion largo (— y –) en cualquier texto. Usa coma decimal en los textos (6,022·10²³). Fórmulas en LaTeX entre `$...$` solo si hace falta; las unidades y fórmulas químicas simples (H₂O, CO₂) en texto con subíndices Unicode.
- **test**: 3 incorrectas plausibles, cada una con su `trampa` (frase corta que nombra la confusión real). Sin «totes les anteriors» ni «cap». Todas las opciones de extensión parecida. Sin palabras absolutas como única pista. Explicación de 2 o 3 frases tipo entrenador: por qué la correcta lo es y la regla para recordarla. La respuesta correcta va siempre primero (el programa mezcla el orden).
- **vf**: una afirmación sin trampas de redacción. Reparte entre verdaderas y falsas (aprox. la mitad cada una). `trampa` es la confusión que hace creer lo contrario de lo cierto.
- **problemas**: un problema de cálculo con datos completos en el enunciado (incluidas las masas atómicas que se usen, aunque estén en el booklet). La respuesta es UN número, sin unidades en la solución; el enunciado dice en qué unidad se pide («Expressa el resultat en mol»). Redondea la solución a 3 cifras significativas. La expresión de Python debe dar ese valor (diferencia relativa menor del 0,5 %) y usar solo números y operadores, `math` (ya importado) y `**` para potencias; nada de unidades ni símbolos. Para los gases usa $R = 0{,}082$ atm·L/(mol·K), T en kelvin (°C + 273), 1 mol de gas = 22,4 L en condiciones normales, $N_A = 6{,}022\cdot10^{23}$. Comprueba el cálculo antes de entregarlo: un error aquí es el peor fallo posible.
- Cantidades por subtema: las que diga el encargo (test, vf, problemas en total del archivo).
- Antes de terminar, comprueba que el JSON es válido y ejecuta `.venv\Scripts\python tools\build_quimica.py --check banks\quimica\src\T2` (cuando exista) o al menos carga el archivo con `python -c "import json;json.load(open(...,encoding='utf-8'))"`.
