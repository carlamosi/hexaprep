# HexaPrep (Economía) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web local de práctica tipo test (4 opciones) para Economía de Carla Monté Sihuro, con base de datos de eventos sólida, dominio por concepto y panal de dominio, práctica adaptativa y repaso por subtema, con la identidad de marca de los booklets.

**Architecture:** Backend Python (FastAPI + SQLite en modo WAL, SQLAlchemy 2 + Alembic) que guarda cada respuesta como evento inmutable y deriva dominio, repetición y sugerencias; frontend React + TypeScript + Vite + Tailwind que lo consume por HTTP en `localhost`. El banco de preguntas son archivos JSON validados que se importan de forma idempotente. La app nunca llama a ningún modelo.

**Tech Stack:** Python 3.14.6 (fallback 3.13 con `uv`), FastAPI, SQLAlchemy 2, Alembic, `fsrs`, pydantic, pytest; React, TypeScript, Vite, Tailwind CSS, Motion, D3 (escalas) con SVG propio, KaTeX, Vitest, Playwright; `@fontsource/lexend`.

**Spec:** `C:\Users\carla\Desktop\Projects\hexaprep\SPEC.md` (v0.4). Leerlo entero antes de empezar.

## Global Constraints
- Todo local en el portátil, sin cuentas, sin telemetría, sin servicios externos ni claves de API.
- Test con exactamente **4 opciones**, una correcta; las opciones se **barajan siempre** en cada aparición.
- **No hay** notas, puntuaciones, penalización, simulacro, cuenta atrás, gamificación, notas personales ni autodiagnóstico del fallo.
- Respuesta **firme al primer clic**; feedback inmediato; explicación plegada; confianza opcional (seguro, dudo, adivino); ayuda larga precargada por pregunta.
- Dificultad 1 a 5; selección apuntando a **70-80 % de acierto esperado**; test de nivel de **15 preguntas**; banco de unas **150 preguntas por tema**, difíciles desde el principio.
- IDs UUIDv7, SQLite `journal_mode=WAL`, claves foráneas activas, borrado lógico (`deleted_at`), copia de seguridad **automática semanal** verificada.
- Identidad: Lexend (400, 500, 600, 700); paleta `#0072B2` `#E69F00` `#009E73` `#CC79A7` `#D55E00` `#5854B0` `#8A5C38` `#D12630`; acento de Economía `#B05A8F`; hexágonos con relleno suave, contorno oscuro y sombra desplazada con grano; solo modo claro; **responsive desde el inicio**.
- Sin guiones largos (— ni –) en ningún texto visible. «Monté» siempre con acento. Idioma de las preguntas = idioma de la asignatura (Economía: castellano; interfaz en castellano con textos en un diccionario i18n listo para catalán).
- Cada fase termina con sus pruebas en verde y una verificación mostrada antes de darla por hecha.
- Cada paso que ejecuta un test espera primero **fallo (rojo)** y, tras implementar, **todo en verde**; se lee la salida real, no se infiere.
- El repositorio git ya existe con un commit inicial (SPEC, plan, CLAUDE.md, MODELOS.md, `.gitignore`). Se trabaja en `main`, sin remoto y sin push.

## Review Focus
1. App cerrada de golpe justo después de responder: no se pierde ninguna respuesta y la sesión se puede reanudar (Task 5).
2. Reimportar el mismo banco o una versión editada: sin duplicados y con el historial intacto (Tasks 4 y 9).
3. Pregunta reportada: queda fuera del dominio y del selector sin borrar sus eventos (Task 9).
4. Menos de 15 preguntas disponibles o concepto sin preguntas: el test de nivel y el selector no fallan y avisan (Task 7).
5. LaTeX inválido en un enunciado o PDF del booklet ausente: la pantalla no se rompe y muestra un aviso claro (Task 17).

