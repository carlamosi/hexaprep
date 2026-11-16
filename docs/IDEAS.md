# Ideas para mejorar HexaPrep (neuroeducación, presentación y detalles que se recuerdan)

Catálogo para trabajar con Carla, no un plan aprobado: cada idea se propone antes con un plan breve (regla de `CLAUDE.md`). Lo que dice la ciencia está escrito de memoria con la fuerza que le atribuyo en cada caso; **no se ha vuelto a contrastar con fuentes**.

## Restricciones ya decididas por Carla (no las rompas)
- Sin notas, puntuaciones ni penalizaciones; sin rachas ni presión. La fecha de examen es opcional y sin avisos.
- Sin botones de confianza en la práctica (se quitaron). Si se recupera la confianza, solo como opción activable.
- En Català el examen es de **escribir** y se practica con palabras difíciles; en los huecos solo se escribe la letra que falta; sin pistas que regalen la respuesta (`banks/catala/FORMATO.md`, última sección).
- Gastar los menos créditos posibles: preferir generadores por reglas y tests deterministas a agentes que redactan; revisión Opus solo de lo que cambia.

## 1. No todo se aprende igual: qué fija cada tipo de contenido

| Tipo | Ejemplo | Qué lo fija | Cómo debería verse en la app |
|---|---|---|---|
| **Palabra arbitraria** (ortografía) | «il·lustre»: ¿a o e? No hay regla que la deduzca | Recuperación activa de la palabra concreta, repaso espaciado **por palabra**, un gancho propio (etimología, familia de palabras, imagen) | Cada palabra es un ítem con su propia curva; el gancho se enseña tras el fallo; las que fallas 3 veces («sanguijuelas») reciben un trato especial (ver §4) |
| **Regla con aplicación** (gramática) | ser/estar, per/per a, plural en -os | Ejemplos trabajados, contrastes mínimos, aplicar la regla a casos nuevos | Mostrar regla y caso resuelto, luego casos con el ejemplo desvanecido; pares contrastados lado a lado |
| **Paradigma** (verbos) | gerundi y participi, velars | Agrupar por patrones y recuperar el paradigma entero | Tras responder, la tabla de la familia con la forma irregular resaltada; sesiones por patrón y luego mezcladas |
| **Hechos y relaciones** (literatura, economía) | trobadors, llibres de cavalleria frente a novel·la cavalleresca | Elaboración («¿por qué?»), comparar y contrastar, esquemas | Al fallar un V/F, pedir corregir la frase falsa; tabla comparativa que se rellena; cronología |
| **Procedimiento** (matemáticas) | ecuaciones, matrices | Ejemplos trabajados, **intercalar tipos de problema** (no por capítulo), pistas graduadas, análisis de errores | Pistas en 2 niveles (idea, primer paso), solución paso a paso, «encuentra el error en esta resolución» |
| **Nomenclatura** (química orgánica) | CH3CH2OH ↔ etanol | Reglas aplicadas en ambos sentidos, escribir el nombre | Escrita en las dos direcciones (fórmula a nombre y nombre a fórmula) y generada por reglas |

Idea transversal: la **ortografía de palabras sueltas es un problema de memoria de ítems** (cada palabra se aprende o se olvida por separado), mientras que matemáticas es un problema de **procedimientos y de saber cuándo usar cuál**. Mezclar ambos en un mismo algoritmo no rinde: conviene que el repaso espaciado y el intercalado se comporten distinto según el tipo.

