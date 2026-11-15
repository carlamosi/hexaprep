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

---

# Ampliación: preguntas con imagen y problemas con apartados

## Preguntas con imagen (test y vf)
Las imágenes están en `banks/quimica/img/` (recortadas del booklet) y su lista, con el nombre exacto que les da el booklet y su página, en `banks/quimica/img/INDEX.md`. **Míralas** (herramienta Read sobre el PNG) antes de escribir sobre ellas. Una pregunta test o vf lleva imagen añadiendo al final de su lista un diccionario `{"imagen": "pictogrames/corrosiu.png"}` (ruta relativa a `banks/quimica/img/`):
```json
[3, "Quin perill indica el pictograma de la imatge?", "Destrueix metalls i causa danys irreversibles a la pell", ["Pot explotar amb una flama", "confon corrosiu amb explosiu"], ["...", "..."], ["...", "..."], "Explicació.", {"imagen": "pictogrames/corrosiu.png"}]
```
- La imagen es el enunciado: la pregunta no puede nombrar lo que se ve («Quin pictograma és aquest?», «Quin és el nom d'aquest instrument?», «Per a què serveix aquest instrument?», «Quin producte porta aquest pictograma?», «Quin perill indica?»). Las opciones son nombres o descripciones, nunca imágenes.
- Los distractores salen de la misma familia que la imagen (otros pictogramas, otros instrumentos del booklet) y la trampa nombra la confusión real (instrumentos o pictogramas que se parecen).
- Usa SOLO los nombres y las funciones que da el booklet (`INDEX.md` y `texto/t2.md`; para cada instrumento mira su página). El pictograma de salud a largo plazo se llama en el booklet **«Perillós per aspiració»**: usa ese nombre tal cual y en la explicación di que avisa de efectes a llarg termini (càncer, canvis a l'ADN, problemes de reproducció, danys a òrgans). No inventes funciones que el booklet no dé.
- Varía los ángulos: identificar, función, ejemplo de producto o sustancia (las listas EXEMPLES de las páginas 5 y 6), qué precisión o qué se mide, con qué se combina en un montaje. Usa la misma imagen en más de una pregunta si hay ángulos distintos.
- `pagina` y `cara` del concepto: la página del booklet donde aparece el instrumento o pictograma (`INDEX.md`). En Química pagina = cara.

## Problemas con apartados (clave `grupos`, junto a `problemas`)
Un problema con enunciado común y 2 a 5 apartados. Cada apartado es una pregunta con su propia respuesta numérica, su dificultad y su `expr`; se sirven seguidos y se muestra el `contexto` común y debajo el enunciado del apartado:
```json
"grupos": [
  {"contexto": "Tenim 5 g de CuCl₂ (M(Cu) = 63,5 g/mol i M(Cl) = 35,5 g/mol; N_A = 6,022·10²³).",
   "apartados": [
     [3, "Calcula el nombre de molècules de CuCl₂. Escriu el resultat en notació científica (per exemple 2,5e22).", 2.24e22, "Explicació.", "5/(63.5+2*35.5)*6.022e23"],
     [3, "Calcula el nombre d'àtoms de clor.", 4.48e22, "Explicació.", "2*5/(63.5+2*35.5)*6.022e23"],
     [4, "Calcula el nombre total d'àtoms en aquests 5 g.", 6.72e22, "Explicació.", "3*5/(63.5+2*35.5)*6.022e23"]]}
]
```
- Los datos para todos los apartados van en el `contexto` (incluidas masas atómicas y constantes). Cada apartado se puede resolver por sí solo con el contexto y, si hace falta, el resultado correcto del apartado anterior, que debe decir claramente («utilitza el resultat de l'apartat anterior»); la `expr` de cada apartado se calcula desde los datos del contexto, no desde el apartado anterior. Cada apartado pide UNA cosa distinta. Dificultades crecientes o iguales.
- Las respuestas muy grandes o pequeñas se piden en **notación científica con e** («escriu el resultat en notació científica, per exemple 2,5e22»): la alumna escribe `2,24e22`, `2,24·10^22` o `2,24x10^22`, y todo se acepta. En `solucion` va el número (2.24e22) y la `expr` da el valor sin redondear; cuida que `solucion` esté redondeada a 3 cifras significativas (diferencia con la `expr` menor del 0,5 %).
- Pon el nombre de la unidad en el enunciado cuando haga falta, nunca en la respuesta.
- `grupos` va dentro del concepto (un grupo entero pertenece a un único concepto). Verifica con `.venv\Scripts\python tools\build_quimica.py --check banks\quimica\src\T2`.

---

# Formulació orgànica (banks/quimica/src/T3)
Tema nuevo de Química (apuntes `banks/quimica/texto/t3_formulacio_organica.md`, 32 páginas A4; `pagina` = `cara`). Mismo formato de fragmentos y las mismas reglas (catalán, sin guion largo). Cuidado: las fórmulas y los enlaces se escriben con el guion normal `-`, nunca con «–» ni «—» (están prohibidos): CH₃-CH₂-OH, CH₃-CH=CH₂, HC≡C-CH₃. Usa subíndices Unicode (₀₁₂₃₄₅₆₇₈₉) y no uses imágenes. Verifica con `.venv\Scripts\python tools\build_quimica.py --check banks\quimica\src\T3`.