## Estrategia de modelos y verificación
Fuente única: `docs/MODELOS.md`. Resumen: la sesión va en Sonnet 5.5 (esfuerzo medio) y delega con subagentes (`Agent` con `model`): **Opus** revisa las Tasks 5 a 8 en una sola pasada tras la 8, verifica una muestra del 10 % del banco (Task 13), produce los mockups (Task 14), implementa el panal (Task 16) y hace la revisión final; **Haiku** escribe `README.md` y `run.ps1` (Task 20). Verificación por fase: `pytest` completo en A y B; `validate_bank` más informe de muestra en C; Vitest y capturas de Playwright contra los mockups aprobados en D; recorrido e2e y criterios de aceptación de SPEC sección 13 en E.

## Estructura de archivos
```
backend/hexaprep/  ids.py db.py models.py bank.py importer.py events.py mastery.py selector.py
                   scheduling.py quality.py backup.py export.py api.py
backend/migrations/  backend/tests/
tools/  extract_booklet.py validate_bank.py generate_bank.md
banks/economia/  fuentes/  T1.json T2.json T3.json  (los tres booklets: Decisiones, Sistemas económicos, Mercado y entorno)
frontend/src/  api.ts i18n.ts tokens.css components/{HexMap,Practice,Explanation,Calendar,Charts,Editor}.tsx pages/
docs/mockups/  data/ (hexaprep.db, backups/, exports/; fuera de git)
```

---

# Fase A · Cimientos de datos

### Task 1: Entorno y esqueleto del backend
**Comando de la tarea (para `task-done`):** `pytest backend/tests/test_env.py -v`
**Files:** Create `backend/pyproject.toml`, `backend/hexaprep/__init__.py`, `backend/tests/test_env.py` (el repositorio y `.gitignore` ya existen).
**Interfaces:** Produces: paquete `hexaprep` instalable con `pip install -e backend`.
- [ ] **Step 1: Test** `test_env.py::test_dependencies_import` importa `fastapi`, `sqlalchemy`, `alembic`, `fsrs`, `pydantic`; `test_python_version` exige `sys.version_info >= (3, 13)`.
- [ ] **Step 2:** Crear `.venv`, instalar dependencias. Si alguna no instala en 3.14, recrear con `uv venv --python 3.13` y anotarlo en `README.md`.
- [ ] **Step 3:** Ejecutar `pytest backend/tests/test_env.py -v`; esperado: 2 passed.
- [ ] **Step 4: Commit** `chore: backend skeleton`.

### Task 2: Esquema SQLite, migraciones e integridad
**Comando de la tarea (para `task-done`):** `pytest backend/tests/test_db.py -v`
**Files:** Create `backend/hexaprep/ids.py`, `db.py`, `models.py`, `backend/migrations/` (Alembic), `backend/tests/test_db.py`.
**Interfaces:** Produces: `new_id() -> str` (UUIDv7); `get_engine(path: Path) -> Engine` (WAL, `foreign_keys=ON`); `check_integrity(engine) -> None` (lanza `DatabaseCorrupt`); tablas de SPEC sección 5: `asignatura, bloque, tema, subtema, concepto, fuente, pregunta, opcion, explicacion, lote, sesion, evento, intento, dominio, dominio_snapshot, reporte_calidad, ajuste, importacion, copia_seguridad`; cada tabla con `id, created_at, updated_at, deleted_at, device_id`.
- [ ] **Step 1: Tests** `test_wal_and_fk_enabled` (`PRAGMA journal_mode` es `wal`, `foreign_keys` es 1); `test_new_id_is_time_ordered` (diez ids consecutivos ordenados); `test_evento_is_append_only` (un `UPDATE` o `DELETE` sobre `evento` lanza error por trigger); `test_migrations_upgrade_from_empty`.
- [ ] **Step 2:** Verlos fallar. **Step 3:** Implementar `models.py` y la migración inicial; el trigger de solo-añadir va en la migración. **Step 4:** Pasan. **Step 5: Commit** `feat: sqlite schema and migrations`.

