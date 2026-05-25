param(
  [string]$HealthUrl = "http://127.0.0.1:8000/health",
  [string]$EvaluationDataset = "packages\data\evaluation\current_domain_regression.json",
  [switch]$SkipHealth,
  [switch]$SkipPython,
  [switch]$SkipE2E,
  [switch]$SkipEvaluation
)

$ErrorActionPreference = "Stop"

function Invoke-ReleaseStep {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "==> $Name" -ForegroundColor Cyan
  & $Action
  Write-Host "OK: $Name" -ForegroundColor Green
}

function Invoke-CommandStep {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [string[]]$Arguments = @()
  )

  Invoke-ReleaseStep -Name $Name -Action {
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "$Name failed with exit code $LASTEXITCODE"
    }
  }
}

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$python = Join-Path $repoRoot ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $python)) {
  throw "Python virtual environment not found: $python"
}

Write-Host "RAGPro release check" -ForegroundColor White
Write-Host "Repository: $repoRoot" -ForegroundColor DarkGray

if (-not $SkipHealth) {
  Invoke-ReleaseStep -Name "Health check" -Action {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $HealthUrl -TimeoutSec 15
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
      throw "Health check returned HTTP $($response.StatusCode)"
    }
    Write-Host $response.Content
  }
}

if (-not $SkipPython) {
  Invoke-CommandStep -Name "Python tests" -FilePath $python -Arguments @("-m", "unittest", "discover", "tests")
}

if (-not $SkipE2E) {
  Invoke-CommandStep -Name "Frontend E2E" -FilePath "npm" -Arguments @("run", "test:e2e")
}

if (-not $SkipEvaluation) {
  Invoke-CommandStep -Name "RAG evaluation" -FilePath $python -Arguments @(
    "apps\worker\run_evaluation.py",
    "--dataset",
    $EvaluationDataset,
    "--mode",
    "app",
    "--fail-under",
    "1.0"
  )
}

Write-Host ""
Write-Host "Release check completed." -ForegroundColor Green
