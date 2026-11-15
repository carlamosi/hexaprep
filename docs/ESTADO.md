# Estado del proyecto (traspaso entre conversaciones)

## Qué está hecho
Las 20 tareas del plan `docs/superpowers/plans/2026-11-14-hexaprep-economia.md` están ejecutadas y commiteadas en `main` (sin remoto, sin push). La v1 funciona de punta a punta.

Última verificación: `pytest backend` 99 en verde, `vitest` 49 en verde, `tsc` y `vite build` limpios, `playwright test` 2 en verde (recorrido completo y responsive a 375 px). Los bancos de Economía validan con 0 errores: T1 149, T2 154 y T3 145 preguntas.

## Novedades tras la v1 (2026-11-15)
- Practicar por tema (botón en cada tema del panal), avance automático (1 s acierto, 2,5 s fallo) y panel de asignatura en pantalla completa al pulsar el hexágono grande.
- Tipos de pregunta nuevos: `vf` (2 opciones) y `problema` (número sin unidades, margen del 1 %, botón «Lo he hecho bien» que corrige el intento y recalcula el dominio). Selector de asignatura en la cabecera.
- Química T2 (catalán): 161 preguntas (80 test, 42 vf, 39 problemas) en `banks/quimica/` (fuentes en `src/T2/`, formato en `FORMATO.md`). Reconstruir con `python tools/build_quimica.py banks/quimica/src/T2 banks/quimica/T2.json`; el script recalcula cada problema con su expresión. Importar con `tools/import_bank.py banks/quimica/T2.json`.
- Verificación: muestra de 20 revisada por Opus (`docs/verificacion-quimica.md`), 2 fallos: uno corregido (trampa de qui-t2-0078), otro menor sin corregir (qui-t2-0150 cita la página 23 y la frase está en la 10). El resto del banco no tiene revisión humana ni de modelo.
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
- Con menos de 15 preguntas el test de nivel sigue mostrando «n de 15» y el aviso desaparece al terminar; un subtema sin preguntas acaba en «Sin fallos».
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
