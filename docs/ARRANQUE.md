# Cómo arrancar la ejecución

## Antes (una sola vez)
1. Los tres PDF de Economía ya están en `banks/economia/fuentes/` (T1 «Decisiones», T2 «Sistemas», T3 «Mercado y entorno»; elegí la versión más reciente de cada uno). Si quieres otra versión, cámbiala por el mismo nombre. Esa carpeta no se sube a git.
2. Abre una **sesión nueva** con la carpeta `C:\Users\carla\Desktop\Projects\hexaprep` como carpeta de trabajo. Así se carga sola `CLAUDE.md`.
3. Elige **Sonnet 5.5** en el selector de modelo y **esfuerzo medio**. Modo de permisos recomendado: aceptar ediciones, para que no pregunte en cada archivo.

## Primer mensaje (pegar tal cual)
> Ejecuta el plan `docs/superpowers/plans/2026-11-14-hexaprep-economia.md` con `superpowers:executing-plans`. Sigue `CLAUDE.md` y `docs/MODELOS.md`: trabaja en Sonnet y lanza subagentes de Opus o Haiku donde la tabla lo indique. Responde corto y sin guiones largos. Me detienes solo en la Task 14 para aprobar los mockups.

## Qué esperar
- Avanza tarea a tarea, con tests en rojo y luego en verde, y un commit por tarea.
- Se detiene en la **Task 14**: te enseña los mockups en el navegador. Corrige lo que quieras; cuando apruebes, sigue.
- Si la conversación se llena, abre otra y pega el mismo mensaje: retoma desde el ledger y `git log` sin repetir nada.
- Al terminar te da una lista de decisiones que tomó por ti («Rulings») y de detalles menores aplazados.

## Si algo falla
- Una librería no instala con Python 3.14: el plan baja a 3.13 con `uv` (Task 1) y lo anota.
- Faltan PDF en `fuentes/`: la Task 12 se detiene y te lo dice.
