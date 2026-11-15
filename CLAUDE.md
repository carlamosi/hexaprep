# HexaPrep · instrucciones del proyecto

App web local de práctica para Carla Monté Sihuro («Monté» siempre con acento): Economía, Química (catalán), Matemáticas y Català, con test, verdadero/falso y problemas numéricos. Qué y por qué: `SPEC.md` (última sección: decisiones posteriores a la v1). Cómo: `docs/superpowers/plans/2026-11-14-hexaprep-economia.md` (20 tareas). Qué modelo para cada tarea: `docs/MODELOS.md`.

## Estado y ejecución
- **Las 20 tareas del plan están hechas** (v1 verificada) y después se añadió mucho más a petición de Carla. No vuelvas a ejecutar el plan. Lee primero `docs/ESTADO.md`: estado, cómo probar, **cómo se amplían los bancos (los ids dependen de la posición: no edites ni reordenes archivos antiguos de `banks/*/src`)**, pendientes y siguientes pasos propuestos. El trabajo nuevo se plantea con Carla a partir de esos pasos.
- Los commits de este repositorio local están autorizados cuando acabes un cambio verificado y mientras el trabajo sea el acordado con Carla; los cambios de más de un archivo se proponen antes con un plan breve.
- **Autorizado** trabajar directamente en la rama `main` de este repositorio local, sin remoto. No hagas push ni crees remotos.
- Las decisiones tomadas durante la ejecución y los menores aplazados están en el ledger (`.superpowers/sdd/...`, ignorado por git); consúltalo en lugar de la memoria. Si cambias un mockup aprobado, avisa a Carla.

## Modelos
- Esta sesión debe ir en **Sonnet 5.5, esfuerzo medio**. Una sesión no puede cambiarse sola de modelo: para usar otro, lanza un **subagente** con la herramienta Agent y el parámetro `model` (`"opus"` o `"haiku"`) según `docs/MODELOS.md`. No uses `"fable"` salvo un bloqueo real que Opus no resuelva.
- Al empezar, di en una línea con qué modelo vas. Si no es Sonnet 5.5, avisa a Carla antes de seguir.
- Si trabajas en un worktree, copia antes `banks/*/fuentes/` y `banks/*/img/` desde la carpeta principal (los PDF no están en git).
- Cada subagente recibe solo lo que necesita (rutas de brief, spec y archivos), no el historial. Contenido nuevo del banco: agentes Sonnet por bloque con `banks/<asignatura>/FORMATO.md` como brief, y una muestra revisada por Opus (patrón usado hasta ahora).

## Estilo y calidad
- Respuestas cortas, una línea de narración entre llamadas, sin guiones largos (— ni –) en ningún texto, sin fechas en portadas.
- Antes de dar algo por hecho: ejecutar tests y leer la salida (`superpowers:verification-before-completion`). No abrir imágenes salvo para validar contra los mockups aprobados o para identificar las imágenes recortadas de las preguntas.
- Entorno (Windows con Git Bash): los comandos largos con varios heredocs y comillas fallan; escribe los scripts de Python con Write (en el scratchpad) y ejecútalos. El `/tmp` de Bash no lo ve el Python de Windows. Usa `PYTHONUTF8=1` al imprimir acentos.
- Para librerías (fsrs, fastapi, sqlalchemy, alembic, tailwind, motion, katex) consulta la documentación actual con context7 antes de escribir código.
- Redirige la salida larga de tests a un archivo y lee solo la cola.