### Task 3: Formato y validador del banco
**Comando de la tarea (para `task-done`):** `pytest backend/tests/test_bank.py -v`
**Files:** Create `backend/hexaprep/bank.py`, `tools/validate_bank.py`, `backend/tests/test_bank.py`, `banks/_schema_example.json`.
**Interfaces:** Produces: `load_bank(path: Path) -> BankFile`; `validate_bank(path: Path) -> list[str]` (errores en una línea cada uno). Cada pregunta: `id` estable, `concepto`, `subtema`, `tema`, `dificultad` 1-5, `enunciado`, `opciones` (exactamente 4: `texto`, `trampa` salvo la correcta), `correcta` ('a'-'d'), `explicacion`, `ayuda_larga`, `fuente_pagina` (página A5 del booklet) y `fuente_cara` (cara del PDF, 1-based, para abrirlo con `#page=`).
- [ ] **Step 1: Tests** `test_rejects_three_options`, `test_rejects_two_correct_or_none`, `test_rejects_difficulty_6`, `test_rejects_duplicate_ids`, `test_rejects_missing_trap_on_wrong_option`, `test_rejects_em_dash_in_text`, `test_rejects_missing_fuente_cara`, `test_accepts_example_bank`.
- [ ] **Step 2-4:** Fallan, implementar con pydantic, pasan. **Step 5: Commit** `feat: bank schema and validator`.

### Task 4: Importador idempotente
**Comando de la tarea (para `task-done`):** `pytest backend/tests/test_importer.py -v`
**Files:** Create `backend/hexaprep/importer.py`, `backend/tests/test_importer.py`.
**Interfaces:** Consumes `BankFile`. Produces: `import_bank(session: Session, bank: BankFile) -> ImportReport` con `created, updated, unchanged: int`; una pregunta cuyo contenido cambia crea una **versión nueva** con el mismo `id` lógico; registra una fila en `importacion` con el hash del archivo.
- [ ] **Step 1: Tests** `test_import_twice_creates_nothing_new` (segunda vez `unchanged == n`); `test_edited_question_bumps_version`; `test_reimport_keeps_attempt_history` (un intento previo sigue enlazado tras reimportar una versión editada); `test_unknown_concept_is_created_under_subtema`.
- [ ] **Step 2-4:** Fallan, implementar, pasan. **Step 5: Commit** `feat: idempotent bank import`.

### Task 5: Eventos y respuestas con guardado inmediato
**Comando de la tarea (para `task-done`):** `pytest backend/tests/test_events.py -v`
**Files:** Create `backend/hexaprep/events.py`, `backend/tests/test_events.py`.
**Interfaces:** Produces: `start_session(session, modo: str, filtro: dict) -> str`; `record_event(session, sesion_id: str, tipo: str, pregunta_id: str | None, payload: dict, t_cliente: datetime) -> str`; `submit_answer(session, sesion_id: str, pregunta_id: str, orden_opciones: list[str], elegida: str, confianza: str | None, tiempos: dict) -> AnswerResult(correcta: bool, opcion_correcta: str, trampa: str | None)`; `resume_session(session, sesion_id: str) -> SessionState`. Cada llamada hace commit propio y deriva la fila `intento` (opción inicial y final, nº de cambios, orden barajado, tiempos, hora del día, posición en la sesión, nº intento previo, intervalo desde el anterior).
- [ ] **Step 1: Tests** `test_answer_committed_before_return`; `test_answer_survives_process_kill` (subproceso que responde y se mata con `os._exit`; al reabrir el `.db` el evento y el intento existen y `resume_session` devuelve la pregunta siguiente); `test_intento_records_trap_chosen`; `test_option_changes_counted`; `test_confidence_is_optional`.
- [ ] **Step 2-4:** Fallan, implementar, pasan. **Step 5: Commit** `feat: event store and answers`.

---

# Fase B · Motor de aprendizaje

