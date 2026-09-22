$ErrorActionPreference = 'SilentlyContinue'
$appRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $appRoot '.runtime\server.pid'

if (Test-Path -LiteralPath $pidFile) {
    $savedPid = [int](Get-Content -LiteralPath $pidFile -Raw)
    $process = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName -eq 'node') {
        Stop-Process -Id $savedPid -Force
        $null = $process.WaitForExit(3000)
    }
    Remove-Item -LiteralPath $pidFile -Force
}

