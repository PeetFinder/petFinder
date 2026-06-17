# Sync Excel from database, then show Power BI refresh steps.
$root = Split-Path -Parent $PSScriptRoot
$syncUrl = 'http://localhost/petfinder/api/pbi/sync.php'

Write-Host 'PetFinder - Excel + Power BI refresh helper' -ForegroundColor Cyan
Write-Host ''

try {
    $response = Invoke-RestMethod -Uri $syncUrl -Method Get -TimeoutSec 60
    Write-Host 'Excel sync: OK' -ForegroundColor Green
    Write-Host ('  File: ' + $response.excel.file)
    Write-Host ('  Rows: ' + $response.excel.rowCount)
    Write-Host ('  Time: ' + $response.excel.syncedAt)
    Write-Host ''

    if ($response.powerBi.success -and -not $response.powerBi.skipped) {
        Write-Host 'Power BI online refresh: STARTED' -ForegroundColor Green
        Write-Host ('  ' + $response.powerBi.message)
    } else {
        Write-Host 'Power BI online refresh: MANUAL STEPS REQUIRED' -ForegroundColor Yellow
        Write-Host ('  ' + $response.powerBi.message)
    }
} catch {
    Write-Host 'Excel sync failed. Check Apache/MySQL and close the Excel file.' -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ''
Write-Host 'Next steps in Power BI Desktop:' -ForegroundColor Cyan
$step = 1
foreach ($line in @(
    'Open pbi/petfinderfinalpbi.pbix',
    'Home -> Refresh',
    'Save the file',
    'Home -> Publish -> My Workspace -> Replace existing report',
    'Power BI Service -> semantic model -> Refresh',
    'Refresh the PetFinder Analytics page in your browser'
)) {
    Write-Host ("  {0}. {1}" -f $step, $line)
    $step++
}

$pbix = Join-Path $root 'pbi\petfinderfinalpbi.pbix'
if (Test-Path $pbix) {
    $open = Read-Host 'Open petfinderfinalpbi.pbix now? (Y/N)'
    if ($open -eq 'Y' -or $open -eq 'y') {
        Start-Process $pbix
    }
}
