param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $appRoot '.runtime'
$pidFile = Join-Path $runtimeDir 'server.pid'
$stdoutLog = Join-Path $runtimeDir 'server.out.log'
$stderrLog = Join-Path $runtimeDir 'server.err.log'
$port = 3090

$envFile = Join-Path $appRoot '.env'
if (Test-Path -LiteralPath $envFile) {
    $portLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^\s*PORT\s*=\s*\d+\s*$' } | Select-Object -Last 1
    if ($portLine) { $port = [int](($portLine -split '=', 2)[1].Trim()) }
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

if (Test-Path -LiteralPath $pidFile) {
    $savedPid = [int](Get-Content -LiteralPath $pidFile -Raw)
    if (Get-Process -Id $savedPid -ErrorAction SilentlyContinue) {
        if (-not $NoBrowser) { Start-Process "http://127.0.0.1:$port/" }
        exit 0
    }
    Remove-Item -LiteralPath $pidFile -Force
}

$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$process = Start-Process -FilePath $nodePath `
    -ArgumentList @('--env-file-if-exists=.env', 'server.js') `
    -WorkingDirectory $appRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru
[System.IO.File]::WriteAllText($pidFile, [string]$process.Id)

$ready = $false
for ($attempt = 0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Milliseconds 250
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 1
        if ($health.ok) { $ready = $true; break }
    } catch { }
}

if (-not $ready) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    throw "伺服器啟動失敗，請查看 .runtime\server.err.log"
}

if (-not $NoBrowser) { Start-Process "http://127.0.0.1:$port/" }

