param(
    [string]$BindHost = "127.0.0.1",
    [int]$Port = 8000,
    [switch]$InstallBase,
    [switch]$InstallRag
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$venvPath = Join-Path $projectRoot ".venv"
$pythonExe = Join-Path $venvPath "Scripts\\python.exe"

if (-not (Test-Path $pythonExe)) {
    python -m venv $venvPath
}

& $pythonExe -m pip install --upgrade pip

if ($InstallBase -or $InstallRag) {
    & $pythonExe -m pip install -r (Join-Path $projectRoot "requirements.txt")
}

if ($InstallRag) {
    & $pythonExe -m pip install -r (Join-Path $projectRoot "requirements-rag.txt")
}

& $pythonExe -m uvicorn apps.api.main:app --host $BindHost --port $Port --reload
