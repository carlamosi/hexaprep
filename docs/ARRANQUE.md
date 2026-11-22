# Cómo retomar HexaPrep en una conversación nueva

## Antes de nada
- Abre la sesión con **`C:\Users\carla\Desktop\Projects\hexaprep` como carpeta de trabajo, sin worktree** (los PDF de `banks/*/fuentes/` y `.env.local` no están en git). Así se carga sola `CLAUDE.md`, que ya trae modelo, estilo, créditos y reglas de subida.

## Qué leer (poco, para gastar menos)
1. `CLAUDE.md` (se carga solo).
2. De `docs/ESTADO.md`, **solo** «Hecho el 2026-11-22» y «Siguientes pasos propuestos» (están al final; localízalas con Grep del título y lee desde ahí). El resto del archivo solo cuando la tarea lo toque.
3. Solo si hace falta: `docs/IDEAS.md` (backlog largo), `docs/PLAN-MEJORAS.md` (historial; todo hecho salvo H, aplazado), `SPEC.md` (decisiones de Carla, última sección), `banks/catala/FORMATO.md` (brief de contenido de Català).

## Primer mensaje (pegar tal cual)
> Retoma HexaPrep. Lee `CLAUDE.md` y, de `docs/ESTADO.md`, solo «Hecho el 2026-11-22» y «Siguientes pasos propuestos», más la sección «Qué skill usar» de `docs/ARRANQUE.md`. Dime en una línea con qué modelo vas y, para el siguiente paso que propones, qué skills usarías y por qué. No cambies nada hasta que yo apruebe un plan breve. Cuando termines algo verificado, súbelo (push) y confirma que la web ya lo sirve.

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
(Las reglas de subida, Neon y secretos están en `CLAUDE.md`; aquí solo los detalles.)
- **Producción:** Vercel, proyecto `hexaprep`; base Neon `hexaprep-db`; acceso con Google para los emails de `HEXAPREP_EMAILS_PERMITIDOS` (o cualquiera si vale `*`). Comprobar el despliegue: `curl -s https://hexaprep-app.vercel.app/ | grep -o 'assets/index-[^"]*\.js'` frente a `ls frontend/dist/assets/index-*.js`.
- **Neon desde la máquina:** URL directa (`DATABASE_URL_UNPOOLED` de `.env.local`). El entorno puede bloquear escrituras del asistente: no lo fuerces, dale a Carla el comando para su terminal (con `.venv\Scripts\python.exe`, no `python` a secas). Los secretos nuevos: `vercel env add ... --sensitive` con stdin.

## Comandos que más se usan (Windows, Git Bash)
- Pruebas: `.venv\Scripts\python tools\probar.py back|front|todo [-k expr] [--lento]` (resumen corto; salida completa en `data/probar-*.txt`). Backend a mano: `PYTHONUTF8=1 .venv/Scripts/python -m pytest backend -q > salida.log` y lee la cola. Frontend: `cd frontend`; `npx vitest run`, `npx tsc --noEmit`, `npm run build`, `npx playwright test` (escritorio y iPhone).
- Contenido de Català: `tools/build_quimica.py banks/catala/src/<N2|G1> banks/catala/<N2|G1>.json`; luego `python tools/actualizar_perfiles.py` (con `DATABASE_URL` directa) para llevar bancos y migraciones a todos los perfiles de Neon.
- Estado online: `python tools/prueba_online.py` (guardado real), `python tools/respaldo_neon.py` (copia local), `python tools/perfiles.py listar|archivar EMAIL`.

## Si algo falla
- Un test de e2e falla solo a veces: comprueba si depende de acertar al azar (el progreso real no sube al fallar); no lo des por bueno sin entender el motivo.
- Dudas de contenido de Català: la profesora manda sobre el IEC (criterios dudosos anotados en `docs/ESTADO.md`).
