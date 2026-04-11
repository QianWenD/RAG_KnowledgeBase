param(
    [string]$Distro = "Ubuntu"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot "runtime"
$pidFile = Join-Path $runtimeDir "milvus-wsl.pid"

try {
    $originalPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $stopOutput = & wsl -d $Distro -- bash -lc "set -euo pipefail; if [ -d /root/milvus-standalone ]; then cd /root/milvus-standalone && sed -i '/^version:/d' docker-compose.yml && docker compose down; fi" 2>&1
    $ErrorActionPreference = $originalPreference
    if ($stopOutput) {
        $stopOutput | Write-Host
    }
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose down exited with code $LASTEXITCODE"
    }
} catch {
    $ErrorActionPreference = $originalPreference
    Write-Warning "Failed to stop docker compose inside WSL: $($_.Exception.Message)"
}

if (Test-Path $pidFile) {
    $rawPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
    if ($rawPid) {
        try {
            Stop-Process -Id ([int]$rawPid) -Force -ErrorAction Stop
        } catch {
            Write-Warning "Failed to stop keepalive PID ${rawPid}: $($_.Exception.Message)"
        }
    }
    Remove-Item -LiteralPath $pidFile -Force
}

Write-Host "Milvus WSL services have been stopped."
