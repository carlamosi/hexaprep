# Mockups aprobados

Carla Monté Sihuro aprobó los mockups de `docs/mockups/` (inicio, subtema, práctica, repaso de fallos, hoy, test de nivel, historial y ajustes) con el mensaje «Los apruebo».

## Decisiones registradas
Carla no indicó cambios en las cinco decisiones abiertas de la portada, así que se adoptan las opciones tal como están en los mockups aprobados:

- **Idioma de la interfaz:** castellano, con todos los textos en un diccionario i18n preparado para catalán (propuesta de SPEC 14). Cambiarlo a catalán más adelante es añadir el diccionario.
- **Panal:** nombre visible bajo cada hexágono.
- **Botones de confianza:** «Segura», «Dudo», «Adivino».
- **Colores por tema:** T1 azul, T2 verde, T3 naranja.
- **Contador de práctica:** se mantiene en la cabecera.

Cualquiera de estas cinco se puede cambiar después con un retoque pequeño.

## Alcance del frontend
La implementación debe coincidir con estos mockups (se comparará con capturas de Playwright en la Task 20). El generador del HTML no está en el repositorio: si se retoca un mockup, se edita el HTML directamente.

## Cambios posteriores pedidos por Carla (2026-11-15)
- **Historial:** el mockup `historial.html` queda superado. Ahora es un panel de análisis (resumen, mapa de calor de actividad, evolución del dominio, calibración de la confianza, hora y día, fatiga, velocidad, dificultad, trampas, conceptos débiles, sesiones) que lee `/api/analytics`. El HTML del mockup no se ha editado.
- **Panel de la asignatura** (al pulsar el hexágono grande de la portada) y **selector de asignatura** de la cabecera: nuevos, no estaban en los mockups.
