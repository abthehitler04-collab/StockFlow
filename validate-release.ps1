# StockFlow Enterprise Windows Release Validation Script
$ErrorActionPreference = "Stop"
$ROOT = Get-Location

Write-Host "Verifying required release files..." -ForegroundColor Cyan

$required = @(
  "index.html",
  "sw.js",
  "version.json",
  "manifest.webmanifest",
  "config.json",
  ".htaccess",
  "robots.txt",
  "google-apps-script/Code.gs",
  "google-apps-script/README-BACKEND-SETUP.md",
  "api/index.php",
  "api/.htaccess",
  "storage/.htaccess",
  "storage/users.json",
  "storage/sessions.json",
  "badbin/index.html",
  "badbin/.htaccess",
  "badbin/manifest.webmanifest",
  "badbin/robots.txt",
  "badbin/assets/index-Final20260916.js",
  "badbin/assets/index-CktYb_0n.css",
  "badbin/assets/badbin-flow-atlas.webp",
  "badbin/assets/badbin-paper-grain.webp",
  "badbin/assets/badbin-route-mark.webp",
  "badbin/assets/badbin-route-texture.webp"
)

foreach ($file in $required) {
  $path = Join-Path $ROOT $file
  if (-not (Test-Path $path)) {
    Write-Error "Missing required file: $file"
    exit 1
  }
}
Write-Host "All $($required.Count) required files present." -ForegroundColor Green

Write-Host "Validating JavaScript and Apps Script syntax..." -ForegroundColor Cyan
node --check "sw.js"
node -e "new Function(require('fs').readFileSync('google-apps-script/Code.gs', 'utf8'))"
node --check "badbin/assets/index-Final20260916.js"
Write-Host "JavaScript and Google Apps Script syntax passed." -ForegroundColor Green

Write-Host "Validating JSON schemas..." -ForegroundColor Cyan
node -e "JSON.parse(require('fs').readFileSync('version.json'))"
node -e "JSON.parse(require('fs').readFileSync('manifest.webmanifest'))"
node -e "const cfg=JSON.parse(require('fs').readFileSync('config.json')); if (cfg.ENVIRONMENT !== 'production') throw new Error('config.json must be production'); console.log('Production config valid.')"
Write-Host "JSON files valid." -ForegroundColor Green

# Verify no legacy typos remain
$badbinJs = Get-Content "badbin/assets/index-Final20260916.js" -Raw
if ($badbinJs -match "Repared|IMIE|dissimilariteis|UNKNWN") {
  Write-Error "Known seed-data typo remains in BadBin asset"
  exit 1
}

Write-Host "Starting local test server..." -ForegroundColor Cyan
$serverJob = Start-Job -ScriptBlock {
  param($dir)
  Set-Location $dir
  python -m http.server 4175 --bind 127.0.0.1
} -ArgumentList $ROOT.Path

Start-Sleep -Seconds 2

try {
  $testPaths = @(
    "/",
    "/index.html",
    "/sw.js",
    "/version.json",
    "/manifest.webmanifest",
    "/badbin/",
    "/badbin/index.html",
    "/badbin/assets/index-Final20260916.js",
    "/badbin/assets/index-CktYb_0n.css"
  )

  foreach ($p in $testPaths) {
    $url = "http://127.0.0.1:4175$p"
    $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
    if ($res.StatusCode -ne 200) {
      Write-Error "HTTP test failed for $p with code $($res.StatusCode)"
      exit 1
    }
    Write-Host "  [OK 200] $p" -ForegroundColor DarkGray
  }
  Write-Host "Local HTTP smoke tests passed successfully." -ForegroundColor Green
} finally {
  Stop-Job $serverJob -ErrorAction SilentlyContinue
  Remove-Job $serverJob -Force -ErrorAction SilentlyContinue
}

Write-Host "Release validation successfully completed!" -ForegroundColor Green