### Task 6: Dominio por concepto
**Comando de la tarea (para `task-done`):** `pytest backend/tests/test_mastery.py -v`
**Files:** Create `backend/hexaprep/mastery.py`, `backend/tests/test_mastery.py`.
**Interfaces:** Produces: `expected_correct(theta: float, dificultad: int) -> float` = `sigmoid(theta - (dificultad - 3) * 0.8)`; `update(theta: float, sigma: float, dificultad: int, correcta: bool) -> tuple[float, float]`; `percent(theta: float) -> int` = `round(100 * sigmoid(theta))`; `aggregate(session, nivel: Literal["subtema", "tema", "asignatura"], id: str) -> float` (media ponderada por nº de conceptos con intentos); `snapshot_daily(session, fecha: date) -> None`.
- [ ] **Step 1: Tests** `test_correct_raises_theta_wrong_lowers`; `test_hard_correct_raises_more_than_easy_correct`; `test_uncertainty_shrinks_with_attempts`; `test_percent_of_zero_theta_is_50`; `test_excluded_questions_do_not_count` (preparado para Task 9).
- [ ] **Step 2-4:** Fallan, implementar, pasan. **Step 5: Commit** `feat: mastery model`.

### Task 7: Selector adaptativo y test de nivel
**Comando de la tarea (para `task-done`):** `pytest backend/tests/test_selector.py -v`
**Files:** Create `backend/hexaprep/selector.py`, `backend/tests/test_selector.py`.
**Interfaces:** Consumes `mastery.expected_correct`. Produces: `next_question(session, sesion_id: str, filtro: Filtro) -> QuestionOut | None` con opciones ya barajadas (semilla distinta por aparición); `placement_test(session, asignatura_id: str) -> list[QuestionOut]` de 15; `Filtro(asignatura_id, tema_id=None, subtema_id=None, solo_fallos=False)`.
- [ ] **Step 1: Tests** `test_picks_question_closest_to_75_percent`; `test_never_repeats_question_in_session`; `test_failed_concept_returns_with_different_question_within_5_picks`; `test_options_reshuffled_each_time`; `test_placement_has_15_spread_across_concepts`; `test_placement_with_fewer_than_15_returns_all_and_warns`; `test_concept_without_questions_is_skipped`; `test_subtema_filter_returns_only_that_subtema_without_limit`.
- [ ] **Step 2-4:** Fallan, implementar, pasan. **Step 5: Commit** `feat: adaptive selector and placement test`.

### Task 8: Repetición espaciada y sugerencia de hoy
**Comando de la tarea (para `task-done`):** `pytest backend/tests/test_scheduling.py -v`
**Files:** Create `backend/hexaprep/scheduling.py`, `backend/tests/test_scheduling.py`.
**Interfaces:** Produces: `rate(correcta: bool, confianza: str | None) -> Rating` (fallo = Again; acierto con «seguro» = Good; acierto con «dudo» = Hard; acierto «adivino» = Hard; acierto sin confianza = Good); `schedule(card_state: dict | None, rating: Rating, now: datetime) -> dict`; `suggestions(session, now: datetime, n: int = 5) -> list[Suggestion]` (concepto, motivo, ganancia esperada de dominio por minuto + riesgo de olvido). Un estado FSRS por concepto. Antes de implementar, consultar la API actual de `fsrs` con context7.
- [ ] **Step 1: Tests** `test_again_shortens_interval`; `test_good_lengthens_interval`; `test_suggestions_ordered_by_gain_and_forgetting`; `test_suggestions_with_empty_history_return_placement_hint`.
- [ ] **Step 2-4:** Fallan, implementar, pasan. **Step 5: Commit** `feat: spaced repetition and suggestions`.

### Task 9: Calidad del banco: reportar, editar, exportar
**Comando de la tarea (para `task-done`):** `pytest backend/tests/test_quality.py -v`
**Files:** Create `backend/hexaprep/quality.py`, `backend/tests/test_quality.py`.
**Interfaces:** Produces: `report_question(session, pregunta_id: str, motivo: str) -> None`; `edit_question(session, pregunta_id: str, cambios: dict) -> int` (devuelve la nueva versión); `export_bank(session, asignatura_id: str, path: Path) -> None` (JSON que pasa `validate_bank`).
- [ ] **Step 1: Tests** `test_reported_question_excluded_from_mastery_and_selector`; `test_report_keeps_all_events`; `test_edit_creates_new_version_and_keeps_history`; `test_export_roundtrip_matches_import` (exportar y reimportar da `unchanged`).
- [ ] **Step 2-4:** Fallan, implementar, pasan. **Step 5: Commit** `feat: report, edit and export questions`.

