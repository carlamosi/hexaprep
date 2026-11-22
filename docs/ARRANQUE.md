# Cómo retomar HexaPrep en una conversación nueva

## Antes de nada
1. Abre la sesión con **`C:\Users\carla\Desktop\Projects\hexaprep` como carpeta de trabajo, sin worktree** (los PDF de `banks/*/fuentes/` no están en git y `.env.local` tampoco). Así se carga sola `CLAUDE.md`.
2. Modelo: **Sonnet 5.5, esfuerzo medio**. Los agentes de contenido y las revisiones se lanzan como subagentes (`docs/MODELOS.md`); Opus solo para revisar lo que cambia o para decisiones de diseño difíciles.
3. Responde a Carla en español, corto y **sin guiones largos**. Gasta pocos créditos: no releas lo ya establecido, no revises de nuevo todo el banco.

## Qué leer (en este orden, es poco)
1. `CLAUDE.md` (reglas del proyecto y del entorno).
2. `docs/ESTADO.md`: qué hay hecho, cómo se prueba, cómo se amplían los bancos (**los ids dependen de la posición**), infraestructura online, pendientes y siguientes pasos.
3. `docs/PLAN-MEJORAS.md` (lista de progreso: todo hecho salvo H, aplazado) y la sección «Siguientes pasos propuestos» de `docs/ESTADO.md`. `docs/IDEAS.md` es el catálogo largo.
4. Solo si hace falta: `SPEC.md` (decisiones de Carla, última sección), `banks/catala/FORMATO.md` (brief para generar contenido de Català).

## Primer mensaje (pegar tal cual)
> Retoma HexaPrep. Lee `CLAUDE.md`, `docs/ESTADO.md` (sobre todo «Siguientes pasos propuestos») y la sección «Qué skill usar» de `docs/ARRANQUE.md`. Dime en una línea con qué modelo vas y, para el siguiente paso que propones, qué skills usarías y por qué. No cambies nada hasta que yo apruebe un plan breve. Cuando termines algo verificado, súbelo (push) y confirma que la web ya lo sirve.

## Qué skill usar (según lo que pida Carla)
Di en una frase cuál usas y por qué. Las de diseño están instaladas en `~/.claude/skills` (si no aparecen en la lista de la sesión, abre una conversación nueva).

| Si Carla pide... | Usa | Notas |
|---|---|---|
| Una pantalla o función nueva (UI) | `superpowers:brainstorming` y luego `frontend-design`; si lleva movimiento, `animate` | Boceto aprobado antes de implementar (artefacto). Lógica nueva con `superpowers:test-driven-development`. |
| Pulir o revisar la interfaz existente | `make-interfaces-feel-better` (`quick` o `full`) | Radios concéntricos, números tabulares, áreas táctiles de 44 px, sombras, iconos. |
| «Que se sienta mejor», microinteracciones, auditar el movimiento | `improve-animations` (solo audita y planifica) y después `animate` para aplicar | Primero la puerta de frecuencia: lo que se repite cientos de veces por sesión no se anima (cambio de pregunta, teclado). |
| Una animación concreta | `animate` | Sale del código de la skill, nunca de memoria; reduced-motion y hover gating incluidos. |
| Criterio general de detalle y pulso | `emil-design-eng` | Marco de decisión de animación y componentes. |
| Gráficos del Historial o paneles de datos | `dataviz` | Antes de escribir el primer gráfico. |
| Un bug o un test que falla | `superpowers:systematic-debugging` | Test que reproduzca el fallo primero. Medir en el navegador antes de dar por arreglado. |
| Contenido nuevo del banco | agentes Sonnet con `banks/<asignatura>/FORMATO.md`; muestra revisada por Opus | Ids por posición, no reordenar. Después `tools/actualizar_perfiles.py` (Carla, con su OK). |
| Una librería o API concreta | context7 | fsrs, fastapi, sqlalchemy, alembic, tailwind, motion, katex. |
| Antes de dar algo por hecho | `superpowers:verification-before-completion` | Tests, tsc, build, Playwright y medir en pantalla. |
| Guardar cambios | `/commit:commit` o `git commit` directo | En este repo: commit y push al acabar. |
| Revisar antes de un PR grande | `/pr-review-toolkit:review-pr` | Rara vez: se trabaja en `main`. |

No instaladas (del repo `emilkowalski/skills`, pedir OK a Carla antes): `review-animations` (critica un diff de movimiento), `find-animation-opportunities`, `mobile-native` (arregla fallos de sensación nativa en el iPhone), `break-ui` (prueba la interfaz con datos extremos).

## Datos que no están en el código
- **Producción:** https://hexaprep-app.vercel.app (Vercel, proyecto `hexaprep`; base Neon `hexaprep-db`; acceso con Google, solo los emails de `HEXAPREP_EMAILS_PERMITIDOS`). Cada `git push` a `main` redespliega; **al acabar cada cambio verificado haz commit y push sin esperar a que lo pida** (Carla quiere ver los cambios en la web al momento) y comprueba que el despliegue sirve el build nuevo: compara `curl -s https://hexaprep-app.vercel.app/ | grep -o 'assets/index-[^"]*\.js'` con `ls frontend/dist/assets/index-*.js` (tarda 1 a 2 minutos). Nunca empujes sin verificar.
- **GitHub:** `carlamosi/hexaprep` (público). No escribas emails ni datos personales en archivos del repo.
- **Credenciales:** viven en las variables de Vercel y en `.env.local`. Nunca las escribas en archivos versionados ni las muestres en la conversación (`vercel env add ... --sensitive` con stdin).
- **Neon desde la máquina:** se usa la URL directa (`DATABASE_URL_UNPOOLED` de `.env.local`) para tareas de administración. Escribir en Neon desde el asistente puede ser bloqueado por el entorno: en ese caso no lo fuerces; dale a Carla el comando para su terminal (con `.venv\Scripts\python.exe`, no `python` a secas).

## Comandos que más se usan (Windows, Git Bash)
- Pruebas: `.venv\Scripts\python tools\probar.py back|front|todo [-k expr] [--lento]` (resumen corto; salida completa en `data/probar-*.txt`). Backend a mano: `PYTHONUTF8=1 .venv/Scripts/python -m pytest backend -q > salida.log` y lee la cola. Frontend: `cd frontend`; `npx vitest run`, `npx tsc --noEmit`, `npm run build`, `npx playwright test` (escritorio y iPhone).
- Servidor de pruebas: `preview_start` con el nombre `hexaprep` (puerto 8002, datos reales: no respondas preguntas ahí sin avisar).
- Contenido de Català: `tools/build_quimica.py banks/catala/src/<N2|G1> banks/catala/<N2|G1>.json`; luego `python tools/actualizar_perfiles.py` (con `DATABASE_URL` directa) para llevar bancos y migraciones a todos los perfiles de Neon.
- Estado online: `python tools/prueba_online.py` (guardado real), `python tools/respaldo_neon.py` (copia local), `python tools/perfiles.py listar|archivar EMAIL`.

## Si algo falla
- Scripts largos con comillas y heredocs fallan en Git Bash: escríbelos con Write en el scratchpad y ejecútalos.
- Un test de e2e falla solo a veces: comprueba si depende de acertar al azar (el progreso real no sube al fallar); no lo des por bueno sin entender el motivo.
- Dudas de contenido de Català: la profesora manda sobre el IEC (criterios dudosos anotados en `docs/ESTADO.md`).
