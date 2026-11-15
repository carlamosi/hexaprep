# HexaPrep · Especificación del producto (v0.4)

Documento para arrancar una conversación nueva con el contexto limpio. Léelo entero antes de proponer nada. Las decisiones de la sección 14 son de la usuaria (respondidas en un cuestionario); lo marcado **[PROPUESTA]** es una interpretación o decisión mía pendiente de confirmar. No hay simulacro, ni notas, ni penalización, ni cuenta atrás en la v1.

## 1. Qué es y por qué
App web **local** (solo en el portátil de Carla, sin cuentas, sin nube, sin publicación) para practicar exámenes **tipo test** y convertir cada respuesta en datos que le dicen **qué falla, por qué y qué estudiar ahora** para maximizar la nota. Empieza por Economía (parciales siempre tipo test, 4 opciones). Después se amplía a otras asignaturas con el mismo motor (verdadero/falso con justificación, tablas de catalán con repetición espaciada). **Visión a medio plazo:** un **hub de selectividad (PAU)** con todas las asignaturas, donde se pueda repasar un subtema concreto y ver cuánto lo domina (sección 16). El modelo de datos debe nacer pensado para eso.

Éxito = que Carla sienta que la app la conoce, que le ahorra tiempo de estudio y que la nota real sube. El nivel de acabado debe ser el de un producto de consultora tecnológica de primera: nada decadente, nada a medias.

## 2. Usuaria y contexto
- Carla Monté Sihuro (siempre «Monté» con acento), Bachillerato. Detallista con el diseño: el aspecto importa tanto como la función.
- Windows 11. Tiene Python 3.14.6 (con SQLite 3.50), Node 24 y git. No tiene Flask, FastAPI ni Streamlit instalados.
- Genera sus apuntes con la skill `slides-to-booklet` (booklets A5 y exámenes A4). **El contenido de las preguntas sale de esos booklets** (PDF de Economía, p. ej. `Economia_T3_Mercado_y_entorno.pdf`).
- Test de Economía: **4 opciones**. La app **no pone notas ni penaliza**: solo marca cuándo una respuesta es incorrecta. Tampoco hay cuenta atrás al examen (practicar tres semanas antes o la víspera es indiferente).

## 3. Metas, no metas y antimetas
**Metas:** base de datos sólida que no pierde ni una respuesta, diagnóstico por error, repetición inteligente, dificultad progresiva, panel de dominio visual, plan de estudio hasta la fecha del examen, identidad de marca impecable, todo offline.
**No metas (de momento):** notas o puntuaciones, penalizaciones, cuenta atrás a fechas de examen, multiusuario, login, despliegue público, app móvil nativa, pagos, IA en tiempo real dentro de la app.
**Antimetas (fracaso aunque funcione):** interfaz genérica tipo plantilla, preguntas con errores de contenido, lentitud al responder, perder datos, gastar créditos en cada sesión de estudio, depender de claves de API.

