# Banco de Català escrito: formato de las fuentes y reglas de redacción

Carla (1r de Batxillerat, PAU de Catalunya) tiene un examen de Català **escrito**: huecos, formas derivadas (femenins irregulars, plurals, superlatius...) y frases con un error gramatical u ortogràfic que hay que identificar. Lo que más nota le quita es **escribir mal** (ortografia i accents). Por eso las preguntas se **teclean**. Solo la literatura va en verdader/fals.

## Fuentes (léelas antes de escribir; no inventes contenido que no esté en ellas)
- `banks/catala/texto/normativa.md`: normativa general (marcas `<!-- pagina N -->`). Texto extraído de un PDF: es imperfecto.
- `banks/catala/texto/apunts_gramatica.md`: booklet de gramàtica i literatura de Carla (A5 grapado en hojas A4, **el texto sale con columnas mezcladas y palabras pegadas**, sobre todo la hoja 2). Para estar seguro, **mira las páginas como imagen** (herramienta Read sobre el PNG): `banks/catala/texto/img/apunts-pN.png` (N = hoja 1 a 8).
- `banks/catala/texto/img/literatura-fotos-pN.png`: fotos de sus apuntes de literatura (N = 1 a 8). Úsalas para literatura.
- Mapa de las hojas del booklet a `pagina` (hoja del PDF) y `cara` (cara A5 impresa en el pie):
  hoja 2: cara 1 (idees clau de gramàtica) y cara 14 (idees clau de literatura) · hoja 3: cara 13 (lírica trobadoresca, Ausiàs March) y cara 2 (gènere del nom) · hoja 4: cara 3 (gènere dubtós i canvi de significat) y cara 12 (ús correcte dels verbs) · hoja 5: cara 11 (perífrasis verbals) y cara 4 (determinant i plural) · hoja 6: cara 5 (article i apostrofació) y cara 10 (gerundis i participis, ya hecho: NO lo repitas) · hoja 7: cara 9 (verbs velars) y cara 6 (adjectiu i vocals) · hoja 8: cara 7 (per/per a i pronoms febles) y cara 8 (verbs incoatius i alternances).
  Para el booklet: `"pagina": <hoja>, "cara": <cara>` del contenido que sostiene el concepto. Para la normativa solo `pagina` (pagina = cara).

## Qué entregas
Un archivo JSON por subtema en `banks/catala/src/<CARPETA>/NN-nombre.json` (carpeta y nombres te los da el encargo). Estructura:

```json
{
 "tema": "T1 Normativa general",
 "subtema": "A/E àtones",
 "conceptos": [
  {
   "nombre": "Penúltima lletra àtona",
   "pagina": 1,
   "cara": 1,
   "ayuda": "3 a 6 frases en català: la regla desde cero con exemples DIFERENTS dels de les preguntes.",
   "escritas": [
     [dificultad, "enunciado", [["Etiqueta", ["forma vàlida 1", "forma vàlida 2"], {"forma errònia típica": "pista curta amb la regla"}]], "explicació"]
   ],
   "vf": [
     [dificultad, "afirmació", true, "explicació", "trampa: la confusió que fa triar l'opció equivocada"]
   ]
  }
 ]
}
```
- `tema`: el que diga el encargo (el campo es opcional si coincide con `_meta.json`). `subtema` y `nombre` de concepto: **usa exactamente los que te da el encargo** cuando te los dé (los hexágonos de la app dependen del nombre); si el encargo te deja libre, 3 a 6 conceptos por subtema con nombres estables y propios.
- `escritas`: lista de preguntas. Cada una es `[dificultad 1 a 5, enunciat, camps, explicació]`. `camps` es una lista de 1 a 6 huecos; cada hueco es `[etiqueta, [formes vàlides], {errors típics}]` (el tercer elemento es opcional).
- `vf`: solo en literatura (y solo si el encargo lo pide). `[dificultad, afirmació, true|false, explicació, trampa]`. Reparte la mitad verdaderas y la mitad falsas.
- Dificultad: ~15 % nivel 1, 25 % nivel 2, 30 % nivel 3, 20 % nivel 4, 10 % nivel 5.

