# Cómo arrancar la ejecución

## Modelo con el que empezar
**Sonnet 5.5, esfuerzo medio.** Es el modelo de trabajo de toda la sesión: el plan ya trae las decisiones tomadas, así que implementarlo no necesita el modelo más caro. Las partes difíciles (revisión de las tareas 5 a 8, verificación del banco, mockups, panal y revisión final) las delega solo a Opus con subagentes, y los documentos sencillos a Haiku. No empieces en Opus (gastarías créditos en tareas mecánicas) ni en Haiku (20 tareas con interfaces encadenadas piden algo más de criterio).

## Antes (una sola vez)
1. Los tres PDF de Economía ya están en `banks/economia/fuentes/` (T1 «Decisiones», T2 «Sistemas», T3 «Mercado y entorno»; elegí la versión más reciente de cada uno). Si quieres otra versión, cámbiala por el mismo nombre. Esa carpeta no se sube a git.
2. Abre una **sesión nueva** con la carpeta `C:\Users\carla\Desktop\Projects\hexaprep` como carpeta de trabajo, **directamente en la carpeta y sin worktree**. Los PDF no están en git, así que un worktree no los tendría. Así también se carga sola `CLAUDE.md`.
3. Elige **Sonnet 5.5** y **esfuerzo medio** en el selector. Modo de permisos: aceptar ediciones. Aun así, la primera vez te pedirá permiso para ejecutar `pip`, `npm`, `npx`, `pytest` y `git`; apruébalos para toda la sesión.

## Primer mensaje (pegar tal cual)
> Ejecuta el plan `docs/superpowers/plans/2026-11-14-hexaprep-economia.md` con `superpowers:executing-plans`. Sigue `CLAUDE.md` y `docs/MODELOS.md`: trabaja en Sonnet y lanza subagentes de Opus o Haiku donde la tabla lo indique. Responde corto y sin guiones largos. Solo te detienes en la Task 14, para que yo apruebe los mockups.

## Qué esperar
- Avanza tarea a tarea, con los tests en rojo y luego en verde, y un commit por tarea.
- Se detiene en la **Task 14**: te enseña los mockups en el navegador. Corrige lo que quieras; cuando apruebes, sigue.
- Si la conversación se llena, abre otra y pega el mismo mensaje: retoma desde el registro de progreso y `git log` sin repetir nada.
- Al terminar te da la lista de decisiones que tomó por ti («Rulings») y de detalles menores aplazados.

## Si algo falla
- Una librería no se importa con Python 3.14: el plan instala `uv` (`pip install uv`), recrea el entorno con Python 3.13 y lo anota (Task 1).
- Faltan PDF en `fuentes/`: la Task 12 se detiene y te lo dice.
- La sesión no dice que va en Sonnet 5.5: cámbiala en el selector antes de seguir.
