# Modelo por tarea

**Sesión principal: Sonnet 5.5, esfuerzo medio.** Implementa todo salvo lo marcado. Cambiar de modelo = lanzar un subagente con `Agent(model="opus"|"haiku", ...)`; el subagente devuelve un resultado corto y la sesión principal sigue. Cada subagente cuesta una lectura de contexto nueva: úsalos solo donde la tabla lo dice.

| Tarea | Quién | Cómo |
|---|---|---|
| 1 a 4 (entorno, esquema, validador, importador) | Sonnet (sesión) | Directo |
| 5 a 8 (eventos, dominio, selector, repetición) | Sonnet (sesión) implementa; **Opus revisa una sola vez tras la Task 8** | `Agent(model="opus")` con el rango de commits de las Tasks 5 a 8, el SPEC secciones 5 y 6 y el Review Focus. Corrige lo Crítico e Importante con TDD |
| 9 a 11 (calidad, copias, API) | Sonnet (sesión) | Directo |
| 12 (extractor) | Sonnet (sesión) | Directo |
| 13 (banco) | Sonnet (sesión) genera por bloques; **Opus verifica** | Un `Agent(model="opus")` por tema con solo el JSON del 10 % de la muestra y el texto fuente de esas páginas. Resultado en `docs/verificacion-banco.md` |
| 14 (mockups, puerta de diseño) | **Opus** produce los HTML; Sonnet presenta y retoca | `Agent(model="opus")` con SPEC sección 7, tokens de marca y datos de ejemplo; guarda en `docs/mockups/`. La sesión principal los abre para Carla y **se detiene hasta su aprobación**. Cambios pequeños, Sonnet; rediseño grande, Opus otra vez |
| 15 (esqueleto frontend) | Sonnet (sesión) | Directo |
| 16 (panal de dominio) | **Opus** implementa el componente | `Agent(model="opus")` con el mockup aprobado, la interfaz de la Task 16 y sus tests; la sesión revisa el diff y ejecuta las pruebas |
| 17 a 19 (práctica, flujos, historial) | Sonnet (sesión) | Directo |
| 20 (cierre) | **Haiku** escribe `README.md` y `run.ps1`; Sonnet ejecuta e2e; **Opus hace la revisión final** | `Agent(model="haiku")` para los dos documentos. Revisión final: `Agent(model="opus")` con el paquete de revisión, plan, spec, Review Focus y los `Ruling:` del ledger |

## Reglas de ahorro
- Máximo unas 9 llamadas a subagentes en todo el plan: una de revisión (Tasks 5 a 8), tres de verificación del banco, una o dos de mockups, una del panal, una de Haiku y la revisión final.
- Los scripts deterministas (validar, importar, exportar, copias) nunca pasan por un modelo.
- La revisión final usa Opus 5.5 aunque la skill diga «el más capaz»: es una decisión de Carla para cuidar créditos. Fable solo si Opus encuentra algo Crítico que no sabe resolver.
- Si la sesión se compacta, no repitas tareas: lee el ledger.
