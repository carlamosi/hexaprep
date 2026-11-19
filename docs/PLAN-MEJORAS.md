# Plan de mejoras (propuesto, sin aplicar salvo lo marcado ✓)

Origen: lista de mejoras de Carla tras usar la app, más el análisis de sus datos. Orden de ejecución: 0, A, B, C, D, E y F (con boceto aprobado antes), G, H. Cada bloque es un commit; sin sesiones paralelas sobre los mismos archivos. Modelo por defecto: Sonnet 5.5. Cada lógica nueva con pruebas primero (`superpowers:test-driven-development`) y cierre con `superpowers:verification-before-completion`.

## Plan de ejecución y consumo de créditos

El límite semanal de Carla se restablece el sábado 21 de noviembre de 2026 a las 13:00. Se trabaja hoy en una conversación nueva (contexto limpio: cada turno cuesta menos) hasta agotar el límite, y una tarea programada el sábado a las 13:10 continúa por donde se quedó. Corre con la app abierta y el PC encendido; si la app está cerrada, corre al abrirla. Si la sesión de hoy termina todo, la del sábado lo detecta en la lista de progreso y acaba enseguida.

| Quién | Bloques, en este orden | Por qué así |
|---|---|---|
| Sesión de hoy, hasta agotar el límite | 0, A, B, C (menos C1), D | Sin decisiones pendientes: primero lo que más se nota por crédito (frontend), después la lógica con pruebas primero. |
| Tarea del sábado 13:10 | Lo que falte de 0, A, B, C y D, leyendo la lista de progreso | Continúa sola tras el reinicio del límite. |
| Cuando la veas | E, F (con boceto aprobado), G (memo con Opus), H (piloto), C1 (push) | Necesitan tu aprobación o tu decisión. |

Al empezar, cada sesión mira `git status`: si hay cambios sin commit de un bloque a medias (el límite cortó), los revisa, los termina si son pocos o los guarda con `git stash` (nunca los descarta) y lo anota en la lista de progreso.

Reglas para gastar poco (valen para cada ejecución):
- Sonnet 5.5, esfuerzo medio, sin subagentes ni sesiones paralelas. Opus solo para el memo de G1, la muestra de H y las reglas de B7.
- Primero `tools/probar.py` (bloque 0); después, pruebas dirigidas con `-k`, y la suite completa una vez al cerrar cada bloque. Salida de pruebas siempre a archivo, leer solo la cola.
- Leer solo los archivos que el bloque toca; el mapa del código está en `CLAUDE.md` y `docs/ESTADO.md`.
- Sin capturas salvo una a escala 0,5 para A9. Playwright del iPhone una sola vez, al final de A.
- Un commit por bloque (o por grupo coherente), con la skill `commit:commit` indicando solo commit, sin push y en `main`; si la skill pregunta algo que no se puede contestar, `git commit` normal con mensaje claro y la atribución habitual. **Sin push** (cada push despliega en producción) y **sin escribir en Neon** (nada de `actualizar_perfiles.py` ni quitar reportes): eso se hace con Carla.
- Si aparece un aviso de límite de uso: parar, anotar el estado en esta lista de progreso y no reintentar en bucle.
- Al acabar cada bloque, marcar la casilla de abajo y actualizar `docs/ESTADO.md` en una sola línea.
- Nada de emails, cuentas ni datos personales en archivos del repositorio.

Progreso:
- [x] 0 Herramientas de test (`python tools/probar.py back|front|todo [-k expr] [--lento]`)
- [x] A Práctica e interfaz (A1 a A12; A9 sin captura de escritorio, ver ESTADO)
- [x] B Calidad del banco y reportes (B1 a B8; pendiente con Carla: quitar reportes de imágenes del perfil, `actualizar_perfiles.py` con N2 y V1, y revisar «Depèn» de N2)
- [x] C Datos y robustez (C2, C3 y C5 hechos; C4 sin ejemplo concreto, no se reproduce)
- [x] D Selector y retención (D1 a D9; D2 solo se activa si Carla marca un tema en curso en Perfil)
- [ ] E Identidad visual (hechos E2, E3 y E4; faltan E1 color por orden del temario y E5 banner)
- [ ] F Panal y búsqueda (hecho F2 lupa en la asignatura; falta F1 panal único)
- [x] G Fin de sesión (implementado desde el texto del plan, sin memo de Opus)
- [ ] H Trimestral de Economía (aplazado a petición de Carla)
- [ ] C1 Desplegar (push, a petición de Carla)

