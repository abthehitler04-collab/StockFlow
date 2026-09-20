param(
    [string]$ApiUrl = $env:STOCKFLOW_API_URL,
    [string]$CommitMessage = 'Automate native setup and release packaging',
    [switch]$SkipPush,
    [switch]$SkipWindowsBuild
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

function Invoke-Step {
    param([string]$WorkingDirectory, [string]$Command, [string]$Label)

    Write-Host "`n== $Label ==" -ForegroundColor Cyan
    Push-Location $WorkingDirectory
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0) {
            throw "Step failed with exit code ${LASTEXITCODE}: $Label"
        }
    } finally {
        Pop-Location
    }
}

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
    throw 'Flutter is not installed or is not available on PATH.'
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git is not installed or is not available on PATH.'
}

Invoke-Step $repoRoot 'npm install' 'Install repository dependencies'
Invoke-Step $repoRoot 'npm test' 'Run repository tests'
Invoke-Step $repoRoot 'npm run validate' 'Validate JavaScript and Apps Script syntax'
Invoke-Step (Join-Path $repoRoot 'apps/android') 'flutter pub get' 'Install Android dependencies'
Invoke-Step (Join-Path $repoRoot 'apps/android') 'flutter analyze' 'Analyze Android app'
Invoke-Step (Join-Path $repoRoot 'apps/android') 'flutter test' 'Run Android tests'

$buildArgs = if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
    ''
} else {
    " --dart-define=STOCKFLOW_API_URL=`"$ApiUrl`""
}

Invoke-Step (Join-Path $repoRoot 'apps/android') "flutter build apk --release$buildArgs" 'Build signed Android APK'
Invoke-Step (Join-Path $repoRoot 'apps/android') "flutter build appbundle --release$buildArgs" 'Build Android App Bundle'

if (-not $SkipWindowsBuild) {
    Invoke-Step (Join-Path $repoRoot 'apps/windows') 'flutter pub get' 'Install Windows dependencies'
    Invoke-Step (Join-Path $repoRoot 'apps/windows') 'flutter analyze' 'Analyze Windows app'
    Invoke-Step (Join-Path $repoRoot 'apps/windows') 'flutter test' 'Run Windows tests'
    Invoke-Step (Join-Path $repoRoot 'apps/windows') 'flutter build windows --debug' 'Build Windows desktop app'
}

Push-Location $repoRoot
try {
    git add .
    if (-not (git diff --cached --quiet)) {
        git commit -m $CommitMessage
        if ($LASTEXITCODE -ne 0) {
            throw 'Git commit failed.'
        }
    } else {
        Write-Host 'No new Git changes to commit.' -ForegroundColor Yellow
    }

    if (-not $SkipPush) {
        git push origin main
        if ($LASTEXITCODE -ne 0) {
            throw 'Git push failed. Verify GitHub authentication and repository permissions.'
        }
    }
} finally {
    Pop-Location
}

Write-Host "`nRelease automation completed." -ForegroundColor Green
Write-Host "APK: apps/android/build/app/outputs/flutter-apk/app-release.apk"
Write-Host "AAB: apps/android/build/app/outputs/bundle/release/app-release.aab"
if (-not $SkipWindowsBuild) {
    Write-Host "Windows: apps/windows/build/windows/x64/runner/Debug/stockflow_windows.exe"
}