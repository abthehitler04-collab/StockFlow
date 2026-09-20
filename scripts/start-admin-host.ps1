param(
    [int]$Port = 3000,
    [switch]$OpenFirewall,
    [switch]$OpenBrowser
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker Desktop is required. Install it, then run this script again.'
}

Push-Location $root
try {
    $env:STOCKFLOW_HOST_PORT = $Port
    docker compose up -d --build
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose failed to start the StockFlow admin host.' }
} finally {
    Pop-Location
}

if ($OpenFirewall) {
    New-NetFirewallRule -DisplayName 'StockFlow Admin Host' -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Domain,Private | Out-Null
}

$addresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress
Write-Host "StockFlow admin host is running on http://localhost:$Port/" -ForegroundColor Green
Write-Host "LAN API endpoint: http://<ADMIN-PC-IP>:$Port/api/index.php"
Write-Host "LAN web app: http://<ADMIN-PC-IP>:$Port/"
Write-Host "Detected admin-PC addresses: $($addresses -join ', ')"
Write-Host 'For global access, place this host behind HTTPS reverse proxy/VPN and forward only the HTTPS port.'

if ($OpenBrowser) { Start-Process "http://localhost:$Port/" }