## Hecho
- ✓ Lote 1 de captura (commit a444d8d): tiempos reales (`t_primer_clic`, `t_activo`, `t_oculto`, tiempo en explicación), `motivo` y `p_pred` por pregunta, detalle de escritas, error relativo de problemas, eventos de uso, nota de examen. **No está desplegado (sin push).**
- ✓ El azar pesa en el dominio de test y V/F (3PL, `ACIERTO_AZAR` = test 0,15 y V/F 0,3) y cada sesión sortea el objetivo de acierto 0,6/0,75/0,85 (commits 30379d4 y eaee32d).

## 0. Herramientas de test (primero: ahorra créditos después)
- 0.1 `tools/probar.py back|front|todo [-k expr]`: guarda la salida completa en un archivo y muestra como máximo 40 líneas: totales y, por cada fallo, test, línea y qué esperaba frente a qué obtuvo.
- 0.2 Medir `--durations`; marcar `test_bancos_reales` como lento (solo cuando cambian los bancos). Asserts nuevos con mensaje que lleve el dato (secuencia servida, esperado y obtenido).
- 0.3 Frontend: `vitest --changed`, temporizadores falsos para los 3 s, un solo Playwright al final de los bloques de interfaz.

## A. Práctica e interfaz (solo frontend, Sonnet)
- A1 Avance: acierto pasa solo a los 3 s con un aro fino (toque o Enter lo adelanta); fallo no pasa solo (Siguiente o Enter); abrir «Ver explicación» cancela el avance siempre, también en acierto y en V/F.
- A2 Sin «Cargando» entre preguntas: pedir la siguiente al enviar la respuesta, mientras se ve la corrección; si tarda, esqueleto de la tarjeta, nunca el texto.
- A3 «Saltar» en posición fija, sin depender de lo largo que sea el título del tema.
- A4 Cruz (icono) en lugar de «Cerrar».
- A5 Quitar: «Relleno del hexágono = dominio...», «Escribe con los acentos...» y los botones à è í.
- A6 Barra superior del color de la asignatura (y `theme-color` del iPhone).
- A7 Català: «Literatura» en lugar de «Solo test y V/F».
- A8 Favicon SVG transparente para la pestaña; el icono del iPhone sigue opaco (iOS no admite transparencia).
- A9 Historial: sin deslizamiento horizontal en móvil; arreglar el recorte de «N prácticas de...» en «preguntas que más fallas»; reordenar las tarjetas para que no quede hueco en escritorio (aplicar `dataviz`; necesita una captura de escritorio).
- A10 Tiempos del historial con `t_activo` (sin pestaña oculta) y normalizados por la carga de lectura y escritura de la pregunta (se calcula con el texto, sin capturar más).
- A11 Pase de pulido: botones de icono de 44 px con etiqueta, Escape cierra paneles, títulos de pestaña por asignatura, estados vacíos, aviso de «guardado».
- A12 Captura lote 2 en la misma pasada que A1 y A2 (mismos archivos): latencia de cada carga y respuesta (`t_carga_ms`, para comprobar que A2 es instantáneo) y si salió el esqueleto; tiempo sin foco de la ventana (`blur` y `focus`, porque `visibilitychange` no salta al pasar a otra ventana con la pestaña visible); en escritas, `n_borrados`, `n_teclas` y `t_escritura` (señal de duda sin botones de confianza), y `t_copia` y `n_copias` de la corrección activa; evento `explicacion_abierta` al abrir «Ver explicación» (hoy solo se mide la ayuda larga).

