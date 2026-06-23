# Reconnect Power BI to PetFinder 3NF MySQL tables
$modelUrl = 'http://localhost/petfinder/api/pbi/model.php'
$syncUrl = 'http://localhost/petfinder/api/pbi/sync.php'

Write-Host '=== PetFinder Power BI 3NF Setup ===' -ForegroundColor Cyan
Write-Host ''

try {
    $model = Invoke-RestMethod -Uri $modelUrl -Method Get -TimeoutSec 30
    if (-not $model.success) {
        throw [System.Exception]::new($model.message)
    }

    Write-Host 'MySQL 3NF tables (live):' -ForegroundColor Green
    $model.tableCounts.PSObject.Properties | ForEach-Object {
        Write-Host ('  {0}: {1}' -f $_.Name, $_.Value)
    }

    if ($model.sampleReports.Count -gt 0) {
        Write-Host ''
        Write-Host 'Latest reports in MySQL:' -ForegroundColor Green
        $model.sampleReports | ForEach-Object {
            Write-Host ('  - {0} ({1}/{2}) @ {3}' -f $_.name, $_.species_name, $_.breed_name, $_.location)
        }
    }

    Write-Host ''
    Write-Host '--- Fix Power BI report (do this in Desktop) ---' -ForegroundColor Yellow
    $n = 1
    foreach ($step in $model.powerBiReconnectSteps) {
        Write-Host ('{0}. {1}' -f $n, $step)
        $n++
    }

    Write-Host ''
    Write-Host 'Data flow: website -> MySQL (instant) -> Power BI Refresh -> charts' -ForegroundColor Cyan
} catch {
    Write-Host 'ERROR: Could not reach API. Start Apache + MySQL in XAMPP.' -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host ''
$open = Read-Host 'Open model.php in browser for full JSON? (Y/N)'
if ($open -eq 'Y' -or $open -eq 'y') {
    Start-Process $modelUrl
}