## Los cuatro formatos de escrita (imítalos, son los del examen)
1. **Hueco en una palabra o frase.** El enunciado muestra la palabra o la frase con el hueco (`_`) y se pide la **palabra completa**. Un solo hueco: `["Paraula", ["ordinari"]]`.
   `"Escriu la paraula completa: «ordin_ri» (vocal àtona)."`
   `"Completa la frase amb la forma correcta de «por que»: «No sé ____ no ha vingut.»"` → `[["Paraula", ["per què"], {"perquè": "Aquí és la pregunta indirecta: «per què» separat."}]]`
2. **Forma derivada.** Se da una palabra y se pide su femení irregular, plural, superlatiu, comparatiu, present de subjuntiu, etc.
   `"Escriu el femení de «cavall»."` → `[["Femení", ["euga"], {"egua": "No és «egua» (castellà): la parella lèxica és «euga»."}]]`
   `"Escriu el plural de «flux»."` → `[["Plural", ["fluxos"], {"fluxs": "Els acabats en -x afegeixen -os."}]]`
   Dos huecos si hace falta: `"Escriu el comparatiu i el superlatiu de «bo»."` → `[["Comparatiu", ["millor"]], ["Superlatiu", ["òptim"]]]`.
3. **Troba l'error.** Una frase con **exactamente un error** gramatical u ortogràfic (un barbarisme, una concordança, una confusió de l'apartat). Dos huecos, siempre con estas etiquetas: `"Error"` (el fragmento erróneo de 1 a 3 palabras, **copiado tal cual de la frase**) y `"Correcció"` (lo que lo sustituye; acepta todas las variantes correctas).
   `"Troba l'error i corregeix-lo: «Tinc que anar a classe.»"` → `[["Error", ["tinc que"]], ["Correcció", ["he d'anar", "haig d'anar", "cal que vagi"]]]`
   El constructor comprueba que el «Error» aparece en la frase; la frase no puede tener un segundo error, ni el enunciado dar pistas sobre el error.
4. **Completar con la forma verbal/gramatical correcta.** Frase con hueco y entre paréntesis lo necesario: `"Completa: «Si ho ____ (saber), no m'ho hauries dit.»"` → `[["Verb", ["haguessis sabut"]]]`.

## Reglas
- Todo en catalán. Prohibido el guion largo (— y –) en cualquier texto. Usa comillas «...» y apóstrofo recto `'`. La ela geminada como `l·l`.
- **Una sola respuesta correcta posible** (más las variantes válidas que enumeres en `formes vàlides`). Si hay dos formas correctas (p. ex. `Pere` o `pere`), lístalas. La app ignora mayúsculas y espacios de más, unifica `’`/`'` y `l.l`/`l·l`, pero **exige los acentos**: pon siempre los acentos correctos en las respuestas válidas.
- **Errores típicos** (el tercer elemento del hueco): las formas equivocadas que Carla escribiría de verdad (sin acento, calco del castellano, regla confundida) con una pista corta y útil de la regla, en catalán. Pon de 1 a 3 en cada pregunta cuando existan. Una forma errónea nunca puede ser también una forma válida.
- El enunciado **no contiene la respuesta** ni la regala (ni en el propio texto, ni en la ayuda).
- `ayuda` (se despliega antes de responder): explica la regla con ejemplos que **no sean** las respuestas de tus preguntas.
- `explicació`: 2 o 3 frases tipo entrenador: la respuesta, la regla y un truco para recordarla.
- Varios ángulos por concepto: mezcla los cuatro formatos cuando el concepto lo permita, no repitas la misma palabra, y no repitas preguntas de otros archivos.
- Nada de contenido que no esté en las fuentes. Si dudas de una forma, no la uses. Los barbarismes (PDF en columnas mezcladas) solo si los lees con seguridad en la imagen.
- Verdader/Fals (solo literatura): afirmaciones claras, una idea cada una, sin palabras absolutas como única pista. Las falsas son un error plausible (confundir llibres de cavalleria con novel·la cavalleresca, trobadors con joglars...).

## Comprobación obligatoria antes de entregar
1. JSON válido (UTF-8): `python -c "import json;json.load(open(r'<archivo>',encoding='utf-8'))"`.
2. `.venv\Scripts\python tools\build_quimica.py --check banks\catala\src\<CARPETA>` hasta que diga `0` errores (comprueba, entre otras cosas, que el «Error» está en la frase y que ningún error típico es una forma válida). En Windows con Git Bash usa `PYTHONUTF8=1`.
3. Relee tus preguntas como lo haría la alumna: ¿hay una sola respuesta?, ¿están bien los acentos?, ¿la regla de la explicación es la de las fuentes?

