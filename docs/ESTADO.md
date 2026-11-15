# Estado del proyecto (traspaso entre conversaciones)

Última actualización: 2026-11-15. Todo está commiteado en `main` (sin remoto, sin push). Último commit con contenido: `fdbc26f`.

## Qué es hoy HexaPrep
App web local para Carla Monté Sihuro con 4 asignaturas, 1280 preguntas y seguimiento del dominio por concepto. Las 20 tareas del plan original (`docs/superpowers/plans/2026-11-14-hexaprep-economia.md`) están hechas; desde entonces Carla ha pedido cambios en conversación y están todos implementados:

| Asignatura | Idioma | Preguntas | Qué tiene |
|---|---|---|---|
| Economía | es | 593 (T1 a T3 booklets + apuntes) | solo test |
| Química | ca | 365 (T2 laboratorio 254, T3 formulació orgànica 111) | test, V/F, problemas, 40 imágenes, apartados |
| Matemáticas | es | 297 (simulacro, libro de Álgebra, hojas, examen, matrices, Gauss) | solo problemas (decisión de Carla: nunca test ni V/F) |
| Català | ca | 483 activas (433 escritas + 50 V/F de literatura); las 120 test/V/F de normativa N1 están retiradas | **escritas** (huecos, formas derivadas, troba l'error, verbos) y V/F solo de literatura |

Última verificación completa (2026-11-15): `pytest backend` 184 en verde, `vitest` 97, `tsc` y `vite build` limpios, `playwright test` 2 en verde (3 veces seguidas). Cada banco validado con `tools/validate_bank.py` y protegido por `backend/tests/test_bancos_reales.py`.

## Funcionalidad añadida tras la v1 (decisiones de Carla)
- **Práctica:** avance automático (1 s tras acierto, 2,5 s tras fallo; un problema fallado espera al botón «Lo he hecho bien» o «Siguiente»), saltar pregunta (botón o tecla S; vuelve tras 3 respuestas), sin botones de confianza, práctica por tema (botón en cada tema) y «Solo test y V/F» / «Solo problemas» en las asignaturas con ambos grupos. **Sin test de nivel** (eliminado del todo).
- **Tipo `escrita`** (Català, 2026-11-15): uno a cuatro huecos que se teclean (`campos`: `etiqueta`, `validas`, `errores` con la regla de cada error típico). Corrige `backend/hexaprep/escritura.py` (acento obligatorio, `l·l`/apóstrofo normalizados, aviso «revisa los acentos»); acierta solo si todos los huecos están bien; la opción «a» guarda los campos (no sale al cliente). Pantalla `frontend/src/components/Escrita.tsx` con barra à è é í ï ò ó ú ü ç l·l. Una escrita fallada espera a «Siguiente». `banks/catala/V1.json` (75 verbos de la tabla de los apuntes) se genera con `tools/build_verbs.py` desde `banks/catala/fuentes/Catala_Apunts_Gramatica.pdf`, sin IA. **Decisión de Carla:** en Català solo la literatura va en V/F; lo demás se escribe. Contenido (2026-11-15): `banks/catala/N2.json` (150 escritas de normativa, mismos 24 conceptos que N1), `G1.json` (208 escritas del booklet de gramática y 50 V/F de literatura) y `V1.json` (75 verbos). Se construyen con `tools/build_quimica.py banks/catala/src/<N2|G1> banks/catala/<N2|G1>.json` (clave `escritas`; brief en `banks/catala/FORMATO.md`; revisadas entera por Opus). **Estilo definitivo (ajustes de Carla, 2026-11-15, última sección de `banks/catala/FORMATO.md`):** palabras difíciles, en los huecos se escribe solo la letra que falta, sin pistas que regalen la respuesta, «Troba l'error» como máximo ~15 % (ninguno en a/e àtones), tablas creixent/decreixent/hiat/res (hasta 6 campos), cuartetos tipo boig/boja/bojos/boges, verbos con formas complicadas y nada de l'article salat. Todo reescrito y revisado por Opus (formas dudosas). N2 tiene 149 escritas (la 150 se retiró). En «Troba l'error» vale el fragmento erróneo con hasta dos palabras más alrededor. **N1 está retirado**: `banks/catala/retiradas/N1.json` (fuera de `--all`) y sus preguntas excluidas en la base con `tools/retirar_banco.py` (reversible desde el editor). Fuentes nuevas: `banks/catala/fuentes/Catala_Apunts_Gramatica.pdf` y `Catala_Literatura_apunts_fotos.pdf`; texto en `banks/catala/texto/` (las páginas PNG de `texto/img/` no están en git: se regeneran con pdfplumber).
- **Tipos de pregunta:** `test`, `vf` y `problema` (respuesta numérica: un número, una fracción `3/4`, notación científica `2,24e22`, `2,24·10^22` o `2,24x10^22`, o varios valores con `;`; `ordenada: true` si el orden importa; margen del 1 % por valor). Problemas con **apartados** (`grupo`, `contexto`, `apartado`: se sirven seguidos con el enunciado común). Preguntas con **imagen** (`imagen`, servida por `/api/imagen/...`).
- **Selección de preguntas** (`backend/hexaprep/selector.py`, cabecera con los criterios): objetivo de acierto 60 %, conocimiento previo supuesto (empieza en nivel 4), intercalado de conceptos, subtemas y tipos, repaso espaciado FSRS, sorteo entre las 5 mejores. Constantes ajustables arriba del archivo.
- **Pantallas:** selector de asignatura con tarjetas y teclado (sin recargar), panel de asignatura en pantalla completa al pulsar el hexágono grande, historial de analista (`/api/analytics`, `backend/hexaprep/analytics.py`, UI en `frontend/src/components/historial/`).
- **Orden del temario:** el importador guarda el orden de aparición de temas y subtemas (antes alfabético; al reimportar se reordenan los bancos antiguos).

## Versión online (Vercel + Neon, 2026-11-15)
- Repo público `github.com/carlamosi/hexaprep`; cada push a `main` se despliega solo en el proyecto Vercel `hexaprep` (cuenta `carlas-projects-33023431`). URL de producción: https://hexaprep-ashy.vercel.app (la protege *Vercel Authentication* mientras no se desactive en Settings > Deployment Protection).
- `vercel.json` (servicios `frontend/` y `backend/`, entrada `backend/main.py`). El backend usa Postgres si existe `DATABASE_URL` o `POSTGRES_URL` (Neon, recurso `hexaprep-db`, variables ya conectadas al proyecto); sin ellas sigue en SQLite local. `HEXAPREP_PASSWORD` (variable de entorno del proyecto) activa el acceso por contraseña (HTTP Basic, usuario libre).
- Migrar el progreso local a Neon (solo copia a un destino vacío): `DATABASE_URL=<url directa> python tools/migrar_a_postgres.py`. Hecho el 2026-11-15 (19 tablas, 10340 filas, verificado). Desde entonces el progreso online y el local divergen: se usa uno u otro.
- Online no funcionan las copias de seguridad de archivo (las hace Neon), ni «Abrir el booklet» (los PDF no están en git). Los bancos nuevos se importan con `tools/import_bank.py` apuntando `DATABASE_URL` a Neon.

## Cómo se arranca y se prueba
- Todo en un comando: `powershell -ExecutionPolicy Bypass -File .\run.ps1` (importa todos los bancos con `tools\import_bank.py --all` y abre el navegador; solo comprobada su sintaxis, no de punta a punta).
- A mano: `.venv\Scripts\python tools\import_bank.py --all` y `.venv\Scripts\python -m hexaprep` (http://127.0.0.1:8000). `HEXAPREP_PORT` cambia el puerto y `HEXAPREP_DATA` la carpeta de datos (úsala para probar sin tocar `data\`).
- Pruebas: `.venv\Scripts\python -m pytest backend`; `cd frontend`, `npx vitest run`, `npx tsc --noEmit`, `npm run build` (el backend sirve `frontend/dist`, hay que recompilar tras cambiar el frontend), `npx playwright test` (usa su propia carpeta de datos).
- Estado de la máquina al cerrar esta conversación: la app corre en http://127.0.0.1:8001 con los datos reales (la lanzó la sesión anterior y se para al cerrarla). En el puerto 8000 había una instancia antigua ajena a esas sesiones, sin los cambios nuevos.
- Copias de seguridad de la base antes de cada gran importación: `data\hexaprep.pre-quimica.db`, `pre-mates`, `pre-pulido` y `pre-ampliacion` (git las ignora). Se pueden borrar cuando Carla confirme que todo está bien. Su progreso real al cerrar: 25 respuestas.

## Cómo se amplían los bancos (leer antes de tocar `banks/`)
- Cada asignatura: `banks/<asignatura>/src/<X>/` (fragmentos compactos + `_meta.json`), `texto/` (PDF extraídos con `tools/extract_apuntes.py`), `img/` (Química), `fuentes/` (PDF, ignorados por git; `docs/FUENTES.md` lista nombres originales) y `FORMATO.md` (formato de los fragmentos y reglas de redacción, imprescindible para generar contenido).
- Se construye con `.venv\Scripts\python tools\build_quimica.py banks/<asignatura>/src/<X> banks/<asignatura>/<X>.json` (`--check` solo comprueba). El script recalcula cada problema con su `expr` (fuerza bruta o fórmula) y falla si no coincide con la solución. Los bancos de Economía T1 a T3 se generan con el antiguo `tools/build_bank.py`.
- **Los ids dependen de la posición.** Los archivos nuevos de una carpeta `src/X` se numeran DESPUÉS de los existentes y los archivos antiguos no se editan ni se reordenan. Química T2 fija `tests_congelados: 80` para no cambiar el reparto de letras de las primeras preguntas. Si un id cambia, el importador crea una versión nueva de esa pregunta.
- Subtemas: reutiliza el nombre exacto del existente para añadir conceptos a un subtema.
- Revisión: tras generar contenido nuevo, una muestra revisada por Opus (`docs/verificacion-*.md`). Los problemas pasan además por la verificación automática.
- Importar: `tools\import_bank.py --all` (idempotente; copia `data\hexaprep.db` antes si el cambio es grande).

## Dónde mirar
- Qué y por qué: `SPEC.md` (última sección: decisiones posteriores a la v1). Modelos por tarea: `docs/MODELOS.md`.
- Mockups aprobados: `docs/mockups/` y `APROBADO.md` (el historial, el panel y el selector actuales los sustituyen; se anotó allí).
- Decisiones de la ejecución original («Ruling:») y menores aplazados: `.superpowers/sdd/2026-11-14-hexaprep-economia/progress.md` (ignorado por git).
- Revisiones de contenido: `docs/verificacion-banco.md` (Economía), `-quimica`, `-mates`, `-nuevo`, `-ampliacion-a`, `-ampliacion-b`.

## Pendiente conocido
- **Criterios de la profesora frente al IEC (Català):** el booklet marca como error algo que el IEC (2016) acepta o puede aceptar; el banco sigue el booklet y lo dice en la pista o en la explicació. A confirmar con Carla o con la normativa: «per» + infinitiu de finalitat, «hagués dit» en la apódosi de una condicional irreal, futuro de probabilidad («serà el Joan»), «tota Barcelona», «haig de», «vàries alumnes». La fila «medievalisme / prerenaixement» de las fotos de literatura está tachada y no se usó.
- La copia `data\hexaprep.pre-catala-escrito.db` se hizo copiando solo el `.db` con la app aún abierta (WAL): puede estar algo desactualizada.
- **Nunca se ha recorrido en pantalla todo lo nuevo a mano** (Català, Química orgánica, apartados y las preguntas con imagen se probaron por API, tests y capturas puntuales). Lo primero que debería hacer Carla es usarlo y anotar lo que no le cuadre.
- La `ayuda_larga` de un concepto (desplegable «Ayuda: entender el concepto») puede contener la respuesta de alguna pregunta si se abre antes de responder (Opus señaló unas 11 en Química orgánica y Català). Posible arreglo: ocultarla hasta responder.
- Calidad de contenido: solo se revisó por muestra (15 a 20 % de cada bloque). Las 211 trampas reescritas de Economía no pasaron una segunda muestra. Lista de barbarismos de Català a revisar por Carla (el PDF sale en columnas mezcladas).
- Los apartados de CuCl₂ hablan de «molècules» aunque es iónico; el booklet usa ese lenguaje.
- Historial: contraste AA sin medir con herramienta; los colores de tema 7 y 8 se confunden con daltonismo; el tiempo de lectura de la explicación sigue sin registrarse.
- El editor de la app no muestra la solución de un problema, ni imagen ni apartados.
- Menores de la v1: la navegación sigue visible en la práctica de subtema; fallos del repaso de una sesión reanudada no se reconstruyen; la API no valida la cabecera Host; `POST /api/sessions` sin `asignatura_id` da 500 y `PUT /api/questions/{id}` con id desconocido da 422; si falla la copia semanal al arrancar impide arrancar; `report_question` recalcula solo el concepto de la versión vigente.

## Siguientes pasos propuestos (en este orden)
0. **Català escrito: hecho** (huecos, formas derivadas, troba l'error, literatura V/F; N1 retirado). Siguiente: que Carla lo use, y si tiene un examen pasado, copiar su estilo; la `ayuda_larga` aún se puede abrir antes de responder.
1. **Carla prueba la app** (http://127.0.0.1:8001 o `run.ps1`) y anota lo que no le cuadre; los cambios pequeños los hace Sonnet, un rediseño grande, Opus.
2. **Ocultar la ayuda larga hasta responder** (o mostrarla solo tras el fallo) y revisar las preguntas señaladas.
3. **Más contenido con el mismo procedimiento**: preguntas con imagen de Formulació orgànica (las estructuras están en el PDF como imágenes), más apuntes cuando Carla los traiga, y reponer conceptos débiles con `weak.json` cuando haya datos de uso.
4. **Probar `run.ps1` de punta a punta** en una copia limpia y borrar las copias `data\hexaprep.pre-*.db`.
5. **Saldar los menores de robustez** de la lista de arriba y medir el contraste AA (por ejemplo axe dentro de Playwright).
6. **Ampliar el producto** (SPEC 16): catalán en la interfaz, más asignaturas de la PAU de Cataluña, tablas de catalán con FSRS, uso desde el móvil por la WiFi local.

Cada paso nuevo con lógica va por `superpowers:test-driven-development` y se cierra con `superpowers:verification-before-completion`.
