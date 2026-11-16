# Cómo retomar HexaPrep en una conversación nueva

## Antes de nada
1. Abre la sesión con **`C:\Users\carla\Desktop\Projects\hexaprep` como carpeta de trabajo, sin worktree** (los PDF de `banks/*/fuentes/` no están en git y `.env.local` tampoco). Así se carga sola `CLAUDE.md`.
2. Modelo: **Sonnet 5.5, esfuerzo medio**. Los agentes de contenido y las revisiones se lanzan como subagentes (`docs/MODELOS.md`); Opus solo para revisar lo que cambia o para decisiones de diseño difíciles.
3. Responde a Carla en español, corto y **sin guiones largos**. Gasta pocos créditos: no releas lo ya establecido, no revises de nuevo todo el banco.

## Qué leer (en este orden, es poco)
1. `CLAUDE.md` (reglas del proyecto y del entorno).
2. `docs/ESTADO.md`: qué hay hecho, cómo se prueba, cómo se amplían los bancos (**los ids dependen de la posición**), infraestructura online, pendientes y siguientes pasos.
3. `docs/IDEAS.md`: catálogo de mejoras con el backlog priorizado. Es lo que toca a continuación.
4. Solo si hace falta: `SPEC.md` (decisiones de Carla, última sección), `banks/catala/FORMATO.md` (brief para generar contenido de Català).

## Primer mensaje (pegar tal cual)
> Retoma HexaPrep. Lee `CLAUDE.md`, `docs/ESTADO.md` y `docs/IDEAS.md`. Dime en una línea con qué modelo vas y cuál es el siguiente paso que propones del backlog de `IDEAS.md`. No cambies nada hasta que yo apruebe un plan breve.

## Datos que no están en el código
- **Producción:** https://hexaprep-app.vercel.app (Vercel, proyecto `hexaprep`; base Neon `hexaprep-db`; acceso con Google, solo los emails de `HEXAPREP_EMAILS_PERMITIDOS`). Cada `git push` a `main` redespliega; **empuja solo tras verificar** y cuando Carla pida aplicar o desplegar.
- **GitHub:** `carlamosi/hexaprep` (público). No escribas emails ni datos personales en archivos del repo.
- **Credenciales:** viven en las variables de Vercel y en `.env.local`. Nunca las escribas en archivos versionados ni las muestres en la conversación (`vercel env add ... --sensitive` con stdin).
- **Neon desde la máquina:** se usa la URL directa (`DATABASE_URL_UNPOOLED` de `.env.local`) para tareas de administración. Al cerrar la conversación anterior la red rechazaba el puerto 5432: si ocurre, no fuerces la protección del entorno, díselo a Carla.

## Comandos que más se usan (Windows, Git Bash)
- Backend: `PYTHONUTF8=1 .venv/Scripts/python -m pytest backend -q > salida.log` y lee la cola. Frontend: `cd frontend`; `npx vitest run`, `npx tsc --noEmit`, `npm run build`, `npx playwright test` (escritorio y iPhone).
- Servidor de pruebas: `preview_start` con el nombre `hexaprep` (puerto 8002, datos reales: no respondas preguntas ahí sin avisar).
- Contenido de Català: `tools/build_quimica.py banks/catala/src/<N2|G1> banks/catala/<N2|G1>.json`; luego `python tools/actualizar_perfiles.py` (con `DATABASE_URL` directa) para llevar bancos y migraciones a todos los perfiles de Neon.
- Estado online: `python tools/prueba_online.py` (guardado real), `python tools/respaldo_neon.py` (copia local), `python tools/perfiles.py listar|archivar EMAIL`.

## Si algo falla
- Scripts largos con comillas y heredocs fallan en Git Bash: escríbelos con Write en el scratchpad y ejecútalos.
- Un test de e2e falla solo a veces: comprueba si depende de acertar al azar (el progreso real no sube al fallar); no lo des por bueno sin entender el motivo.
- Dudas de contenido de Català: la profesora manda sobre el IEC (criterios dudosos anotados en `docs/ESTADO.md`).