## B. Calidad del banco y reportes (Sonnet)
- B1 Menú de reporte «¿Qué le pasa a esta pregunta?»: Está mal o dudosa; Demasiado fácil u obvia; Aún no lo hemos dado (alcance: pregunta, concepto o tema entero; la oculta del selector, no cuenta en el %, reversible desde Perfil; se guarda en `ajuste` por perfil, sin migración); Mi respuesta también valía (no cambia la nota, guarda lo escrito para añadirla al banco). «Fue un despiste» queda descartado: taparía errores reales a/e.
- B2 En huecos «____ X» y en apóstrofes, aceptar solo el artículo (`l'`, `el`, `la`) además de la frase. Es un fallo de formato del banco que baja el dominio de «Apòstrof de l'article».
- B3 Revisar «Escriu amb l'article femení: «____ ira»»: `l'ira` parece válido (la i de *ira* es tónica) y el banco da `la ira`. Confirmar con la normativa o la profesora; aceptar ambos géneros donde los dos valen.
- B4 Imágenes que no se ven online: servirlas como estáticas del frontend (la carpeta `banks/` probablemente no viaja al despliegue; sin verificar). Después quitarlas de «reportadas» en el perfil de Carla, con su confirmación.
- B5 Historial clicable: «Dónde se escapan los puntos» y «Tus fallos por tipo de confusión» abren la pregunta con su respuesta correcta, y nada más (no la respuesta de Carla).
- B6 Barrido de contenido por script, sin agentes: quitar «(masculí)» donde da la pista de la vocal que falta, quitar enunciados redundantes («Escriu el gerundi i el participi del verb» cuando los huecos ya lo dicen). Comprobar antes y después que los ids no cambian; después `tools/actualizar_perfiles.py`.

- B7 Los errores é/è y ó/ò no son de teclado: Carla no usaba los botones de acento y no tenía clara la apertura de la vocal (es un hueco de conocimiento). Tras fallar un hueco por apertura, mostrar una regla de una línea con su gancho (redactada con cuidado y revisada por Opus; no escribir reglas de memoria sin contrastar).
- B8 Historial: «Tus errores de escritura por tipo» (acento de apertura, acento omitido, letra cambiada como b/v, longitud distinta), calculado comparando lo escrito con las formas válidas; sin capturar nada nuevo. Propuesta, no pedida.

## C. Datos y robustez (Sonnet)
- C1 Desplegar el lote 1 (push) cuando Carla lo pida.
- C2 Registrar el fin de sesión (al cerrar o pulsar Terminar): hoy 12 de 12 sesiones tienen `fin` vacío. Contar preguntas abandonadas (mostradas sin respuesta ni salto). No se guardan borradores de lo que se teclea.
- C3 `tools/auditar.py` (solo lectura, repetible): intentos igual a eventos, dominio igual a su reconstrucción, huérfanos, duplicados, abandonos. En el perfil de Carla hoy: 156 intentos = 156 eventos, dominio coherente.
- C4 Apartados seguidos: no se reproduce en sus datos (15 preguntas con grupo, 0 partidas). Investigar cuando haya un ejemplo concreto.
- C5 Parte de servidor del lote 2: en `servida` guardar la posición en el ranking (`rank`), el número de candidatas (`n_cands`), la fase del concepto (D4) y la recuperabilidad FSRS prevista (`r_fsrs`), para evaluar el selector y calibrar el espaciado.

## D. Selector (Sonnet, pruebas primero)
- D1 Dos pasos: elegir el concepto (repaso vencido, luego nuevo, luego débil) y después la pregunta; ventaja a los conceptos sin tocar y tope por concepto y sesión; al empezar un concepto, 2 preguntas seguidas y luego intercalar. Motivo: un concepto (verbos) tiene 75 de 482 preguntas y absorbió el 23 % de los intentos de Català; solo se tocó un 34 % de los conceptos.
- D2 Foco solo cuando Carla lo marque explícitamente («tema en curso», opcional, desde el panal o Perfil): 60 % foco, 30 % repaso espaciado, 10 % exploración. Sin foco no cambia nada.
- D3 Calibración adaptativa por asignatura: corregir la probabilidad prevista con el acierto real (esperaba 51 % y acertó 67 % en Català; 87 a 91 % en Química).
- D4 a D9: política de retención (sustituye al sorteo 60/75/85, que se retira con `OBJETIVOS = (0.6,)`; el lote 1 no está desplegado, no se pierden datos). Revisión crítica: la idea de objetivos de acierto por fase mezclaba dos cosas, la dificultad de la pregunta y la probabilidad de recordar, que depende sobre todo del tiempo desde el último repaso; y con el banco casi plano (dificultad 3 y 4) la dificultad apenas es una palanca. Las palancas que de verdad mueven la retención, de más a menos evidencia (de memoria, sin contrastar ahora):
  - D4 Prioridad real al repaso por riesgo de olvido. Hoy el selector solo da un bonus de 0,08 si el repaso está vencido (`DUE_BONUS`), tan pequeño que apenas pesa, y la recuperabilidad FSRS solo se usa en las sugerencias de Hoy. Usar la recuperabilidad en el selector, con una cuota de repasos por sesión (~30 a 40 %) para no ahogar lo nuevo.
  - D5 Evidencia distribuida (requiere OK de Carla, bajará el % visible): hoy cada intento cuenta igual y alimenta a FSRS, incluidos los repetidos en minutos y el reintento de la corrección activa (acierta el 84 % porque acaba de ver la respuesta). Las repeticiones del mismo concepto en la misma sesión pesan cada vez menos en el dominio y en FSRS, y «consolidado» exige aciertos en al menos 3 días distintos (reaprendizaje sucesivo, Rawson y Dunlosky).
  - D6 Grado FSRS con Hard o Good según la latencia normalizada (A10) y los borrados (A12): sustituye la confianza que se quitó. Hoy solo hay Again o Good.
  - D7 Intercalar conceptos confundibles (b/v, é/è, artículo masculino y femenino) usando los errores tipificados de B8.
  - D8 Un objetivo de acierto único (~0,7, solo como desempate, a fijar tras D3) sin fases ni experimento. D3 debe incluir la recencia (la probabilidad depende del tiempo desde el último intento; el modelo actual infravalora lo que acabas de ver).
  - D9 Métrica «retención real» en el historial: % de aciertos en repasos tras 1 día o más (y tras 7 o más). Sale de `intervalo_desde_anterior`, no captura nada nuevo, y sirve para evaluar D4 a D7 con tus propios datos.
  - Futuro: repaso programado por pregunta y no por concepto (un concepto como los verbos tiene 75 elementos con una sola tarjeta FSRS; requiere migración y `actualizar_perfiles.py`), ejemplo resuelto antes del primer problema en Química y Mates (coste de contenido), y espaciado ligado a la fecha de examen.

## E. Identidad visual (Sonnet; boceto aprobado por Carla antes de cada una)
- E1 Sistema de color desde el color de cada asignatura: el tono avanza con el orden del temario (arco de ~40°), la claridad alterna, y los subtemas se desplazan poco dentro de su tema. Sin número dentro del hexágono (nadie tiene daltonismo).
- E2 Modo oscuro con tres estados en Perfil: Sistema (por defecto), Claro y Oscuro. Sustituir los `bg-white` por tokens.
- E3 Pantalla de carga solo al abrir la app: el hexágono se dibuja y se rellena en duotono (menos de 1 s, respeta `prefers-reduced-motion`); logo duotone con sombra sutil.
- E4 Onboarding de máximo 3 pantallas, solo la primera vez y repetible desde Perfil; pantalla de entrada con Google mejorada (logo animado, un botón, errores amables).
- E5 Banner de asignatura: franja del color de la asignatura con nombre grande, porcentaje y marca de agua del panal.

## F. Panal y búsqueda (Sonnet; boceto aprobado antes)
- F1 Panal único: al pulsar el panal a la izquierda del título de la asignatura, una sola masa de hexágonos sin tarjetas por tema, los primeros temas abajo y los más nuevos arriba; el color indica el tema y el relleno el progreso.
- F2 Lupa discreta en cada asignatura y en el panal para buscar tema, subtema o concepto.

## G. Fin de sesión (diseño con Opus, memo breve; implementa Sonnet)
- G1 Pantalla final sin rachas (Carla descartó «Mañana vuelven N», la pregunta de recuerdo libre y «esperabas X %, sacaste Y %»): los hexágonos fijados hoy rellenándose, con lo que ha subido el progreso (el final positivo pesa en cómo se recuerda la sesión); «tus errores de hoy» con la respuesta correcta y su regla de una línea, para mirar y no teclear; mapa de cobertura de lo tocado; tiempo activo y número de preguntas; un botón con la siguiente acción. Opcional, una frase: un repaso corto antes de dormir ayuda a fijar.

## H. Economía «Trimestral» (Sonnet; muestra de Opus)
- H1 Botón «Trimestral» junto a Practicar, sin test: razonar, explicar y relacionar (PESTEL, fuerzas de Porter), problemas de PIB (auto-corregidos), y pocas definiciones concretas de nivel examen. Tipo nuevo `abierta`: escribes, pulsas «Ver respuesta», sale un modelo corto con las palabras clave en negrita y tres botones («Lo tenía», «A medias», «No») que alimentan el dominio. Piloto con un tema (~20 preguntas) antes de generar el resto.
- H2 Dibujos (flujo circular de la renta): se hacen en papel y se comparan con el esquema.

## Futuro u omitido a petición de Carla
- Funciones de examen (sin simulacro): marcar qué temas entran, plan inverso por días, mapa de riesgo, hoja final imprimible con tus errores y «Tema nuevo» en Economía con 5 preguntas previas. La tarjeta de fecha y la nota de examen que ya existen se quedan como están.
- Booklet online (Drive, almacenamiento privado o solo la fuente) y su mensaje de error.
- Funcionamiento sin conexión.
- Teclado numérico propio.
- Simulacro cronometrado.
- Borradores en vivo de lo que se escribe.
- Ideas sin implementar: concentración en el portátil (cuenta discreta de salidas de pestaña, pausa explícita, cuenta atrás al volver) y vibración (no existe en Safari de iPhone; sí en Android).
- Preguntas más difíciles en Química.

## Pendiente de confirmar por Carla
- D4 por fases y el nuevo G1.
- Un ejemplo de apartados separados (C4).
