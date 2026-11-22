# Rediseñar pantallas con Claude Design (método y briefing del Perfil)

Método probado con la pantalla de acceso (2026-11-22, aprobado por Carla y ya en producción). Lo siguiente es hacer lo mismo con **Perfil**. Lienzo de referencia: https://claude.ai/artifact/BK5BmmthxZACo6d8Ew96UX (privado; copia de los archivos en `docs/mockups/acceso-claude-design/`).

## Qué es
«Design» es un tipo de artefacto de claude.ai: un lienzo con pantallas vivas (artboards `.dc.html`) para maquetas de interfaz. Sirve para comparar 2 o 3 ideas antes de tocar código. No transmite movimiento ni tacto: eso se anota y se comprueba después en el navegador.

## Proceso, paso a paso
1. **Leer lo real antes de dibujar:** `frontend/src/tokens.css` (colores, radios, curvas), la pantalla actual en el navegador a 390 px en claro y oscuro (Playwright con rutas simuladas, ver abajo) y los textos de `frontend/src/i18n.ts`. Sin esto salen diseños bonitos que no encajan.
2. **Skills:** `frontend-design` (dirección visual), `emil-design-eng` y `make-interfaces-feel-better` (detalles), `animate` o `ux-motion` para anotar el movimiento. Di en una frase cuál usas.
3. **Crear el lienzo:** `Artifact` con `type_url` `https://claude.ai/artifact/QKN21svewxgyPb6SYRqWnd`, `title` («Perfil HexaPrep») y `auto_open: "after_first_write"`. La respuesta trae las instrucciones del tipo: léelas, mandan para el formato.
4. **Escribir los archivos** en una carpeta del scratchpad (`<raiz>/project/...`): primero `canvas.json` completo (con todas las pantallas en `boards` y `order`), luego `Main.dc.html`, publicar las dos; después **una pantalla cada vez, publicándola antes de escribir la siguiente**. Con `url`, `root` y `file_path`.
5. **Qué pantallas:** 3 propuestas (A, B, C) a 390×844, los estados que cambian de verdad, y una versión de escritorio (`expand: "fill"`, fluida). Título de cada tablero con su idea. Una nota `title1` arriba.
6. **No verificar el lienzo** salvo que Carla lo pida (regla del tipo): no abrir, no capturar. Dile que lo mire ella y que cuente qué ve mal.
7. **Cuando Carla elija:** llevar al código con los componentes existentes, tests antes (`superpowers:test-driven-development`), medir con Playwright, `vitest` 2 veces, commit y push, comprobar el bundle en producción.

## Reglas del formato que se rompen en silencio
- Mantener `<script src="./support.js"></script>` exacto; `<x-dc>` con `<helmet>` para fuentes (Google Fonts `css2`, **Lexend 400/500/600**) y estilos de `body`, `:hover`, `:focus-visible`.
- Nada de `{{ expresión }}`: solo búsquedas con punto; lo calculado va en `renderVals()`. Los hexágonos se dibujan con `<sc-for>` y `points` calculados en JS (ver `Main.dc.html` del acceso).
- Botones y enlaces reales (`<button>`, `<a href>`), nunca `div` con `onClick`. Sin emojis. Iconos como SVG de trazo en línea. Contraste 4,5:1.
- Raíz fija a 390×844 para móvil; página fluida en escritorio (`flex-wrap`, sin px de ancho, `min-height: 100vh` solo en la raíz).
- Ids de gradientes SVG únicos dentro de cada archivo. Sin guiones largos ni «lorem ipsum»; los textos salen de `i18n.ts` salvo los nuevos, que se marcan como propuesta.

## Lo que Carla ya dejó claro (no volver a discutirlo)
- Le gusta la **continuidad icono, splash y pantallas**: ciruela (`#7A3470` a `#2A1030`), luz rosa (`#E27FB8`), hexágono con degradado `#FFF6FB`, `#F7C6E0`, `#E58FC0`, Lexend, esquinas de 11 a 16 px, sombra dura lila en el botón principal.
- **Hexágono como identidad, minimalismo, detalles premium** (principios de `ux-motion`: salidas más rápidas que entradas, cadenas de 45 ms, nada que se repita cientos de veces se anima).
- **Sin rachas, notas ni presión.** Cuentas de días practicados, nunca «no rompas la racha».
- **Pide primero ideas, elige y luego se implementa.** En el acceso eligió A (portada ciruela) y dejó B como idea para un onboarding futuro; descartó C.
- El registro se abrió a **cualquier cuenta de Google** con `HEXAPREP_EMAILS_PERMITIDOS=*` (cada persona nueva crea un esquema en Neon). Por eso conviene que Perfil piense en alguien que no es Carla.

