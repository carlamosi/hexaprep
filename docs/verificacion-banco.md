# Verificación del banco de Economía

Banco generado con Sonnet 5.5 (procedimiento en `tools/generate_bank.md`, prompt v1) a partir del texto de los tres booklets, y verificado por muestra con Opus 5.5.

## Resultado de la validación automática
`python tools/validate_bank.py banks/economia/T1.json banks/economia/T2.json banks/economia/T3.json`: 0 errores.

| Tema | Preguntas | Letra correcta a / b / c / d |
|---|---|---|
| T1 Decisiones | 149 | 38 / 37 / 37 / 37 |
| T2 Sistemas | 154 | 39 / 39 / 38 / 38 |
| T3 Mercado y entorno | 145 | 37 / 36 / 36 / 36 |

La letra correcta la reparte `tools/build_bank.py` de forma equilibrada y determinista, así que no hay patrón previsible (esto cierra el menor diferido sobre la posición de la correcta).

## Muestra verificada por Opus (15 preguntas por tema, 10 %)
Criterios: 1) la correcta lo es según el texto fuente y la explicación es coherente; 2) ninguna incorrecta es defendible; 3) cada trampa es plausible y está bien nombrada; 4) `fuente_pagina` es la página que sustenta la pregunta.

| Tema | Fallos | % | Detalle |
|---|---|---|---|
| T1 | 1 de 15 | 6,7 % | 0143: trampa que solo repetía que la opción era incorrecta (criterio 3) |
| T2 | 0 de 15 | 0 % | cálculos rehechos y confirmados (0141: 5 %; 0147: 5,4 %) |
| T3 | 1 de 15 | 6,7 % | 0062: tres trampas idénticas, sin nombrar ninguna confusión (criterio 3) |

En las 45 preguntas de la muestra, la respuesta correcta, la explicación y la página coincidían con el texto fuente. Los dos fallos eran de calidad de las etiquetas de trampa, no de contenido.

## Acción tomada (superaba el 5 % en T1 y T3)
Los dos fallos señalaban un defecto sistemático de generación: etiquetas de trampa que describían por qué la opción no vale («no es lo que describe el ejemplo») en lugar de la confusión del alumno. Esas etiquetas alimentan el repaso de fallos agrupados por tipo de confusión, así que se corrigió el defecto entero y no solo la muestra.

- Búsqueda automática de trampas vacías: 14 en T1, 84 en T2 y 113 en T3 (211 en total, en 113 preguntas).
- Todas se reescribieron con una confusión nombrada («confunde X con Y», «cree que…») con `tools/patch_traps.py`, que edita las fuentes compactas y reconstruye el banco.
- Revalidación: 0 errores y ninguna trampa vacía restante.
- Retoques menores de T2: enunciado de la pregunta 0108 sin referencia a una pregunta anterior; opción incorrecta de la 0113 ampliada a seis elementos para que no se descarte contando.

No se volvió a pasar una segunda muestra por Opus tras las reescrituras (decisión de coste de `docs/MODELOS.md`); la revisión final del plan lo cubrirá si hace falta.

## Limitaciones conocidas
- Texto fuente extraído con pdfplumber: algunas palabras salen pegadas, lo que no afecta a las preguntas pero sí a una lectura literal del extracto.
- `ayuda_larga` es una por concepto (se repite en todas las preguntas del mismo concepto), no una por pregunta.
- Verificado el 10 % de cada tema; el resto está validado solo por esquema.
- `fuente_cara` se calcula de forma determinista con la imposición del booklet; no la revisó Opus.
