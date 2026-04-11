param(
    [int]$RecommendedMemoryGB = 16,
    [int]$RecommendedFreeDiskGB = 40
)

$ErrorActionPreference = "SilentlyContinue"

function Test-Command {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Normalize-ConsoleText {
    param([string]$Value)
    if (-not $Value) {
        return $null
    }
    return ($Value -replace "`0", "").Trim()
}

$os = Get-CimInstance Win32_OperatingSystem
$computer = Get-CimInstance Win32_ComputerSystem
$cDrive = Get-PSDrive -Name C -PSProvider FileSystem

$dockerInstalled = Test-Command "docker"
$wslInstalled = Test-Command "wsl"
$wslStatus = $null
$wslDistros = $null

if ($wslInstalled) {
    $wslStatus = Normalize-ConsoleText((wsl --status | Out-String))
    $wslDistros = Normalize-ConsoleText((wsl -l -v | Out-String))
}

$report = [ordered]@{
    windows_caption = $os.Caption
    windows_version = $os.Version
    os_architecture = $os.OSArchitecture
    total_memory_gb = [math]::Round($computer.TotalPhysicalMemory / 1GB, 2)
    logical_processors = $computer.NumberOfLogicalProcessors
    c_drive_free_gb = [math]::Round($cDrive.Free / 1GB, 2)
    docker_installed = $dockerInstalled
    wsl_installed = $wslInstalled
    ready_for_local_milvus = ($dockerInstalled -and $wslInstalled -and ($computer.TotalPhysicalMemory / 1GB) -ge $RecommendedMemoryGB -and ($cDrive.Free / 1GB) -ge $RecommendedFreeDiskGB)
    recommended_next_step = if (-not $wslInstalled) {
        "Install WSL2 first."
    } elseif (-not $dockerInstalled) {
        "Install Docker Desktop and enable WSL integration."
    } elseif (($computer.TotalPhysicalMemory / 1GB) -lt $RecommendedMemoryGB) {
        "Memory is lower than the recommended baseline for a comfortable local Milvus setup."
    } elseif (($cDrive.Free / 1GB) -lt $RecommendedFreeDiskGB) {
        "Free up more disk space on the system drive before installing Docker Desktop and Milvus."
    } else {
        "Machine looks ready for a local Docker-based Milvus deployment."
    }
    wsl_status = $wslStatus
    wsl_distros = $wslDistros
}

$report | ConvertTo-Json -Depth 4