## 4. Funcionalidades
### Primera versión (MVP)
1. **Test de nivel inicial de 15 preguntas** por asignatura: fija el punto de partida de cada concepto. El banco es **difícil desde el principio** (preguntas de nivel examen, con distractores trampa).
2. **Práctica adaptativa** libre (sin duración fija de sesión): selecciona preguntas donde Carla acierta ~70-80 % sobre ese nivel, mezcla temas y reintroduce lo fallado con **otra** pregunta del mismo concepto.
3. **Feedback inmediato** tras cada respuesta, tono breve tipo entrenador: qué falló, por qué y la regla para recordarlo.
4. **Confianza opcional** (botón seguro / dudo / adivino) antes de ver la respuesta. Detecta errores seguros y aciertos por suerte.
5. **Diagnóstico por error:** cada opción incorrecta lleva una etiqueta de trampa; se registra qué trampa elige.
6. **Panal de dominio (pantalla de inicio):** cada concepto es un hexágono de la identidad de marca, relleno según el dominio, con el porcentaje de dominio por concepto, subtema y asignatura. Sin nota ni cuenta atrás.
7. **«Qué conviene repasar ahora»:** conceptos ordenados por ganancia esperada de dominio por minuto y por riesgo de olvido.
8. **Sugerencia de hoy** (secundaria): qué practicar según dominio y olvido, sin depender de fechas. Las sesiones son libres.
9. **Repaso de fallos** (tipo autopsia): al terminar una sesión, los fallos agrupados por tipo de confusión, con enlace a la página del booklet.
10. **Exportar `weak.json`** con los conceptos más débiles; reposición de preguntas **por lotes** al generar un booklet y **bajo demanda** cuando la app detecta flaquezas.
11. **Copia de seguridad automática semanal** en una carpeta local, verificada, más exportación e importación manuales.
12. **Repaso por subtema:** elegir un subtema, practicarlo y ver su dominio y su historial.
13. **Guardado inmediato:** cada respuesta se guarda al pulsar, sin botón de guardar; una sesión interrumpida se puede reanudar.
14. **Reportar pregunta:** botón que la marca como mal formulada o dudosa y la **excluye de las estadísticas**.
15. **Editor de preguntas dentro de la app:** corregir enunciado, opciones o ayuda y **exportar** al banco JSON (ida y vuelta, con versión nueva de la pregunta).
16. **Historial doble:** calendario de días estudiados (sin rachas ni presión) y gráficos de evolución del dominio por subtema.

### Detalles de uso decididos
- **Teclado y ratón** ambos funcionan (A a D o 1 a 4 para responder, Enter para continuar), sin mostrar atajos en pantalla.
- **Respuesta firme al primer clic**, sin confirmación ni deshacer.
- **Las opciones se barajan siempre**, en cada aparición de la pregunta.
- **Explicación plegada** tras responder: se abre si se quiere, y el tiempo de lectura se registra.
- **Ayuda larga precargada** en cada pregunta del banco (texto más extenso para entender el concepto); no hay botón que copie prompts.
- **Fórmulas bien escritas (LaTeX)** y **gráficos sencillos** dentro de las preguntas.
- **Enlace al booklet:** botón que abre el PDF en la página exacta del concepto.
- **Repaso de subtema:** todas las preguntas del subtema, sin límite de tanda.
- **Al abrir tras días sin usarla:** solo el panal, sin mensajes ni reproches.

### No en la v1 (decisión de la usuaria)
Simulacro cronometrado · gamificación (sin rachas, logros ni niveles) · autodiagnóstico del fallo (no se pregunta) · notas personales por pregunta · botón de ayuda con Claude · registro de exámenes en papel · móvil (pero el diseño debe ser responsive desde el inicio para añadirlo después en la WiFi local).

### Más adelante
Verdadero/falso con justificación · tablas de catalán (participis y gerundis irregulares) con repetición espaciada FSRS · palabras trampa («siempre», «nunca») · tiempo por pregunta · examen personalizado en PDF vía `make_exam.py` · uso desde el móvil.

## 5. Datos y base de datos
**Principios.** La fuente de verdad es un **registro de eventos que solo se añade, nunca se edita**. Dominio, estadísticas y paneles son derivados y se pueden reconstruir. SQLite en modo WAL con claves foráneas, cada respuesta en su propia transacción en el instante de pulsar, migraciones versionadas (Alembic), comprobación de integridad al arrancar, copias con la API de backup de SQLite y **restauración probada**. Identificadores UUIDv7 (ordenables y sin colisión) con `device_id`, `created_at`, `updated_at` y `deleted_at` (borrado lógico), para poder sincronizar con el móvil más adelante sin rehacer nada. Todo local y sin telemetría.

**Catálogo (jerarquía pensada para el hub PAU):** `asignatura`(idioma, color, tipos de pregunta) › `bloque` › `tema` › `subtema` › `concepto`, con `etiquetas` y mapeo opcional al currículo oficial de la PAU. `fuente`(booklet, hash del PDF, página).

