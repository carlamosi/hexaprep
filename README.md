# HexaPrep

App web local de práctica tipo test de Economía (1º Bachillerato) para Carla Monté Sihuro.
Preguntas de los temas 1 a 3, con repaso por subtema y progreso guardado en tu propio equipo.
Sin cuentas, sin nube, sin claves de API y sin telemetría.

## Requisitos

- Windows 11 con PowerShell.
- Python 3.13 o superior (probado con 3.14).
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
.venv\Scripts\python tools\import_bank.py banks\economia\T1.json banks\economia\T2.json banks\economia\T3.json
```

Los PDF de los booklets no están en git. Si los tienes, colócalos en `banks\economia\fuentes\` con sus nombres originales.

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

Para editar el banco, cambia los JSON de `banks\economia\` (T1, T2, T3) y vuelve a importar. Antes, exporta el banco actual desde Ajustes para tener una copia. Las preguntas reportadas se corrigen en Ajustes, en el editor de preguntas reportadas.

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
banks\economia\   T1.json, T2.json, T3.json, fuentes compactas y PDF de booklets
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
- **Falta un PDF de booklet.** La app avisa con un mensaje claro al abrir el booklet. Copia el PDF que falta en `banks\economia\fuentes\` con el nombre indicado en el aviso.
- **No se ve el frontend.** Falta compilarlo. Ejecuta `cd frontend`, `npm run build` y vuelve a la carpeta principal.
- **Falló la instalación a medias.** Como `run.ps1` solo crea `.venv` si no existe, borra la carpeta `.venv` y vuelve a ejecutar el script.
- **Python o Node no se encuentran.** `run.ps1` lo indica. Instala Python 3.13 o superior desde python.org (marca "Add python.exe to PATH") o Node.js desde nodejs.org.
- **PowerShell no deja ejecutar `run.ps1`.** Usa el comando con `-ExecutionPolicy Bypass` de la sección de instalación.
