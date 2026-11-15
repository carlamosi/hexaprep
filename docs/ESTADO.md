# Estado del proyecto (traspaso entre conversaciones)

## Qué está hecho
Las 20 tareas del plan `docs/superpowers/plans/2026-11-14-hexaprep-economia.md` están ejecutadas y commiteadas en `main` (sin remoto, sin push). La v1 funciona de punta a punta.

Última verificación: `pytest backend` 99 en verde, `vitest` 49 en verde, `tsc` y `vite build` limpios, `playwright test` 2 en verde (recorrido completo y responsive a 375 px). Los bancos de Economía validan con 0 errores: T1 149, T2 154 y T3 145 preguntas.

## Novedades tras la v1 (2026-11-15)
- Practicar por tema (botón en cada tema del panal), avance automático (1 s acierto, 2,5 s fallo) y panel de asignatura en pantalla completa al pulsar el hexágono grande.
- Tipos de pregunta nuevos: `vf` (2 opciones) y `problema` (número sin unidades, margen del 1 %, botón «Lo he hecho bien» que corrige el intento y recalcula el dominio). Selector de asignatura en la cabecera.
- Química T2 (catalán): 161 preguntas (80 test, 42 vf, 39 problemas) en `banks/quimica/` (fuentes en `src/T2/`, formato en `FORMATO.md`). Reconstruir con `python tools/build_quimica.py banks/quimica/src/T2 banks/quimica/T2.json`; el script recalcula cada problema con su expresión. Importar con `tools/import_bank.py banks/quimica/T2.json`.
- Verificación: muestra de 20 revisada por Opus (`docs/verificacion-quimica.md`), 2 fallos: uno corregido (trampa de qui-t2-0078), otro menor sin corregir (qui-t2-0150 cita la página 23 y la frase está en la 10). El resto del banco no tiene revisión humana ni de modelo.
- Historial de analista (`/api/analytics`, `backend/hexaprep/analytics.py`; UI en `frontend/src/components/historial/`), selector de asignatura con tarjetas y teclado, y panel de asignatura rediseñado. Para ver el historial con datos hay un generador de datos simulados fuera del repositorio (no usar con la base real); la base real solo tenía 6 respuestas.
- Pendiente del historial: contraste AA sin medir con herramienta; los colores de tema 7 y 8 (marrón y carmín) se confunden con daltonismo; el tiempo de lectura de la explicación sigue sin registrarse.
- Matemáticas 1º Bachillerato (castellano): 126 problemas, SIN test ni verdadero/falso (decisión de Carla). 112 del simulacro trimestral II (ecuaciones, sistemas, inecuaciones, problemas, matrices) y 14 de Gauss (sin PDF: no tiene botón de booklet). Reconstruir con `python tools/build_quimica.py banks/mates/src/S banks/mates/S.json` y lo mismo con `src/G` y `G.json`. Formato en `banks/mates/FORMATO.md`. Cada problema trae una `expr` independiente (fuerza bruta o fórmula) que el script compara con la solución. Muestra de 26 revisada por Opus (`docs/verificacion-mates.md`): 0 críticos y 5 menores ya corregidos.
- Respuestas de problemas: un número, una fracción (3/4) o varios valores separados por `;` (o ` y `). `ordenada: true` si el orden importa (sistemas, matrices fila a fila). Margen del 1 % por valor.
- Orden del temario: el importador guarda el orden de aparición de temas y subtemas del banco (antes salían por orden alfabético). Al reimportar, los bancos antiguos con todos los subtemas en 0 se reordenan solos: cambió el orden de los subtemas de Economía y Química en el panal.
- Pulido (2026-11-15, decisiones de Carla): saltar pregunta (vuelve tras 3 respuestas), sin botones de confianza, sin test de nivel, botones «Solo test y V/F» y «Solo problemas» en las asignaturas que tienen ambos, preguntas con imagen en Química (pictogramas y material recortados del booklet con `tools/extract_quimica_img.py` en `banks/quimica/img/`, servidas por `/api/imagen/...`) y problemas con apartados (enunciado común, un apartado por pregunta, se sirven seguidos; en la base: columnas `grupo`, `contexto`, `apartado`, migración 0002).
- Selección de preguntas con criterios de neuroeducación (`backend/hexaprep/selector.py`, cabecera del módulo): objetivo de acierto del 60 %, conocimiento previo supuesto (empieza difícil), intercalado de conceptos y tipos, repaso espaciado, sorteo entre las 5 mejores. Constantes ajustables arriba del archivo.
- Respuestas: se acepta notación científica (`2,24e22`, `2,24·10^22`, `2,24x10^22`), fracciones y varios valores con `;`.
- Química: 254 preguntas (132 test, 50 V/F, 72 problemas, 40 imágenes); Matemáticas: 147 problemas. Muestras revisadas por Opus: `docs/verificacion-quimica.md`, `docs/verificacion-mates.md`, `docs/verificacion-nuevo.md`.
- Ampliación con tus apuntes (2026-11-15): Economía +64 test desde los apuntes T1 a T3 (`banks/economia/src/A1..A3`); Química tema 3 Formulació orgànica (84 test y 27 V/F, `banks/quimica/src/T3`); Matemáticas +158 problemas del libro de Álgebra, las hojas, el examen y los ejercicios de matrices (subtemas nuevos: valor absoluto y potencias, radicales y logaritmos); asignatura nueva Català, normativa general (90 test y 30 V/F, `banks/catala/src/N1`). Total 1280 preguntas. Cada carpeta `src/X` se construye con `python tools/build_quimica.py banks/<asignatura>/src/X banks/<asignatura>/X.json` y se importa con `tools/import_bank.py`. Los textos extraídos de los PDF están en `banks/<asignatura>/texto/` (`tools/extract_apuntes.py`).
- Reglas para ampliar sin romper nada: los archivos nuevos de una carpeta `src` se numeran DESPUÉS de los existentes (el id de cada pregunta depende de su posición) y no se editan los antiguos; `backend/tests/test_bancos_reales.py` comprueba que todos los bancos validan, que no hay ids repetidos y que las imágenes existen.
- Revisiones de Opus: `docs/verificacion-ampliacion-a.md` (Mates y Economía) y `-b.md` (Química orgánica y Català); los fallos críticos (matrices sin orden, dos frases de català discutibles) ya están corregidos. Ojo: la `ayuda_larga` de cada concepto puede contener la respuesta de alguna pregunta si se abre antes de responder.
- Los PDF fuente están en `banks/<asignatura>/fuentes/` con nombres claros; `docs/FUENTES.md` lista el nombre original de cada uno.
- Límites: el editor de la app no muestra la solución de un problema; el booklet de Química no trata % en masa ni molaridad, así que no hay problemas de eso.