**Banco:** `pregunta`(id estable, versión, tipo[test|vf|corta|problema|tabla], enunciado con fórmulas (LaTeX) y gráficos sencillos, ayuda larga precargada, imagen opcional, dificultad_base 1-5, dificultad_estimada, origen[generada|importada|manual], estado_verificación, activa), `opcion`(posición, texto, correcta, tipo_de_trampa, explicación_de_la_trampa), `explicacion`, `lote`(fecha, modelo generador, versión del prompt, hash del material).

**Sesiones y eventos:** `sesion`(inicio, fin, modo[nivel|practica|repaso_subtema|repaso_fallos], filtro, dispositivo, versión de app y de banco, zona horaria). `evento` (inmutable): pregunta mostrada, opción seleccionada, cambio de opción, confianza, respuesta enviada, explicación abierta y cerrada, pregunta reportada, pausa y reanudación, con `payload` JSON y doble marca de tiempo (cliente y servidor).

**Qué se registra de cada intento (todo lo que se pueda medir):**
- Respuesta: opción inicial, opción final, nº de cambios, si cambió de correcta a incorrecta o al revés, orden en que se mostraron las opciones (se barajan), trampa elegida.
- Tiempos: hasta el primer clic, hasta enviar, lectura de la explicación.
- Confianza (si la marca). No se pregunta el motivo del fallo; se infiere de la trampa elegida, los cambios de opción y los tiempos.
- Contexto: posición en la sesión, hora del día, día de la semana, nº de intento previo del concepto, intervalo desde el último repaso, dificultad en ese momento, dominio estimado antes y después.
- Calidad: pregunta reportada como mal formulada o dudosa (queda excluida de las estadísticas), versión editada en la app.
- Procedencia: versión de la pregunta, lote y modelo que la generó.

**Derivados (reconstruibles):** `dominio` por concepto, subtema y asignatura (estimación, incertidumbre, estabilidad FSRS, próximo repaso, tendencia, racha de aciertos) con **instantáneas diarias** para ver la evolución; calibración de la confianza; patrones por tipo de trampa; rendimiento por hora y por fatiga dentro de la sesión; velocidad frente a acierto; preguntas que casi todos los intentos fallan (posible error de contenido).

**Operativa:** `ajustes`, `importacion`(log, hash, idempotente por id), `copia_seguridad`(registro y verificación), `reporte_calidad`. Importar y exportar en JSON y CSV. Esquema JSON validado para el banco.

## 6. Algoritmos
- **Dominio por concepto:** estimación bayesiana tipo Elo/IRT sencillo según la dificultad de cada pregunta, con incertidumbre. Se agrega a subtema y asignatura. Se muestra como porcentaje, nunca como nota.
- **Selección:** apuntar a ~70-80 % de acierto esperado, intercalar temas, no repetir la misma pregunta, reintroducir lo fallado con otra pregunta del mismo concepto.
- **Repetición espaciada:** FSRS (implementación Python `fsrs`; verificar versión y compatibilidad antes de usar).
- **Test de nivel:** 15 preguntas que inicializan el dominio de cada concepto.
- **Sugerencia de hoy:** ganancia esperada de dominio por minuto más riesgo de olvido.
- **Análisis de hábitos:** sobreconfianza por concepto, trampas recurrentes, cambios de opinión que empeoran o mejoran, caída por fatiga, aciertos lentos frente a fallos rápidos.
- **Control de calidad del banco:** señalar preguntas con tasa de fallo anómala para revisarlas.