## Briefing: pantalla de Perfil
**Archivos:** `frontend/src/pages/Perfil.tsx`, `perfil.css`, `Settings.tsx`; tests `frontend/tests/Perfil.test.tsx`; componentes `Examen` y `TemaEnCurso` (ahora en «Hoy», no aquí).

**Orden actual (commit `757c167` y posteriores):**
1. **Cuenta:** avatar hexagonal con la inicial (degradado ciruela con luz rosa, igual que el icono), nombre, correo, «Cerrar sesión». Solo online.
2. **Tu práctica:** días practicados, «Practicas desde» y «Últimos 7 días» (`resumenDias`, datos de `/api/history`). Sin racha, con nota que lo dice.
3. **Lo que ocultaste («aún no lo hemos dado»):** lista de temas o preguntas ocultas con «Volver a mostrar».
4. **Apariencia:** interruptor de cielo (sol y luna) para el modo oscuro e interruptor «Igual que el dispositivo».
5. **Ayuda:** «Ver la guía de bienvenida» e «Instalar la app» (botón nativo en Chrome y Edge, instrucciones para iPhone).
6. **Herramientas** (antes «Avanzado»), plegado: copias y exportaciones (solo en local), preguntas reportadas con editor, idioma (solo castellano, catalán «próximamente»).
7. **Empezar de cero** (solo online): zona delicada en rojo suave, confirmación con foco en Cancelar y Escape.

**Estados que conviene dibujar:** cuenta online y local sin cuenta; sin días practicados todavía; con 1 día y con 40; ocultos vacío y con elementos; app ya instalada (desaparece «Instalar») e instalable; Herramientas online y local; confirmación de reinicio; error de carga (`ErrorCarga`); modo claro y oscuro.

**Ideas para explorar en las propuestas** (elegir una distinta por variante):
- Cabecera protagonista con avatar grande y las tres cifras de práctica como hexágonos o mosaico, en lugar de tarjetas sueltas.
- Agrupar en 3 bloques con título (Tú, Preferencias, Datos) y menos tarjetas, o una lista tipo ajustes de iPhone con filas y chevrones.
- Un resumen de la **asignatura** actual (dominio, conceptos trabajados) para que Perfil no sea solo ajustes.
- «Borrar mi cuenta y mis datos» (hoy solo se puede empezar de cero): con el registro abierto es lo esperable. **Necesita backend**, plantearlo como propuesta, no como hecho.
- Tema de color de la asignatura en el avatar o el encabezado.
- Escritorio en dos columnas (identidad a la izquierda fija, ajustes a la derecha).

**Preguntas abiertas para Carla:** ¿«Lo que ocultaste» merece su sitio o va dentro de Herramientas? ¿Quiere el selector de idioma visible aunque solo haya castellano? ¿Le interesa un «Borrar mi cuenta»?

## Cómo ver el Perfil actual sin tocar datos reales
Playwright con rutas simuladas (ejemplo en el scratchpad de la sesión anterior; se rehace en 20 líneas): `page.route("**/api/perfil", ...)` devolviendo `{ email, nombre, online: true, reiniciar: true }`, `**/api/history` con `{ dias: [...], evolucion: [] }`, y `sessionStorage.setItem("hexaprep-splash","1")` en `addInitScript` para saltar la splash. Servidor: `preview_start` `hexaprep` (puerto 8002, usa datos reales: **no respondas preguntas ahí**). Construir antes con `cd frontend && npx vite build`.

## Límites ya conocidos
- El botón de Google lo dibuja Google (tema, forma y ancho; 40 px de alto): el mockup puede aproximarlo, no igualarlo.
- Lo que no se ve en un lienzo: movimiento, tacto, iPhone real, sesión real. Dilo siempre al final.
