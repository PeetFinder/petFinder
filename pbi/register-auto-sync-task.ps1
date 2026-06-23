# Registers a Windows scheduled task that checks MySQL + triggers Power BI refresh every 10 minutes.
# Run once as Administrator:  powershell -ExecutionPolicy Bypass -File pbi\register-auto-sync-task.ps1

$taskName = 'PetFinder-PBI-AutoSync'
$syncUrl = 'http://localhost/petfinder/api/pbi/auto-sync.php?key=petfinder-local-sync'
$scriptPath = Join-Path $PSScriptRoot 'run-auto-sync.ps1'

@"
`$ErrorActionPreference = 'SilentlyContinue'
try {
    Invoke-RestMethod -Uri '$syncUrl' -Method Get -TimeoutSec 120 | Out-Null
} catch { }
"@ | Set-Content -Path $scriptPath -Encoding UTF8

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration ([TimeSpan]::MaxValue)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'PetFinder MySQL + Power BI auto-sync' -Force | Out-Null
    Write-Host "Scheduled task '$taskName' registered (every 10 minutes)." -ForegroundColor Green
    Write-Host "URL: $syncUrl"
} catch {
    Write-Host 'Could not register task. Run PowerShell as Administrator.' -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ''
    Write-Host 'Manual fallback: open Task Scheduler and run this URL every 10 minutes:'
    Write-Host $syncUrl
}