### Task 10: Copias de seguridad y exportaciones
**Comando de la tarea (para `task-done`):** `pytest backend/tests/test_backup.py -v`
**Files:** Create `backend/hexaprep/backup.py`, `export.py`, `backend/tests/test_backup.py`.
**Interfaces:** Produces: `backup_now(db_path: Path, dest_dir: Path) -> Path` (API de backup de SQLite); `verify_backup(path: Path) -> bool` (`integrity_check` y recuento de eventos); `restore(path: Path, db_path: Path) -> None`; `maybe_weekly_backup(db_path, dest_dir, now: datetime) -> Path | None` (solo si la última copia tiene 7 días o más); `export_weak(session, n: int, path: Path) -> None` (`weak.json` con conceptos más débiles); `export_events_csv(session, path: Path) -> None`.
- [ ] **Step 1: Tests** `test_backup_is_verifiable`; `test_restore_recovers_all_events`; `test_weekly_backup_skips_when_recent`; `test_weekly_backup_runs_after_7_days`; `test_corrupted_backup_fails_verification`.
- [ ] **Step 2-4:** Fallan, implementar, pasan. **Step 5: Commit** `feat: backups and exports`.

### Task 11: API HTTP
**Comando de la tarea (para `task-done`):** `pytest backend -v`
**Files:** Create `backend/hexaprep/api.py`, `backend/tests/test_api.py`.
**Interfaces:** Consumes todo lo anterior. Produces: `GET /api/subjects`; `GET /api/map/{asignatura_id}` (hexágonos con `concepto_id`, `nombre`, `percent`, `subtema_id`); `POST /api/sessions` (`modo`, `filtro`); `GET /api/sessions/{id}/next`; `POST /api/answers`; `POST /api/questions/{id}/report`; `PUT /api/questions/{id}`; `GET /api/suggestions`; `GET /api/history` (días estudiados y evolución por subtema); `POST /api/backup`; `POST /api/export/weak`; `GET /api/booklet/{fuente_id}` (sirve el PDF; el frontend lo abre en `#page={fuente_cara}`). Arranque con `python -m hexaprep` y `maybe_weekly_backup` al iniciar.
- [ ] **Step 1: Tests** (`TestClient`) `test_map_returns_zero_percent_on_first_run`; `test_full_answer_flow_over_http`; `test_booklet_missing_returns_404_with_message`.
- [ ] **Step 2-4:** Fallan, implementar, pasan; ejecutar toda la suite: `pytest backend -v`, esperado todo en verde. **Step 5: Commit** `feat: http api`. **Gate de fase A y B:** mostrar la salida completa de `pytest`.

---

# Fase C · Banco de Economía

### Task 12: Extractor de booklets
**Comando de la tarea (para `task-done`):** `pytest backend/tests/test_extract.py -v`
**Files:** Create `tools/extract_booklet.py`, `backend/tests/test_extract.py`, fixture `backend/tests/fixtures/mini_booklet.pdf`.
**Interfaces:** Produces: `extract(pdf: Path) -> list[BlockText]` (`bloque`, `pagina` A5, `cara` del PDF, `texto`) con `pdftotext -enc UTF-8`; `to_markdown(blocks) -> str`. **Los booklets son hojas A4 apaisadas con dos páginas A5 cada una** (imposición para grapar): `extract` recorta cada cara en mitad izquierda y derecha (`pdftotext -x -y -W -H`) para no mezclar las dos páginas, y recompone el orden con la imposición de la skill: con T páginas A5 (T = 2 × nº de caras), la cara `2i` (0-based) lleva `[T-1-2i | 2i]` y la cara `2i+1` lleva `[2i+1 | T-2-2i]` (índices 0-based de página A5; la 0 es la portada y la T-1 la contraportada).
- [ ] **Step 1: Tests** `test_extract_keeps_accents`; `test_landscape_face_splits_into_two_a5_pages_without_interleaving`; `test_imposition_maps_faces_to_a5_pages` (T = 16 con 8 caras: cara 0 = `[15 | 0]`, cara 1 = `[1 | 14]`); `test_pages_are_1_based`; `test_blocks_follow_index_order`. **Step 2-4:** implementar. **Step 5:** comprobar que los tres PDF ya están en `banks/economia/fuentes/` (`Economia_T1_Decisiones.pdf` 6 caras, `Economia_T2_Sistemas.pdf` 10 caras, `Economia_T3_Mercado_y_entorno.pdf` 8 caras; si falta alguno, detenerse y avisar a Carla). **Commit** `feat: booklet extractor`.

