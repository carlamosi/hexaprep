# HexaPrep · instrucciones del proyecto

App web de práctica (local y online en Vercel con base Neon y acceso con Google) para Carla Monté Sihuro («Monté» siempre con acento) y otras dos personas: Economía, Química (catalán), Matemáticas y Català, con test, verdadero/falso, problemas numéricos y preguntas escritas. Qué y por qué: `SPEC.md` (última sección). **Retomar en una conversación nueva: `docs/ARRANQUE.md`** (primer mensaje y skills según la petición); ideas y backlog: `docs/IDEAS.md`.

## Estado y reglas de trabajo
- El plan original (20 tareas) está hecho: no lo vuelvas a ejecutar. De `docs/ESTADO.md` lee solo las secciones del final («Hecho el 2026-11-22» y «Siguientes pasos propuestos»); el resto (cómo probar, infraestructura online, pendientes) solo cuando la tarea lo toque. **Antes de tocar `banks/*/src` lee «Cómo se amplían los bancos»: los ids dependen de la posición, no edites ni reordenes archivos antiguos.**
- Trabajo directo en `main`. Cambios de más de un archivo: plan breve y espera el OK de Carla. **Al acabar cada cambio verificado, haz commit y push sin esperar a que lo pida** (esto prevalece sobre la regla global de solo sugerir commits): Carla quiere ver los cambios en la web al momento.
- Cada push a `main` despliega en producción (https://hexaprep-app.vercel.app; remoto público `github.com/carlamosi/hexaprep`). Tras empujar, comprueba que la web sirve el build nuevo (compara el `assets/index-*.js` de la web con el de `frontend/dist/assets`, tarda 1 a 2 minutos). Nunca empujes sin verificar; no crees otros remotos ni cambies la visibilidad del repo. Nada de emails, secretos ni datos personales en archivos del repo.
- Neon: los cambios de tablas y los bancos nuevos se llevan a todos los perfiles con `tools/actualizar_perfiles.py` (URL directa de `.env.local`). No escribas en Neon sin que Carla lo apruebe: dale el comando para su terminal. Los secretos viven en Vercel y `.env.local`, nunca en la conversación.
- Las decisiones de la ejecución original están en el ledger `.superpowers/sdd/2026-11-14-hexaprep-economia/` (ignorado por git). Si cambias un mockup aprobado, avisa a Carla.

## Modelos y créditos
- Esta sesión: **Sonnet 5.5, esfuerzo medio**. Al empezar di en una línea con qué modelo vas; si no es ese, avisa antes de seguir. Para otro modelo, lanza un subagente con `Agent` y `model` `"opus"` o `"haiku"` (`docs/MODELOS.md` es el reparto histórico del plan v1). `"fable"` solo ante un bloqueo real que Opus no resuelva.
- Cada subagente recibe solo lo que necesita (rutas de brief, spec y archivos), nunca el historial. Contenido nuevo del banco: agentes Sonnet por bloque con `banks/<asignatura>/FORMATO.md` como brief y una muestra revisada por Opus. Prefiere generadores por reglas a agentes que redactan y revisa con Opus solo lo que cambia.
- En un worktree, copia antes `banks/*/fuentes/` y `banks/*/img/` (los PDF no están en git).
- Skills según la petición: tabla «Qué skill usar» en `docs/ARRANQUE.md`; di en una frase cuál usas y por qué.

## Estilo y calidad
- Respuestas cortas, una línea de narración entre llamadas, sin guiones largos (— ni –) en ningún texto, sin fechas en portadas.
- Antes de dar algo por hecho: `superpowers:verification-before-completion`. Tests con `tools/probar.py back|front|todo` (resumen corto; salida completa en `data/probar-*.txt`); con pytest o vitest directos, salida a un archivo y lee solo la cola.
- Interfaz: mide en el navegador (estilos calculados) y haz como mucho una o dos capturas a escala 0,5 de lo que cambia. Fuera de eso, no abras imágenes salvo para validar contra los mockups aprobados o identificar las imágenes recortadas de las preguntas.
- Probar sin tocar datos reales: copia `data/hexaprep.db*` al scratchpad y arranca con `HEXAPREP_DATA=<copia> HEXAPREP_PORT=8010`. El servidor `hexaprep` de `.claude/launch.json` (puerto 8002) usa los datos reales: no respondas preguntas ahí.
- Entorno (Windows con Git Bash): los comandos largos con varios heredocs y comillas fallan; escribe los scripts de Python con Write (en el scratchpad) y ejecútalos. El `/tmp` de Bash no lo ve el Python de Windows. Usa `PYTHONUTF8=1` al imprimir acentos. Varios `.css` y `tokens.css` usan saltos CRLF: un `replace` de Python con `\n` falla en silencio, usa Edit o un `assert` sobre el recuento.
- Librerías (fsrs, fastapi, sqlalchemy, alembic, tailwind, motion, katex): consulta context7 cuando dudes de la API actual.
