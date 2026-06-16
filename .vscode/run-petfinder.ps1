$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$htdocs = 'C:\xampp\htdocs\petfinder'
$url = 'http://localhost/petfinder/landing.html'
$healthUrl = 'http://localhost/petfinder/api/health.php'

Write-Host ''
Write-Host 'PetFinder - Starting via XAMPP URL...' -ForegroundColor Cyan
Write-Host ''

Write-Host '1/3 Syncing files to htdocs...'
& robocopy $projectRoot $htdocs /MIR /XD .git node_modules .vscode /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -gt 7) {
    Write-Host 'Sync failed. Check folder permissions.' -ForegroundColor Red
    exit 1
}
Write-Host '    Done.'

Write-Host '2/3 Checking Apache + MySQL...'
try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 8
    if ($response.Content -notmatch '"backend"\s*:\s*true') {
        throw 'Database not connected.'
    }
    Write-Host '    OK - MySQL connected.'
} catch {
    Write-Host ''
    Write-Host 'ERROR: Hindi tumatakbo ang XAMPP.' -ForegroundColor Red
    Write-Host '  - Buksan ang XAMPP Control Panel' -ForegroundColor Yellow
    Write-Host '  - I-click Start sa Apache at MySQL' -ForegroundColor Yellow
    Write-Host '  - Subukan ulit (F5 o Ctrl+Shift+B)' -ForegroundColor Yellow
    Write-Host ''
    exit 1
}

Write-Host '3/3 Opening website...'
$encoded = [uri]::EscapeDataString([uri]::UnescapeDataString($url))

function Open-SimpleBrowser {
    param([string]$Scheme)
    $target = "${Scheme}://vscode.simple-browser/show?url=$encoded"
    Start-Process $target
}

$opened = $false
foreach ($scheme in @('cursor', 'vscode')) {
    try {
        Open-SimpleBrowser -Scheme $scheme
        $opened = $true
        break
    } catch {
        continue
    }
}

if (-not $opened) {
    Start-Process $url
}

Write-Host ''
Write-Host "Site URL: $url" -ForegroundColor Green
Write-Host ''
