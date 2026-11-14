# HexaPrep · instrucciones del proyecto

App web local de práctica tipo test para Carla Monté Sihuro («Monté» siempre con acento). Qué y por qué: `SPEC.md`. Cómo: `docs/superpowers/plans/2026-11-14-hexaprep-economia.md` (20 tareas). Qué modelo para cada tarea: `docs/MODELOS.md`.

## Ejecución
- **El plan ya está aprobado por Carla.** Ejecútalo con `superpowers:executing-plans` (modo nativo) sin pedir confirmación entre tareas. Esto prevalece sobre la regla global de «proponer plan y esperar aprobación», y los commits que marca el plan están autorizados.
- Solo te detienes por las cuatro causas de la skill y en la **Task 14** (Carla debe aprobar los mockups; sin esa aprobación no se escribe frontend).
- **Autorizado** trabajar directamente en la rama `main` de este repositorio local nuevo, sin remoto. No hagas push ni crees remotos.
- El progreso vive en el ledger de la skill (`.superpowers/sdd/...`, ignorado por git). En una conversación nueva o tras compactar, retoma desde el ledger y `git log`, no desde la memoria.

## Modelos
- Esta sesión debe ir en **Sonnet 5.5, esfuerzo medio**. Una sesión no puede cambiarse sola de modelo: para usar otro, lanza un **subagente** con la herramienta Agent y el parámetro `model` (`"opus"` o `"haiku"`) según `docs/MODELOS.md`. No uses `"fable"` salvo un bloqueo real que Opus no resuelva.
- Cada subagente recibe solo lo que necesita (rutas de brief, spec y archivos), no el historial.

## Estilo y calidad
- Respuestas cortas, una línea de narración entre llamadas, sin guiones largos (— ni –) en ningún texto, sin fechas en portadas.
- Antes de dar algo por hecho: ejecutar tests y leer la salida (`superpowers:verification-before-completion`). No abrir imágenes salvo para validar contra los mockups aprobados.
- Para librerías (fsrs, fastapi, sqlalchemy, alembic, tailwind, motion, katex) consulta la documentación actual con context7 antes de escribir código.
- Redirige la salida larga de tests a un archivo y lee solo la cola.