## 2. Mostrar lo correcto y lo incorrecto (microdetalles)
1. **Lado a lado y con la diferencia marcada** (hecho en las escritas). Extender a test: mostrar por qué tu opción *era tentadora* (la trampa ya existe) y qué la distingue de la correcta.
2. **Regla de una línea siempre visible tras el fallo**, plegada tras un acierto. «Àtona: e. Truc: busca una palabra de la familia donde la vocal sea tónica.» No escondida detrás de un desplegable.
3. **Segunda oportunidad con pista antes de revelar** (fallo: pista de regla, reintento, y solo entonces la respuesta): suele fijar más que leer la solución directamente, aunque cuesta un paso. Hacerlo opcional por asignatura.
4. **Lenguaje del error**: «aún no», «casi», «este es de los que más se aprenden» en vez de «incorrecto» en rojo. Un error visto con calma se corrige mejor que uno con alarma.
5. **No solo rojo y verde**: icono, subrayado y texto (daltonismo; ya hay colores de tema que se confunden).
6. **Animación con sentido, no decorativa**: la letra correcta «cae» en su sitio y la errónea se desvanece, para atraer la atención justo a la diferencia. Respetar `prefers-reduced-motion`.
7. **Acierto por suerte**: si acertó un test o un V/F con 50 % de azar, ofrecer «lo adiviné» (autoinforme sin penalización) para que vuelva a salir.
8. **Tu patrón de error**: «el 60 % de tus fallos son un acento», «confundes b/v en palabras agudas». Con los errores tipificados que ya guardamos, es una frase concreta en lugar de un porcentaje.
9. **Audio solo donde ayuda**: en catalán las vocales átonas a/e suenan igual, así que oír la palabra NO ayuda a escribirla; oírla sí ayuda en verbos y literatura. No añadir voz por defecto.
10. **Fallos repetidos a la vista**: «esta palabra la has fallado 3 veces» con su gancho, en lugar de dejarla pasar.

## 3. Retención: mecanismos que faltan
1. **Repaso espaciado por pregunta**, no solo por concepto (hoy FSRS es por concepto). Cada palabra fallada vuelve a 1, 3 y 7 días con el mismo formato. Es la mejora de memoria con más recorrido.
2. **Palabras que se resisten (leeches)**: al tercer fallo, tratamiento aparte. Que **Carla escriba su propio gancho** («il·lustre: lluç y lustre») es más potente que leer el nuestro (efecto de generación). Guardarlo por perfil.
3. **Desvanecimiento visible**: cada ítem es un hexágono que se apaga cuando se acerca el olvido; «salva 5 palabras que se desvanecen» como llamada positiva (no culpa). Encaja con la marca del panal.
4. **Pretest**: mostrar 2 o 3 preguntas de un concepto antes de estudiarlo (aunque se fallen) mejora lo que se lee después. Útil en conceptos nuevos de literatura y química.
5. **Sesiones cortas con cierre**: 15 minutos, resumen final («hoy fijaste 12, 3 te costaron: vuelven mañana»). Un cierre claro evita la sensación de tarea abierta. Sin rachas.
6. **Antes de dormir**: sugerir un repaso corto por la noche (el sueño consolida lo reciente). Una frase, no una función.
7. **Practicar como el examen**: simulacro con tiempo (cronómetro suave), y **examen en papel imprimible** con los puntos débiles para escribir a mano y autocorregirse aquí (si el examen es manuscrito, teclear no entrena exactamente lo mismo). Ya existe la skill de revistas/booklets para el diseño.
8. **Corregir una frase falsa** en V/F (literatura): marcar qué parte es falsa y reescribirla, en vez de elegir Verdadero/Falso al 50 %.
9. **Elaborar**: tras un acierto en gramática, una pregunta corta «¿por qué?» con opciones de justificación (no se puntúa, se muestra la buena).

## 4. Cómo se vende (relato, primera impresión y artefactos)
1. **El porcentaje honesto como argumento**: «aquí tu 12 % es lo que sabes, sin trucos». Ya es cierto; contarlo en la pantalla de bienvenida y en el README.
2. **Primera sesión guiada de 60 segundos**: 5 palabras, corrección letra a letra y «este es tu mapa» con el panal casi vacío. Que en el primer minuto se vea lo que la app hace distinto.
3. **«¿Por qué funciona?»**: tarjetas breves («recordar vale más que releer», «espaciar gana a empollar») dentro de Perfil. Entender el método mejora cómo se usa.
4. **Artefactos físicos**: «Tu cuaderno de errores» en PDF (las palabras que más te cuestan con su regla y su gancho) para pegar en la pared; el mapa del panal como póster. Les gusta lo imprimible (booklets).
5. **README del repositorio público** con capturas, qué hace y cómo se usa. Hoy un visitante ve código sin relato.
6. **Microcopy con voz propia**: usar el nombre, tono cercano y concreto («3 palabras listas para mañana»), y la interfaz también en catalán (pendiente en `SPEC.md`).
7. **Estados vacíos que prometen** («aquí aparecerá tu evolución cuando respondas 10 preguntas») y cargas con esqueleto en lugar de pantalla en blanco.
8. **Reto amistoso con la otra persona del grupo** (opcional, sin rankings): «vosotras dos habéis fijado 40 palabras esta semana».

