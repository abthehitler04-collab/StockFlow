param(
    [string]$KeystorePassword = "stockflow123",
    [string]$KeyPassword = "stockflow123",
    [string]$KeyAlias = "upload"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $repoRoot "apps/android"
$androidGradleRoot = Join-Path $androidRoot "android"
$keystorePath = Join-Path $androidGradleRoot "app/upload-keystore.jks"
$keyPropertiesPath = Join-Path $androidGradleRoot "key.properties"

if (-not (Test-Path $androidRoot)) {
    throw "Flutter Android project not found at $androidRoot"
}

if (-not (Test-Path $keystorePath)) {
    $keystoreDir = Split-Path -Parent $keystorePath
    if (-not (Test-Path $keystoreDir)) {
        New-Item -ItemType Directory -Force -Path $keystoreDir | Out-Null
    }

    & keytool -genkeypair -v `
        -keystore $keystorePath `
        -alias $KeyAlias `
        -keyalg RSA `
        -keysize 2048 `
        -validity 10000 `
        -storepass $KeystorePassword `
        -keypass $KeyPassword `
        -dname "CN=StockFlow Local Release, OU=Mobile, O=StockFlow, L=Local, ST=State, C=US"
    if ($LASTEXITCODE -ne 0) {
        throw 'keytool failed while creating the Android release keystore.'
    }
}

@"
storePassword=$KeystorePassword
keyPassword=$KeyPassword
keyAlias=$KeyAlias
storeFile=app/upload-keystore.jks
"@ | Set-Content -Path $keyPropertiesPath

Set-Location $androidRoot
flutter clean
flutter pub get
flutter build apk --release
flutter build appbundle --release

Write-Host "Release build completed successfully."
Write-Host "APK: $androidRoot/build/app/outputs/flutter-apk/app-release.apk"
Write-Host "AAB: $androidRoot/build/app/outputs/bundle/release/app-release.aab"
