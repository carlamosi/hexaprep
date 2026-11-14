# Generación del banco de preguntas (procedimiento y prompt, versión v1)

Este procedimiento lo sigue la sesión (Sonnet 5.5) para crear `banks/economia/T1.json`, `T2.json` y `T3.json`. Ninguna parte de la app llama a un modelo: esto es trabajo de construcción.

## 1. Material de partida
1. Extraer el texto con `python tools/extract_booklet.py banks/economia/fuentes/<booklet>.pdf <salida>.md` (no se leen los PDF como imágenes). Cada página A5 queda marcada con `<!-- pagina N cara M -->` y agrupada por bloque del índice.
2. `pagina` es la página A5 contando la portada como 1; `cara` es la cara del PDF (1 a n) y es la que usa el enlace `#page=`.

## 2. Reparto
- Unas 150 preguntas por tema (entre 140 y 160), repartidas por los bloques del índice según su peso en páginas y por conceptos distintos dentro de cada bloque (varias preguntas por concepto, con ángulos distintos).
- Dificultad 1 a 5 repartida: aprox. 10 % nivel 1, 20 % nivel 2, 30 % nivel 3, 25 % nivel 4, 15 % nivel 5. El banco es de nivel examen desde el principio: el nivel 1 ya exige comprender, no recordar una palabra.
- La letra de la respuesta correcta se reparte por igual entre a, b, c y d (cada letra entre un 20 % y un 30 % del total del tema).

## 3. Formato de cada archivo
Ver `banks/_schema_example.json`. Campos de cada pregunta: `id` (`eco-t1-0001`, único y estable), `bloque`, `tema`, `subtema`, `concepto`, `dificultad`, `enunciado`, `opciones` (exactamente 4; las incorrectas llevan `trampa`, la correcta no), `correcta` (`a` a `d`), `explicacion`, `ayuda_larga`, `fuente_pagina`, `fuente_cara`.
Nombres: `bloque` = nombre del bloque del índice; `tema` = nombre del booklet (p. ej. `T1 Decisiones`); `subtema` y `concepto` los fija quien genera, estables entre lotes (reutilizar el mismo nombre para el mismo concepto).

## 4. Prompt de generación (v1)
Se envía por bloque, con el texto del bloque y las páginas que cubre:

> Eres profesor de Economía de 1º de Bachillerato (PAU de Cataluña). Con SOLO el texto del booklet que sigue, escribe N preguntas tipo test difíciles, de nivel examen, en castellano.
> Reglas:
> - 4 opciones, una sola correcta. Las tres incorrectas son plausibles y cada una refleja una confusión real, nombrada en `trampa` con una frase corta (por ejemplo «confunde coste de oportunidad con coste monetario»).
> - Evita «todas las anteriores», «ninguna» y pistas por longitud de la opción. Todas las opciones tienen una extensión parecida.
> - No uses palabras absolutas («siempre», «nunca») como única pista.
> - `explicacion`: 2 o 3 frases tipo entrenador: por qué la correcta lo es y la regla para recordarlo.
> - `ayuda_larga`: 4 a 8 frases que explican el concepto desde cero, con un ejemplo.
> - Fórmulas en LaTeX entre `$...$`. Sin gráficos.
> - Prohibido el guion largo (— y –) en cualquier texto. «Monté» siempre con acento.
> - Cada pregunta indica `fuente_pagina` y `fuente_cara` de la página donde está el contenido que la sostiene.
> - No inventes contenido que no esté en el texto. Si el texto no da para N preguntas buenas sobre un concepto, haz menos de ese concepto.
> Devuelve solo un array JSON de preguntas.

## 5. Validación obligatoria
1. `python tools/validate_bank.py banks/economia/T1.json banks/economia/T2.json banks/economia/T3.json`: 0 errores y recuento por tema entre 140 y 160.
2. Comprobar el reparto de la letra correcta por tema (cada letra entre 20 % y 30 %) y reordenar opciones si hace falta antes de dar el lote por bueno.
3. Muestra del 10 % verificada por Opus 5.5 (respuesta correcta, ambigüedad, trampa plausible, fuente). Fallos en `docs/verificacion-banco.md`. Si falla más del 5 % de la muestra, se regenera ese bloque.

## 6. Versionado
Cualquier cambio de este prompt sube la versión (v2, v3...) y se anota en `lote.version_prompt` de cada archivo generado, junto con `lote.modelo`.