## 7. Diseño e identidad (obligatorio)
Mismo lenguaje visual que los booklets:
- **Tipografía Lexend** (400, 500, 600, 700). Títulos en frase, no en mayúsculas salvo kickers espaciados.
- **Paleta por tema/bloque:** azul `#0072B2`, ámbar `#E69F00`, verde `#009E73`, rosa `#CC79A7`, naranja `#D55E00`, índigo `#5854B0`, marrón `#8A5C38`, carmín `#D12630`. Acento por asignatura (Economía: lila `#B05A8F`).
- **Hexágonos** como unidad visual: relleno suave del color del bloque, contorno oscuro, sombra desplazada en color pleno con grano fino. Iconos en **duotono desplazado**.
- Tarjetas con borde redondeado suave, filetes finos, mucho aire, jerarquía clara. **Solo modo claro, limpio y editorial** como los booklets.
- Sin guiones largos en ningún texto, sin fecha en portadas, accesible (contraste AA, teclado, foco visible).
- **Antes de construir**, mockups de las pantallas clave para aprobar el aspecto: Inicio = hub con asignaturas y su panal de dominio, Subtema (dominio e historial), Práctica (pregunta + confianza opcional + feedback), Repaso de fallos, Sugerencia de hoy, Test de nivel, Ajustes.
- Sensación **cuidada con microanimaciones** (un hexágono que se llena, transiciones suaves), sin gamificación ni saturar. Diseño **responsive desde el principio** aunque el móvil se use después.

## 8. Stack propuesto (mi recomendación, a validar)
- **Backend:** Python 3.14 con **FastAPI** + **SQLite** (SQLModel/SQLAlchemy, migraciones con Alembic). Razón: reutiliza el ecosistema de la skill (reportlab, `exam_bank`, `make_exam.py`) y tiene librerías de repetición espaciada. Verificar compatibilidad de dependencias con Python 3.14; si alguna falla, fijar 3.12/3.13 con `uv`.
- **Frontend:** **React + TypeScript + Vite + Tailwind CSS**, animaciones con **Motion**, gráficos con **SVG propio + D3/visx**, fuente Lexend vía `@fontsource`. Razón: control total del diseño, componentes reutilizables, panal en SVG fluido.
- **Calidad:** `pytest` (backend), `Vitest` (frontend), **Playwright** para recorridos y capturas de pantalla.
- Alternativa de un solo lenguaje: Next.js + SQLite. Más simple de mantener, pero pierde la integración natural con Python.
- Empaquetado futuro opcional como app de escritorio (Tauri o PyInstaller). No ahora.
- Nada de Streamlit (poco control del diseño).

## 9. Integración con la skill `slides-to-booklet`
1. **Banco desde booklets:** leer el texto del PDF (`pdftotext`), extraer conceptos por bloque, generar ~150 preguntas por tema con dificultad 1-5, 4 opciones, explicación y trampa por opción, página del booklet. Salida: JSON validado.
2. **Importar** el JSON a la app (script `import_bank.py`, idempotente por `id`).
3. **Reentrenar:** la app exporta `weak.json`; en una sesión de Claude se piden preguntas nuevas solo de esos conceptos.
4. **Examen en papel personalizado:** `make_exam.py` toma preguntas de la base según debilidad (futuro).
Antes de diseñar nada, ampliar el formato de `exam_bank` de la skill para que guarde opciones, respuesta, tema, concepto y dificultad (hoy solo guarda enunciado).

## 10. Estructura de carpetas
```
hexaprep/
  SPEC.md                 este documento
  docs/                   decisiones, mockups, diseño aprobado
  backend/                FastAPI, modelos, algoritmos, tests
  frontend/               React + Vite + Tailwind
  data/                   hexaprep.db (no versionar), exports/, backups/
  banks/                  JSON de preguntas por asignatura y tema
  tools/                  generate_bank.py, import_bank.py, export_weak.py
```

## 11. Estrategia de modelos y créditos
Regla general: **gastar créditos en pensar una vez y automatizar el resto.** La app **no llama a ningún modelo** al estudiar; los modelos solo intervienen al construirla y al generar o reponer preguntas.