### Task 13: Generación y verificación del banco
**Comando de la tarea (para `task-done`):** `python tools/validate_bank.py banks/economia/T1.json banks/economia/T2.json banks/economia/T3.json`
**Files:** Create `tools/generate_bank.md` (procedimiento y prompt versionado), `banks/economia/T1.json`, `T2.json`, `T3.json`, `docs/verificacion-banco.md`.
- [ ] **Step 1:** Por cada booklet, extraer el texto con `extract_booklet.py` (sin leer el PDF en imágenes).
- [ ] **Step 2:** Generar con Sonnet 5.5 por bloques, unas 150 preguntas por tema: difíciles, 4 opciones, una correcta, trampa nombrada en cada incorrecta, explicación, ayuda larga, dificultad 1-5 repartida, `fuente_pagina` y `fuente_cara` (del extractor), castellano, sin guiones largos.
- [ ] **Step 3:** `python tools/validate_bank.py banks/economia/*.json`; esperado: 0 errores y recuento por tema entre 140 y 160.
- [ ] **Step 4:** Opus 5.5 verifica una muestra del 10 % (respuesta correcta, ambigüedad, trampa plausible); anotar fallos en `docs/verificacion-banco.md`. Si más del 5 % de la muestra falla, regenerar ese bloque. **Step 5: Commit** `feat: economia question bank`.

---

# Fase D · Diseño y frontend

### Task 14: Mockups aprobados (puerta de diseño)
**Comando de la tarea (para `task-done`):** `python -c "import pathlib; assert pathlib.Path('docs/mockups/APROBADO.md').exists()"`
**Files:** Create `docs/mockups/*.html` (estáticos), `docs/mockups/APROBADO.md`.
- [ ] **Step 1:** Ofrecer el acompañante visual y producir mockups navegables de: Inicio (panal), Subtema, Práctica (pregunta, confianza opcional, feedback, explicación plegada), Repaso de fallos, Sugerencia de hoy, Test de nivel, Historial, Ajustes. Con tokens reales de marca y datos de ejemplo de Economía.
- [ ] **Step 2:** Carla revisa y corrige; repetir hasta aprobar. **Step 3:** Registrar la aprobación y la decisión de idioma de la interfaz en `APROBADO.md`. **Nada de frontend hasta entonces.** **Commit** `docs: approved mockups`.

### Task 15: Esqueleto del frontend y tokens de marca
**Comando de la tarea (para `task-done`):** `cd frontend && npx vitest run tests/tokens.test.ts tests/copy.test.ts`
**Files:** Create `frontend/` (Vite, React, TS, Tailwind), `frontend/src/tokens.css`, `i18n.ts`, `api.ts`, `frontend/tests/tokens.test.ts`, `frontend/tests/copy.test.ts`.
**Interfaces:** Produces: tokens CSS para la paleta y Lexend; `t(key: string): string`; cliente tipado para cada endpoint de Task 11.
- [ ] **Step 1: Tests** `tokens.test.ts::palette_matches_spec` (los 8 colores y `#B05A8F`); `copy.test.ts::no_em_dashes_in_ui_strings` (ningún `—` ni `–` en `src/**`).
- [ ] **Step 2-4:** Implementar y pasar. **Step 5: Commit** `feat: frontend skeleton`.

