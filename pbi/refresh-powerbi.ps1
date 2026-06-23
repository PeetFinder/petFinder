# Check MySQL 3NF tables + Power BI refresh helper.
$root = Split-Path -Parent $PSScriptRoot
$syncUrl = 'http://localhost/petfinder/api/pbi/sync.php'
$connUrl = 'http://localhost/petfinder/api/pbi/connection.php'

Write-Host 'PetFinder - MySQL 3NF + Power BI helper' -ForegroundColor Cyan
Write-Host ''

try {
    $response = Invoke-RestMethod -Uri $syncUrl -Method Get -TimeoutSec 60
    if ($response.source -eq 'mysql') {
        Write-Host 'MySQL 3NF: OK' -ForegroundColor Green
        $model = if ($response.model) { $response.model } else { '3nf' }
        Write-Host ('  Model: ' + $model)
        Write-Host ('  Database: ' + $response.database.database)
        Write-Host ('  Reports: ' + $response.database.rowCount)
        if ($response.database.tableCounts) {
            $response.database.tableCounts.PSObject.Properties | ForEach-Object {
                Write-Host ('    ' + $_.Name + ': ' + $_.Value)
            }
        }
    }
    Write-Host ''
    if ($response.powerBi.success -and -not $response.powerBi.skipped) {
        Write-Host 'Power BI online refresh: STARTED' -ForegroundColor Green
    }
} catch {
    Write-Host 'Database check failed. Check Apache/MySQL in XAMPP.' -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ''
Write-Host 'Power BI Desktop (3NF model):' -ForegroundColor Cyan
$step = 1
foreach ($line in @(
    'Run database/PBI_3NF_SETUP.sql in phpMyAdmin (drops flat views)',
    'Get Data -> MySQL -> 127.0.0.1:3308 -> petfinder_db',
    'Load: users, species, breeds, pet_reports, sighting_feed',
    'Model: species 1-* breeds 1-* pet_reports; users 1-* pet_reports; pet_reports 1-* sighting_feed',
    'Remove pbi_pet_data, Excel, Summary from report',
    'Home -> Refresh after website reports'
)) {
    Write-Host ("  {0}. {1}" -f $step, $line)
    $step++
}