| Tarea | Modelo y esfuerzo | Por qué |
|---|---|---|
| Diseño de arquitectura, algoritmo de adaptación, decisiones difíciles, revisión final | **Opus 5.5**, esfuerzo alto (`+`). Fable 5.2 solo para un bloqueo real | Errores aquí salen caros y se arrastran |
| Plan de implementación y revisión de código antes de dar algo por hecho | **Opus 5.5**, esfuerzo medio | Detecta incoherencias antes de escribir |
| Implementación rutinaria (componentes, endpoints, estilos, tests) | **Sonnet 5.5** | Mejor relación calidad-coste para código |
| **Generar el banco de preguntas** (calidad pedagógica crítica) | **Sonnet 5.5**, en lotes por tema | Mucho texto, necesita buen criterio |
| **Verificar** respuestas correctas y explicaciones del banco | **Opus 5.5** solo en una muestra y en preguntas marcadas dudosas | Un error de contenido arruina la confianza en la app; verificar es lectura, más barata que generar |
| Tareas pequeñas: formatear JSON, renombrar, lanzar tests, comandos, commits | **Haiku 5.5** (`_`) | Suficiente y muy barato |
| Cálculos deterministas (importar, validar esquema, exportar) | **Scripts, ningún modelo** | Coste cero y reproducible |
| Análisis periódico de debilidades | **Sonnet 5.5** leyendo `weak.json`, no la base entera | Entrada pequeña |

Ahorro práctico: abrir cada fase en una conversación nueva con este documento (no pegar historial); trabajar en cambios pequeños y verificables; no abrir capturas salvo para validar el diseño; reutilizar el banco en vez de regenerar; no pedir al modelo que lea PDFs enteros (usar `pdftotext`).

## 12. Skills y proceso para la construcción
Orden recomendado: `superpowers:brainstorming` (ya hecho, esta especificación) → mockups con el companion visual → `superpowers:writing-plans` → `feature-dev` para cada módulo → `superpowers:test-driven-development` para algoritmos → `dataviz` para gráficos y panal → `superpowers:verification-before-completion` antes de dar nada por terminado → `/pr-review-toolkit:review-pr` y `/commit`. Para el aspecto, consultar `artifact-design` como referencia de principios. Buscar en el catálogo (SearchSkills) skills de diseño frontend o accesibilidad antes de escribir CSS.

## 13. Criterios de aceptación de la v1
- Instalación y arranque con un solo comando documentado, sin tocar el resto del ordenador.
- Importar un banco de 150 preguntas, hacer el test de nivel de 15 preguntas, completar una sesión de práctica y ver el panal actualizado.
- Todos los datos persisten tras cerrar y reabrir; cerrar la app de golpe a media sesión no pierde ninguna respuesta y la sesión se puede reanudar; exportar y restaurar copia funciona y se prueba.
- Cada pantalla aprobada en mockup coincide con la implementación (revisión con capturas).
- Tests de algoritmos (selección, dominio, proyección) y un recorrido Playwright completo en verde.
- Cero textos con guiones largos; contraste AA; navegable con teclado.
- Preguntas del banco verificadas por muestra y sin errores de contenido detectados.