### Task 16: Panal de dominio e inicio
**Comando de la tarea (para `task-done`):** `cd frontend && npx vitest run tests/HexMap.test.tsx`
**Files:** Create `frontend/src/components/HexMap.tsx`, `pages/Home.tsx`, `frontend/tests/HexMap.test.tsx`.
**Interfaces:** Consumes `GET /api/map`. Produces: `<HexMap hexes: Hex[] onSelect: (subtemaId: string) => void />`; el relleno crece con `percent`; microanimación al cambiar.
- [ ] **Step 1: Tests** `renders_zero_percent_hexes_on_first_run`; `fill_level_matches_percent`; `click_calls_onSelect_with_subtema`; `keyboard_focus_visible`.
- [ ] **Step 2-4:** Implementar según el mockup aprobado. **Step 5: Commit** `feat: mastery honeycomb`.

### Task 17: Pantalla de práctica
**Comando de la tarea (para `task-done`):** `cd frontend && npx vitest run tests/Practice.test.tsx`
**Files:** Create `frontend/src/components/Practice.tsx`, `Explanation.tsx`, `frontend/tests/Practice.test.tsx`.
**Interfaces:** Consumes `GET /api/sessions/{id}/next`, `POST /api/answers`, `POST /api/questions/{id}/report`.
- [ ] **Step 1: Tests** `answers_with_keys_a_to_d_and_1_to_4`; `first_click_is_final`; `explanation_collapsed_by_default`; `confidence_buttons_optional`; `report_button_marks_question`; `invalid_latex_falls_back_to_plain_text`; `missing_booklet_pdf_shows_clear_message`; `long_help_shown_on_demand`.
- [ ] **Step 2-4:** Implementar con KaTeX protegido por `try/catch`. **Step 5: Commit** `feat: practice screen`.

### Task 18: Test de nivel, repaso de subtema y de fallos
**Comando de la tarea (para `task-done`):** `cd frontend && npx vitest run tests/flows.test.tsx`
**Files:** Create `frontend/src/pages/{Placement,Subtopic,Review}.tsx`, `frontend/tests/flows.test.tsx`.
- [ ] **Step 1: Tests** `placement_runs_15_questions_then_updates_map`; `subtopic_drill_has_no_batch_limit`; `review_groups_failures_by_trap_with_booklet_link`; `suggestions_page_lists_concepts_with_reason` (página `Suggestions.tsx` que consume `GET /api/suggestions`; el inicio no muestra mensajes, solo el panal).
- [ ] **Step 2-4:** Implementar y pasar. **Step 5: Commit** `feat: placement, subtopic, review and suggestions flows`.

### Task 19: Historial, ajustes y editor de preguntas
**Comando de la tarea (para `task-done`):** `cd frontend && npx vitest run tests/history.test.tsx`
**Files:** Create `frontend/src/components/{Calendar,Charts,Editor}.tsx`, `pages/{History,Settings}.tsx`, `frontend/tests/history.test.tsx`.
- [ ] **Step 1: Tests** `calendar_marks_studied_days_without_streaks`; `chart_shows_mastery_evolution_per_subtopic`; `editor_saves_new_version_and_exports`; `settings_triggers_backup_and_shows_last_one`; `settings_exports_weak_json_and_events_csv`.
- [ ] **Step 2-4:** Implementar y pasar. **Step 5: Commit** `feat: history, settings and editor`.

---

# Fase E · Cierre

### Task 20: Recorrido completo, arranque y verificación final
**Comando de la tarea (para `task-done`):** `pytest backend -v && cd frontend && npx vitest run && npx playwright test`
**Files:** Create `frontend/e2e/journey.spec.ts`, `README.md`, `run.ps1`.
- [ ] **Step 1: Test e2e (Playwright)** `journey`: importar banco, hacer el test de nivel, practicar con teclado, abrir una explicación, reportar una pregunta, ver el panal actualizado, forzar copia de seguridad y restaurarla; capturas de cada pantalla.
- [ ] **Step 2:** `run.ps1` arranca backend y sirve el frontend compilado con un solo comando; `README.md` documenta instalación y uso.
- [ ] **Step 3:** Ejecutar `pytest backend`, `vitest` y `playwright test`; esperado todo en verde. Comparar capturas con los mockups.
- [ ] **Step 4:** Revisar los criterios de aceptación de SPEC sección 13 uno a uno, mostrando la evidencia. **Step 5: Commit** `chore: v1 verified`.
