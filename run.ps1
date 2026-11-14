# Arranca HexaPrep: prepara lo necesario la primera vez y lanza el servidor local.
# Compatible con Windows PowerShell 5.1. Ctrl+C para parar el servidor.
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$venvPy = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

# 1. Entorno virtual y dependencias del backend
if (-not (Test-Path $venvPy)) {
    $pyCmd = $null
    $pyArgs = @()
    if (Get-Command py -ErrorAction SilentlyContinue) {
        $pyCmd = "py"
        $pyArgs = @("-3")
    } elseif (Get-Command python -ErrorAction SilentlyContinue) {
        $pyCmd = "python"
    }
    if (-not $pyCmd) {
        throw "No encuentro Python. Instálalo desde python.org (3.14 o superior) y marca 'Add python.exe to PATH'."
    }
    & $pyCmd @pyArgs -c "import sys; sys.exit(0 if sys.version_info >= (3, 14) else 1)"
    if ($LASTEXITCODE -ne 0) { throw "Hace falta Python 3.14 o superior." }

    Write-Host "Creando el entorno virtual en .venv..."
    & $pyCmd @pyArgs -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw "No se pudo crear .venv." }

    Write-Host "Instalando el backend (puede tardar un poco)..."
    & $venvPy -m pip install -e "backend[dev]"
    if ($LASTEXITCODE -ne 0) { throw "Falló la instalación del backend." }
}

# 2. Frontend compilado (lo sirve el backend)
if (-not (Test-Path (Join-Path $PSScriptRoot "frontend\dist\index.html"))) {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw "No encuentro Node.js. Instálalo desde nodejs.org (versión LTS) y vuelve a ejecutar run.ps1."
    }
    Push-Location (Join-Path $PSScriptRoot "frontend")
    try {
        Write-Host "Instalando dependencias del frontend..."
        npm ci
        if ($LASTEXITCODE -ne 0) { throw "Falló npm ci." }

        Write-Host "Compilando el frontend..."
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Falló npm run build." }
    } finally {
        Pop-Location
    }
}

# 3. Banco de preguntas (idempotente: repetirlo no duplica nada)
$bancos = @("banks\economia\T1.json", "banks\economia\T2.json", "banks\economia\T3.json") | Where-Object { Test-Path $_ }
if ($bancos) {
    Write-Host "Importando el banco de preguntas..."
    & $venvPy tools\import_bank.py @bancos
    if ($LASTEXITCODE -ne 0) { throw "Falló la importación del banco." }
} else {
    Write-Host "No encuentro los bancos en banks\economia, se omite la importación."
}

# 4. Navegador y servidor en primer plano
$port = $env:HEXAPREP_PORT
if (-not $port) { $port = "8000" }
$url = "http://127.0.0.1:$port"

Write-Host "Abriendo $url. Pulsa Ctrl+C para parar el servidor."
Start-Job -ScriptBlock { param($u) Start-Sleep -Seconds 3; Start-Process $u } -ArgumentList $url | Out-Null
& $venvPy -m hexaprep
