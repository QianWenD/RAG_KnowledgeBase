param(
    [string]$Distro = "Ubuntu",
    [string]$MilvusVersion = "v2.6.11",
    [int]$TimeoutSeconds = 180,
    [switch]$RefreshCompose
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot "runtime"
$pidFile = Join-Path $runtimeDir "milvus-wsl.pid"
$stdoutLog = Join-Path $runtimeDir "milvus-wsl.stdout.log"
$stderrLog = Join-Path $runtimeDir "milvus-wsl.stderr.log"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

function Get-KeepaliveProcess {
    if (-not (Test-Path $pidFile)) {
        return $null
    }
    $rawPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
    if (-not $rawPid) {
        return $null
    }
    try {
        return Get-Process -Id ([int]$rawPid) -ErrorAction Stop
    } catch {
        return $null
    }
}

function Test-TcpPort {
    param(
        [string]$HostName,
        [int]$Port
    )

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($HostName, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(1000, $false)) {
            return $false
        }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

$keepalive = Get-KeepaliveProcess
if (-not $keepalive) {
    if (Test-Path $stdoutLog) {
        Remove-Item -LiteralPath $stdoutLog -Force
    }
    if (Test-Path $stderrLog) {
        Remove-Item -LiteralPath $stderrLog -Force
    }

    $keepaliveCommand = "systemctl start docker && exec tail -f /dev/null"
    $keepaliveArgs = "-d $Distro -- bash -lc ""$keepaliveCommand"""
    $keepalive = Start-Process `
        -FilePath "wsl.exe" `
        -ArgumentList $keepaliveArgs `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -PassThru
    Set-Content -Path $pidFile -Value $keepalive.Id
    Start-Sleep -Seconds 3
}

$refreshFlag = if ($RefreshCompose) { "1" } else { "0" }
$prepareCompose = @'
set -euo pipefail
systemctl start docker
mkdir -p /root/milvus-standalone
cd /root/milvus-standalone
if [ ! -f docker-compose.yml ] || [ "__REFRESH_FLAG__" = "1" ]; then
  curl -fsSL -o docker-compose.yml "https://github.com/milvus-io/milvus/releases/download/__MILVUS_VERSION__/milvus-standalone-docker-compose.yml"
fi
sed -i '/^version:/d' docker-compose.yml
ensure_image() {
  local target="$1"
  local mirror="$2"
  if docker image inspect "$target" >/dev/null 2>&1; then
    return 0
  fi
  if docker pull "$target" >/dev/null 2>&1; then
    return 0
  fi
  docker pull "$mirror"
  docker tag "$mirror" "$target"
}
ensure_image "quay.io/coreos/etcd:v3.5.25" "quay.io/coreos/etcd:v3.5.25"
ensure_image "minio/minio:RELEASE.2024-12-18T13-15-44Z" "docker.m.daocloud.io/minio/minio:RELEASE.2024-12-18T13-15-44Z"
ensure_image "milvusdb/milvus:__MILVUS_VERSION__" "docker.m.daocloud.io/milvusdb/milvus:__MILVUS_VERSION__"
docker compose up -d
'@
$prepareCompose = $prepareCompose.Replace("__REFRESH_FLAG__", $refreshFlag).Replace("__MILVUS_VERSION__", $MilvusVersion)
$prepareCompose = $prepareCompose -replace "`r`n", "`n"

$tempScript = Join-Path $runtimeDir "start-milvus-wsl.sh"
[System.IO.File]::WriteAllText($tempScript, $prepareCompose, [System.Text.UTF8Encoding]::new($false))
$resolvedTempScript = (Resolve-Path $tempScript).Path
$driveLetter = $resolvedTempScript.Substring(0, 1).ToLowerInvariant()
$pathRemainder = $resolvedTempScript.Substring(2).Replace("\", "/")
$tempScriptWsl = "/mnt/$driveLetter$pathRemainder"
$originalPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$composeOutput = & wsl -d $Distro -- bash $tempScriptWsl 2>&1
$ErrorActionPreference = $originalPreference
if ($composeOutput) {
    $composeOutput | Write-Host
}
if ($LASTEXITCODE -ne 0) {
    throw "Failed to start Milvus compose inside WSL."
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$ready = $false
while ((Get-Date) -lt $deadline) {
    if ((Test-TcpPort -HostName "127.0.0.1" -Port 19530) -and (Test-TcpPort -HostName "127.0.0.1" -Port 9091)) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
}

$status = wsl -d $Distro -- bash -lc "docker ps --format 'table {{.Names}}\t{{.Status}}'"
$status | Write-Host

if (-not $ready) {
    throw "Milvus ports 19530/9091 did not become ready within ${TimeoutSeconds}s."
}

Write-Host ""
Write-Host "Milvus Standalone is running in WSL."
Write-Host "Keepalive PID: $($keepalive.Id)"
Write-Host "Ports: 127.0.0.1:19530 (gRPC), 127.0.0.1:9091 (health)"
