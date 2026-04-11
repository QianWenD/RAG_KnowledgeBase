param(
    [string]$BindHost = "127.0.0.1",
    [int]$Port = 8000,
    [switch]$InstallBase,
    [switch]$InstallRag,
    [switch]$StartMilvus,
    [switch]$UseMilvus,
    [switch]$RefreshMilvusCompose,
    [string]$Distro = "Ubuntu",
    [int]$HealthTimeoutSeconds = 60,
    [switch]$SkipApi,
    [switch]$SkipBrowser,
    [switch]$RunE2ESmoke
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Get-LocalHostForUrl {
    param([string]$HostName)

    if ($HostName -eq "0.0.0.0") {
        return "127.0.0.1"
    }
    return $HostName
}

function Test-HttpEndpoint {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 3
        return @{
            ok = $true
            status = $response.StatusCode
            body = $response.Content
        }
    } catch {
        return @{
            ok = $false
            error = $_.Exception.Message
        }
    }
}

function Wait-HttpEndpoint {
    param(
        [string]$Url,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $result = Test-HttpEndpoint -Url $Url
        if ($result.ok) {
            return $result
        }
        Start-Sleep -Seconds 2
    }

    return Test-HttpEndpoint -Url $Url
}

$localHost = Get-LocalHostForUrl -HostName $BindHost
$baseUrl = "http://${localHost}:${Port}"
$healthUrl = "$baseUrl/health"

Write-Host "RAGPro local stack"
Write-Host "Workspace: $projectRoot"
Write-Host "Frontend:  $baseUrl/"
Write-Host "Health:    $healthUrl"
Write-Host ""

if ($StartMilvus) {
    Write-Host "Checking Milvus prerequisites..."
    & (Join-Path $PSScriptRoot "check-milvus-prereqs.ps1")

    Write-Host ""
    Write-Host "Starting Milvus in WSL distro '$Distro'..."
    $milvusArgs = @("-Distro", $Distro)
    if ($RefreshMilvusCompose) {
        $milvusArgs += "-RefreshCompose"
    }
    & (Join-Path $PSScriptRoot "start-milvus-wsl.ps1") @milvusArgs
    $UseMilvus = $true
}

if (-not $SkipApi) {
    $currentHealth = Test-HttpEndpoint -Url $healthUrl
    if ($currentHealth.ok) {
        Write-Host "API already responds on $healthUrl; not starting a second API process."
    } else {
        Write-Host "Starting API and static frontend in a new PowerShell window..."

        $apiCommandParts = @(
            "Set-Location '$projectRoot'"
        )
        if ($UseMilvus) {
            $apiCommandParts += "`$env:RAGPRO_VECTOR_BACKEND = 'milvus'"
        }

        $startApiParts = @(
            "& '.\scripts\start-api.ps1'",
            "-BindHost '$BindHost'",
            "-Port $Port"
        )
        if ($InstallBase) {
            $startApiParts += "-InstallBase"
        }
        if ($InstallRag) {
            $startApiParts += "-InstallRag"
        }

        $apiCommandParts += ($startApiParts -join " ")
        $apiCommand = "& { " + ($apiCommandParts -join "; ") + " }"

        Start-Process `
            -FilePath "powershell" `
            -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $apiCommand) `
            -WorkingDirectory $projectRoot | Out-Null
    }
}

$health = Wait-HttpEndpoint -Url $healthUrl -TimeoutSeconds $HealthTimeoutSeconds
if (-not $health.ok) {
    throw "API health check failed: $($health.error)"
}

Write-Host ""
Write-Host "API health check passed with HTTP $($health.status)."
Write-Host $health.body

if (-not $SkipBrowser) {
    Write-Host ""
    Write-Host "Opening $baseUrl/ ..."
    Start-Process "$baseUrl/"
}

if ($RunE2ESmoke) {
    Write-Host ""
    Write-Host "Running Playwright smoke tests..."
    npm run test:e2e
}

Write-Host ""
Write-Host "Local stack is ready."
Write-Host "Common pages:"
Write-Host "- $baseUrl/"
Write-Host "- $baseUrl/qa"
Write-Host "- $baseUrl/knowledge"
Write-Host "- $baseUrl/users"
Write-Host "- $baseUrl/users/audit"