---

# Ajustes de Carla tras probar el primer banco (OBLIGATORIOS, mandan sobre lo anterior)

Su examen es de **escribir**, con palabras difíciles. Lo del primer banco era demasiado fácil y daba pistas.

1. **Solo palabras difíciles.** Nada de palabras obvias (imatge, perquè, per exemple, o sigui, estació, sofà, menú, llibreta, finestra, parlar...). Elige palabras en las que un catalanoparlante duda de verdad (en a/e àtones: il·lustre, assassinat y similares; en b/v, l·l, o/u, ss, accents: casos de examen difícil). Solo palabras que leas en las fuentes o que conozcas con total seguridad.
2. **En los huecos se escribe SOLO la letra que falta, no la palabra.** El enunciado muestra la palabra con el hueco (`_`) y la respuesta es solo esa vocal o letra o grupo de letras (con su acento o dièresi si lo lleva: `["ï"]`, `["é"]`). Nunca pidas «Escriu la paraula completa». Si la palabra tiene dos huecos, un campo por hueco (etiquetas `"Vocal 1"`, `"Vocal 2"`; el orden de izquierda a derecha). No pongas la palabra completa en ninguna parte del enunciado.
3. **Sin pistas que regalen la respuesta**: nada de «(finestra petita)», «(femení)», «(en castellà és ...)», «(cosa que causa admiració)». Solo se permite una pista corta cuando el hueco sería ambiguo de verdad (por ejemplo «torr_» → «(femení; edifici molt alt)»), y nunca puede delatar la letra.
4. **En el concepto de a/e àtones NO hay «Troba l'error».** Solo huecos: palabras (o una frase corta con 2 o 3 palabras con hueco cuyo sentido no delate la vocal) donde se escribe la vocal. No pongas frases enteras para buscar un error.
5. **Menos «Troba l'error» en general:** máximo un 15 % de cada archivo; el resto, preguntas para escribir. Y el error ha de ser difícil, nunca triviales como «estacio», «sofa», «menu» o «classa».
6. **No digas qué hay que poner.** Nada de «posa la dièresi», «amb l'accent que cal» ni «amb la dièresi on calgui». Da la palabra con el hueco o con la marca ausente y pregunta qué letra va (por ejemplo `Llu_sa` → `["ï"]`).
7. **Tablas de clasificación** (diftongs/hiats): un enunciado con hasta 6 palabras; cada palabra es un campo (etiqueta = la palabra, sin ninguna pista) y se escribe una de estas respuestas: `creixent`, `decreixent`, `hiat` o `res` (acepta también la inicial con acentos si la usas, p. ej. `["hiat"]`). Enunciado tipo: `"Classifica cada paraula escrivint: creixent, decreixent, hiat o res."` Hasta 6 campos por pregunta.
8. **Formas derivadas difíciles**, como en un examen difícil: `boig, boja, bojos, boges` (un campo por forma, la palabra base en el enunciado), passeig/passejos, esquerrà/esquerrana, plurals en -os/-ns, femenins irregulars, comparatius i superlatius cultes. Nada de plurals en -es de palabras fáciles («llibreta»).
9. **Verbos: solo formas complicadas** (imperfet de subjuntiu, present de subjuntiu irregular, formes velars, imperatiu, compostos, 2a/3a persona de verbs irregulars). Nada de verbos fáciles como «parlar» o «cantar». Puedes dar un verbo y pedir 2 a 6 formas (un campo por forma).
10. **Nada de preguntas sobre l'article salat (es, sa, ses).** Solo se menciona en la `ayuda` que es propio de les Illes Balears.
11. Sigue habiendo mucho que **escribir**: la mayoría de preguntas son de escribir letras, formas o palabras, no de corregir.
12. **Al reescribir una pregunta existente, reemplázala en la misma posición** (no cambies el número de preguntas por concepto ni los nombres de subtema y concepto: los ids dependen de la posición). Si quitas una por ser demasiado fácil o por salat, sustitúyela por otra del mismo concepto con la nueva dificultad.
