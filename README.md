# HexaPrep

App web de práctica para Carla Monté Sihuro: Economía y Matemáticas de 1º de Bachillerato, Química (en catalán) y Català.
Preguntas test, verdadero/falso, problemas con respuesta numérica y preguntas escritas con corrección letra a letra, con repaso por tema, repaso espaciado, historial de análisis y un porcentaje que es el progreso real del temario.
Dos modos: **local** (en tu equipo, sin cuentas ni nube) y **online** (Vercel y Neon, acceso con Google, instalable en el móvil). Sin claves de API ni telemetría. Este documento cubre el modo local; el estado completo está en `docs/ESTADO.md`.

## Requisitos

- Windows 11 con PowerShell.
- Python 3.14 o superior (usa `uuid.uuid7`, que solo existe desde 3.14).
- Node.js (probado con la versión 24), solo para compilar el frontend.

## Instalación y primer arranque

La forma rápida es un solo comando, desde la carpeta del proyecto:

```
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

El script crea el entorno virtual, instala las dependencias, compila el frontend, importa el banco, abre el navegador y arranca el servidor.

Manualmente, por si prefieres hacerlo paso a paso:

```
python -m venv .venv
.venv\Scripts\python -m pip install -e "backend[dev]"
cd frontend
npm ci
npm run build
cd ..
.venv\Scripts\python tools\import_bank.py --all
```

Los PDF fuente no están en git. Si los tienes, colócalos en `banks\<asignatura>\fuentes\` con los nombres de `docs\FUENTES.md`.

## Uso diario

Para arrancar, ejecuta `run.ps1` o bien:

```
.venv\Scripts\python -m hexaprep
```

Después abre http://127.0.0.1:8000. Para parar el servidor, pulsa Ctrl+C en la ventana de PowerShell.

Variables opcionales (válidas solo en la ventana donde las defines):

- `HEXAPREP_PORT`: puerto del servidor, 8000 por defecto. Si lo cambias, usa ese puerto en la dirección.
- `HEXAPREP_DATA`: carpeta de datos, `data\` por defecto.

Datos:

- `data\hexaprep.db`: base de datos SQLite.
- `data\backups\`: copias de seguridad. Al arrancar se crea una automática si la última tiene 7 días o más. También puedes crear una manual desde Ajustes.
- `data\exports\`: `weak.json`, `eventos.csv` y el banco exportado.

Para restaurar, ve a Ajustes y pulsa «Restaurar esta copia»: recupera la última copia que muestra la pantalla, tras pedirte confirmación. La base actual no se pierde: se guarda aparte, junto a `data\hexaprep.db`, con el sufijo `.pre-restore-` y la fecha.

## Banco de preguntas

La importación es idempotente: puedes repetirla cuantas veces quieras sin duplicar preguntas. Usa el comando de importación de la sección anterior.

Los bancos son los JSON de `banks\<asignatura>\` (se generan desde `banks\<asignatura>\src\` con `tools\build_quimica.py`; mira `docs\ESTADO.md`). Para editar un banco, cambia el JSON y vuelve a importar con `tools\import_bank.py --all`. Antes, exporta el banco actual desde Ajustes para tener una copia. Las preguntas reportadas se corrigen en Ajustes, en el editor de preguntas reportadas.

## Pruebas

```
.venv\Scripts\python -m pytest backend
cd frontend
npx vitest run
npx playwright test
```

La primera vez que ejecutes Playwright, instala el navegador con `npx playwright install chromium`. Playwright usa su propia carpeta de datos temporal y no toca `data\`.

## Estructura

```
backend\          API y lógica (paquete hexaprep, migraciones Alembic, tests)
frontend\         interfaz React + TypeScript + Vite (src, e2e, dist tras compilar)
banks\<asignatura>\ bancos JSON, src\ (fuentes compactas), texto\ (PDF extraídos), img\ y fuentes\ (PDF)
tools\            scripts del banco (import_bank.py, validate_bank.py, ...)
docs\             mockups aprobados y documentación de desarrollo
data\             datos locales (no se sube a git)
SPEC.md           qué es la app y por qué
run.ps1           arranque en un paso
```

## Si algo falla

- **El puerto está ocupado.** Otro programa usa el 8000 y el servidor no arranca. Define otro puerto y arranca de nuevo:
  ```
  $env:HEXAPREP_PORT = "8010"
  .venv\Scripts\python -m hexaprep
  ```
  Luego abre http://127.0.0.1:8010.
- **Falta un PDF de booklet.** La app avisa con un mensaje claro al abrir el booklet. Copia el PDF que falta en `banks\<asignatura>\fuentes\` con el nombre indicado en el aviso (lista en `docs\FUENTES.md`).
- **No se ve el frontend.** Falta compilarlo. Ejecuta `cd frontend`, `npm run build` y vuelve a la carpeta principal.
- **Falló la instalación a medias.** Como `run.ps1` solo crea `.venv` si no existe, borra la carpeta `.venv` y vuelve a ejecutar el script.
- **Python o Node no se encuentran.** `run.ps1` lo indica. Instala Python 3.14 o superior desde python.org (marca "Add python.exe to PATH") o Node.js desde nodejs.org.
- **PowerShell no deja ejecutar `run.ps1`.** Usa el comando con `-ExecutionPolicy Bypass` de la sección de instalación.