## 14. Decisiones de la usuaria
| Tema | Decisión |
|---|---|
| Ritmo de sesión | **Libre**, sin duración fija |
| Feedback tras responder | **Inmediato**, tono breve tipo entrenador |
| Confianza | **Opcional**, con un botón |
| Aspecto | **Claro y editorial**, como los booklets |
| Sensación | **Cuidada con microanimaciones**, sin gamificación |
| Simulacro | **No** |
| Notas y penalización | **No hay nota ni resta**: solo se marca cuándo es incorrecto |
| Cuenta atrás al examen | **No** (da igual practicar semanas o un día antes) |
| Dificultad | **Difícil desde el principio** y **test de nivel de 15 preguntas** |
| Preguntas nuevas | **Lotes por booklet y bajo demanda** según flaquezas |
| Idioma | Preguntas **en el idioma de la asignatura**. **[PROPUESTA]** interfaz en castellano, preparada para catalán (con la PAU de Cataluña lo más probable es acabar usándola en catalán; decidirlo al hacer los mockups) |
| Datos | **Guardado automático e inmediato** y **base de datos sólida** con el máximo de datos útiles |
| Copia de seguridad | **Automática semanal** en una carpeta local |
| Pantalla de inicio | **Panal de dominio** (después, hub de asignaturas) |
| Exámenes en papel | **No de momento** |
| Dispositivos | **Portátil** ahora; **móvil más adelante** (responsive desde el inicio) |
| Teclado y ratón | **Ambos**, sin atajos visibles |
| Clic accidental | **Respuesta firme al primer clic** |
| Orden de opciones | **Barajar siempre** |
| Autodiagnóstico del fallo | **No preguntar** |
| Explicación | **Plegada** (se abre al querer) |
| Ayuda extra | **Texto largo precargado** en el banco |
| Preguntas dudosas | **Botón de reportar** que las saca de las estadísticas |
| Notas | **Sin notas personales** |
| Fórmulas y gráficos | **LaTeX y gráficos sencillos** |
| Enlace al booklet | **Abre el PDF en la página exacta** |
| Historial | **Calendario de días estudiados y gráficos de evolución** |
| Repaso de subtema | **Todas las preguntas, sin límite** |
| Edición de preguntas | **Dentro de la app**, exportando al banco |
| Selectividad | **PAU de Cataluña**, en catalán |
| Tras días sin usarla | **Solo el panal** |
| Opciones del test | **4** |
| Meta a medio plazo | **Hub de selectividad** con asignaturas y repaso por subtema |

**[PROPUESTA] Interpretación de dificultad:** el banco se genera con preguntas de nivel examen desde el inicio, con distractores trampa. El test de nivel de 15 preguntas no baja la dificultad: fija cuánto domina ya cada concepto, para saber por dónde empezar.
**[PROPUESTA] Sincronización:** «sincronizar automáticamente» = guardar cada respuesta al instante en la base local y tener las copias de seguridad al día. La sincronización entre portátil y móvil queda para cuando llegue el móvil, y el modelo de datos ya está preparado.

## 15. Cómo arrancar la conversación nueva
Pegar esto como primer mensaje:
> Lee `C:\Users\carla\Desktop\Projects\hexaprep\SPEC.md` entero. Estamos en la fase **[mockups / plan / construcción del módulo X]**. Usa `superpowers:writing-plans` y trabaja con cambios pequeños. No generes código de producto hasta que apruebe el plan. Responde corto y sin guiones largos.

## 16. Visión a medio plazo: hub de selectividad (PAU)
- Un espacio por **asignatura**, cada una con su propio panal, sus tipos de pregunta y su idioma.
- **Repasar un subtema concreto** y ver su dominio, su historial y sus conceptos débiles.
- Vista transversal: qué asignaturas y subtemas están más flojos, sin notas.
- Tipos de ejercicio más allá del test: verdadero/falso con justificación, respuesta corta, problemas, tablas (catalán), tarjetas con repetición espaciada.
- Banco ampliable con **exámenes oficiales anteriores** importados por la usuaria, etiquetados por subtema.
- Todo parte del mismo catálogo jerárquico y del mismo registro de eventos de la sección 5, para que añadir una asignatura sea añadir datos, no reescribir la app.
- **Marco:** PAU de Cataluña. Las asignaturas y formatos de examen se concretan cuando se elijan; el orden después de Economía está por decidir **[PENDIENTE]**.

## Decisiones posteriores a la v1 (Carla, 2026-11-15)
Estas decisiones sustituyen a lo anterior donde se contradicen:
- **Sin test de nivel inicial:** se asume conocimiento previo y se sirven preguntas difíciles desde el principio (objetivo de acierto del 60 %).
- **Sin botones de confianza** durante la práctica. Se mantiene el campo en la base por si hay datos antiguos.
- **Tipos de pregunta en uso:** test, verdadero/falso y problema de respuesta numérica (número, fracción o varios valores separados por `;`), con apartados que comparten enunciado, imagen en el enunciado y botón «Lo he hecho bien».
- **Asignaturas:** Economía, Química (catalán), Matemáticas (solo problemas); selector en la cabecera.
- **Saltar** una pregunta la vuelve a servir más tarde en la sesión.