## Cómo se prueba
- Atajo: `.venv\Scripts\python tools\import_bank.py banks\economia\T1.json banks\economia\T2.json banks\economia\T3.json` y luego `.venv\Scripts\python -m hexaprep`; se abre http://127.0.0.1:8000.
- Un solo comando: `powershell -ExecutionPolicy Bypass -File .\run.ps1` (solo comprobado de sintaxis, no de punta a punta).
- Para no tocar los datos reales: `$env:HEXAPREP_DATA="C:\temp\hexaprep-prueba"`; puerto con `$env:HEXAPREP_PORT`.
- Pruebas: `.venv\Scripts\python -m pytest backend`, `cd frontend` y `npx vitest run`, `npx playwright test` (usa su propia carpeta de datos). Para el frontend tras cambios: `npm run build` (el backend sirve `frontend/dist`).
- Más detalle de uso en `README.md`.

## Dónde mirar
- Qué y por qué: `SPEC.md`. Plan: el de `docs/superpowers/plans/`. Modelos por tarea: `docs/MODELOS.md`.
- Decisiones tomadas durante la ejecución («Ruling:») y menores aplazados («minor (deferred)»): `.superpowers/sdd/2026-11-14-hexaprep-economia/progress.md` (ignorado por git, existe solo en esta carpeta).
- Mockups aprobados y decisiones de diseño: `docs/mockups/` y `docs/mockups/APROBADO.md`.
- Verificación del banco: `docs/verificacion-banco.md`. Procedimiento de generación: `tools/generate_bank.md`.
- Banco: fuentes compactas en `banks/economia/src/Tn/` y `tools/build_bank.py` para reconstruir `T1.json`, `T2.json`, `T3.json`; `tools/patch_traps.py` para reescribir trampas.

## Pendiente conocido (menores aplazados)
- La navegación sigue visible en la práctica de subtema; el mockup la oculta. Subtema, Hoy, Historial y Ajustes son más sobrios que los mockups.
- No se registra el tiempo de lectura de la explicación (falta un endpoint de eventos).
- Los fallos del repaso de una sesión reanudada no se reconstruyen (viven en el cliente).
- La API no valida la cabecera Host (bastaría `TrustedHostMiddleware` con 127.0.0.1 y localhost).
- `POST /api/sessions` sin `asignatura_id` da 500 (debería ser 422); `PUT /api/questions/{id}` con id desconocido da 422 (debería ser 404).
- Si falla la copia semanal al arrancar, impide arrancar la app. `verify_backup` deja `-wal` y `-shm` junto a cada copia.
- `report_question` recalcula solo el concepto de la versión vigente; un concepto renombrado en el banco deja un hexágono vacío.
- No medido el contraste AA con herramienta (los colores salen de los mockups). Las 211 trampas reescritas del banco no pasaron una segunda muestra de Opus.

## Siguientes pasos propuestos (en este orden)
1. **Carla prueba la app** y anota lo que no le cuadre (idioma, panal, textos, colores). Los cambios pequeños los hace Sonnet; un rediseño grande, Opus.
2. **Probar `run.ps1` de punta a punta** en una copia limpia del proyecto.
3. **Acercar las pantallas secundarias a los mockups** (navegación oculta en práctica, Subtema, Hoy, Historial, Ajustes) y medir el contraste AA con una herramienta (por ejemplo axe dentro de Playwright).
4. **Saldar los menores de seguridad y robustez** de la lista de arriba (Host, códigos 422 y 404, copia semanal que no bloquee el arranque).
5. **Mejorar el banco**: segunda muestra de Opus sobre las trampas reescritas; reponer preguntas de los conceptos más débiles con `weak.json` cuando Carla tenga datos de uso.
6. **Ampliar el producto** (SPEC 16): catalán en la interfaz, más asignaturas de la PAU de Cataluña, verdadero/falso y tablas de catalán con FSRS, uso desde el móvil por la WiFi local.

Cada paso nuevo con lógica va por `superpowers:test-driven-development` y se cierra con `superpowers:verification-before-completion`.
