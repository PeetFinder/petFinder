#Requires -Version 5.1
<#
.SYNOPSIS
  Installs MySQL Connector/NET (x64) required by Power BI Desktop MySQL connector.

.DESCRIPTION
  Power BI shows "This connector requires one or more additional components..."
  when Oracle MySQL Connector/NET 8.0.x (64-bit) is missing or not registered in .NET.

  Run this script as Administrator:
    Right-click PowerShell -> Run as administrator
    cd C:\xampp\htdocs\PetFinder\pbi
    .\install-mysql-connector.ps1
#>

$ErrorActionPreference = 'Stop'

function Test-MySqlProviderRegistered {
    try {
        $factories = [System.Data.Common.DbProviderFactories]::GetFactoryClasses()
        return [bool]($factories | Where-Object { $_.InvariantName -eq 'MySql.Data.MySqlClient' })
    } catch {
        return $false
    }
}

function Show-ProviderStatus {
    Write-Host ''
    Write-Host 'Registered .NET data providers:' -ForegroundColor Cyan
    [System.Data.Common.DbProviderFactories]::GetFactoryClasses() |
        Format-Table Name, InvariantName -AutoSize
    Write-Host ''
    if (Test-MySqlProviderRegistered) {
        Write-Host 'MySQL Data Provider: INSTALLED' -ForegroundColor Green
        return $true
    }
    Write-Host 'MySQL Data Provider: NOT FOUND' -ForegroundColor Red
    return $false
}

Write-Host 'PetFinder - MySQL Connector/NET installer for Power BI' -ForegroundColor Cyan
Write-Host '======================================================' -ForegroundColor Cyan

if (Show-ProviderStatus) {
    Write-Host 'Power BI MySQL connector should work. Close and reopen Power BI Desktop, then try Get Data -> MySQL database.' -ForegroundColor Green
    exit 0
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
    Write-Host ''
    Write-Host 'Administrator rights are required to install the driver.' -ForegroundColor Yellow
    Write-Host 'Right-click PowerShell -> Run as administrator, then run this script again.' -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'Manual install (if you prefer):' -ForegroundColor Cyan
    Write-Host '  1. Open https://dev.mysql.com/downloads/connector/net/'
    Write-Host '  2. Download MySQL Connector/NET 8.0.36 — Windows (x86, 64-bit), MSI Installer'
    Write-Host '  3. Run the MSI -> choose Typical install'
    Write-Host '  4. Restart PC (or at least close Power BI Desktop completely)'
    Write-Host '  5. Run this script again to verify'
    Write-Host ''
    Write-Host 'Important: Do NOT use Connector/NET 9.x — Power BI does not detect it.' -ForegroundColor Yellow
    Start-Process 'https://dev.mysql.com/downloads/connector/net/'
    exit 1
}

Write-Host ''
Write-Host 'Attempting install via Chocolatey (mysql-connector 8.0.31)...' -ForegroundColor Cyan

if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host 'Chocolatey not found. Install manually from the link that will open.' -ForegroundColor Yellow
    Start-Process 'https://dev.mysql.com/downloads/connector/net/'
    exit 1
}

choco install mysql-connector -y --version=8.0.31

Write-Host ''
if (Show-ProviderStatus) {
    Write-Host 'Install complete. Restart Power BI Desktop, then connect with:' -ForegroundColor Green
    Write-Host '  Server: 127.0.0.1:3308'
    Write-Host '  Database: petfinder_db'
    Write-Host '  Tables: users, species, breeds, pet_reports, sighting_feed' -ForegroundColor Green
    exit 0
}

Write-Host 'Driver installed but provider still not registered.' -ForegroundColor Yellow
Write-Host 'Try: restart PC, then run this script again.' -ForegroundColor Yellow
Write-Host 'If still failing, install MySQL Connector/NET 8.0.36 MSI manually from:' -ForegroundColor Yellow
Write-Host '  https://dev.mysql.com/downloads/connector/net/' -ForegroundColor Yellow
exit 1