## 5. Asombrar sin distraer
- Respuesta inmediata (sin esperas visibles) y sensación de tacto: pulsar un hexágono lo hunde un poco; vibración corta en Android (iOS no la permite desde la web).
- Un sonido muy discreto y opcional al acertar una palabra que antes fallabas (recompensa de lo difícil, no de lo fácil).
- Que los hexágonos «respiren» al estar listos para repasar. Sutil y apagable.
- Detalles de accesibilidad que se notan: foco visible, teclado completo, contraste medido (axe en Playwright, pendiente).

## 6. Contenido (orden sugerido)
1. **Un examen real anterior de Carla** (coste cero, máximo valor): calibra formato, dificultad y tipo de palabras. Imprescindible antes de generar más Català.
2. **Química orgánica escrita**: nombrar y formular es escribir; encaja con el tipo `escrita` y se puede **generar por reglas** (nomenclatura IUPAC determinista), sin redactar a mano. Falta añadir las estructuras como imagen.
3. **Generadores por reglas** para Català (plurals, femenins, conjugaciones) a partir de listas verificadas: práctica infinita sin gastar créditos.
4. **Más «troba l'error» difíciles** de gramática (pronoms febles, barbarismes) con una segunda revisión Opus.
5. **Economía y Matemáticas**: preguntar cómo son esos exámenes antes de tocar nada. Matemáticas gana con pistas graduadas y variantes numéricas de cada problema (generadas).
6. Confirmar con la profesora los criterios dudosos de Català anotados en `docs/ESTADO.md` (per + infinitiu, «hagués dit», futuro de probabilidad, «tota Barcelona», «haig de», «vàries»).

## 7. Backlog priorizado (esfuerzo: S pequeño, M medio, L grande)
| # | Idea | Esfuerzo | Notas |
|---|---|---|---|
| 1 | Repaso espaciado por pregunta + cuaderno de errores | M | Cambia cómo se agenda; hace falta decidir dónde guardar el estado por pregunta (columna nueva = migración en todos los perfiles con `tools/actualizar_perfiles.py`) |
| 2 | Regla de una línea visible tras el fallo + lenguaje del error | S | Solo interfaz y textos |
| 3 | Tu patrón de error (acentos frente a letras) | S | Usa las notas ya devueltas por `escritura.py` |
| 4 | Simulacro con tiempo + repaso de lo fallado | M | Reutiliza el selector con un filtro cerrado |
| 5 | Palabras que se resisten con gancho propio | M | Tabla por perfil; entra en el cuaderno de errores |
| 6 | Examen imprimible a mano | M | PDF con la skill de revistas; corrección en la app |
| 7 | Hexágono por ítem que se apaga | M | Depende de (1) |
| 8 | README + primera sesión guiada + «¿por qué funciona?» | S a M | Presentación |
| 9 | Química orgánica escrita generada por reglas | M a L | Contenido; probar el generador con tests |
| 10 | Corregir la frase falsa en V/F | S a M | Nuevo formato en literatura |
| 11 | Pistas graduadas en matemáticas | M | Campo nuevo en el banco |
| 12 | Interfaz en catalán | M | Ya previsto en `SPEC.md` |

## 8. Fuerza de la evidencia (de memoria, sin contrastar ahora)
- **Alta**: recuperación activa, repaso espaciado, intercalado (sobre todo en matemáticas), ejemplos trabajados al empezar.
- **Media**: efecto de generación (escribir tu propio gancho), pretest, corrección de errores con pista antes de revelar, hipercorrección, análisis de errores.
- **Baja o contextual**: sonidos y animaciones (ayudan a la atención, no a la memoria por sí mismos), mensajes de mentalidad de crecimiento aislados.
