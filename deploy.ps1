[Diagnostics.CodeAnalysis.SuppressMessageAttribute(
  'PSAvoidUsingPlainTextForPassword',
  '',
  Justification = 'FTP secret is accepted as SecureString or converted from an environment secret for unattended deployment.'
)]
[CmdletBinding(SupportsShouldProcess)]
param(
  [string]$FtpHost = $(if ($env:INFINITYFREE_FTP_HOST) { $env:INFINITYFREE_FTP_HOST } else { 'ftpupload.net' }),
  [string]$FtpUser = $(if ($env:INFINITYFREE_FTP_USER) { $env:INFINITYFREE_FTP_USER } else { 'if0_42816037' }),
  [System.Security.SecureString]$FtpSecret,
  [string]$FtpDirectory = $(if ($env:INFINITYFREE_FTP_DIR) { $env:INFINITYFREE_FTP_DIR } else { '/amaya.10001mb.com/htdocs' }),
  [string]$SiteUrl = $env:INFINITYFREE_SITE_URL
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

if (-not $PSCmdlet.ShouldProcess($FtpDirectory, 'Validate and upload the StockFlow release')) {
  exit 0
}

if ($null -eq $FtpSecret) {
  $environmentSecret = $env:INFINITYFREE_FTP_PASS
  if ([string]::IsNullOrWhiteSpace($environmentSecret)) {
    $FtpSecret = Read-Host 'FTP password' -AsSecureString
  } else {
    $FtpSecret = ConvertTo-SecureString $environmentSecret -AsPlainText -Force
    $environmentSecret = $null
  }
}

if ([string]::IsNullOrWhiteSpace($FtpHost) -or [string]::IsNullOrWhiteSpace($FtpUser)) {
  throw 'FTP host and username are required.'
}

Write-Host 'Validating release package...' -ForegroundColor Cyan
& (Join-Path $root 'validate-release.ps1')
if ($LASTEXITCODE -ne 0) {
  throw 'Release validation failed; deployment stopped.'
}

$releaseFiles = @(
  'index.html', 'sw.js', 'version.json', 'manifest.webmanifest', 'config.json', '.htaccess', 'robots.txt',
  'google-apps-script/Code.gs', 'google-apps-script/README-BACKEND-SETUP.md',
  'api/index.php', 'api/.htaccess', 'storage/.htaccess', 'storage/users.json', 'storage/sessions.json',
  'badbin/index.html', 'badbin/.htaccess', 'badbin/manifest.webmanifest', 'badbin/robots.txt',
  'badbin/assets/index-Final20260916.js', 'badbin/assets/index-CktYb_0n.css',
  'badbin/assets/badbin-flow-atlas.webp', 'badbin/assets/badbin-paper-grain.webp',
  'badbin/assets/badbin-route-mark.webp', 'badbin/assets/badbin-route-texture.webp'
)

$credential = [System.Management.Automation.PSCredential]::new($FtpUser, $FtpSecret).GetNetworkCredential()
$base = 'ftp://' + $FtpHost.TrimEnd('/') + '/' + $FtpDirectory.Trim('/') + '/'
$createdDirectories = @{}

function Invoke-FtpRequest {
  param([string]$Uri, [string]$Method, [byte[]]$Bytes)

  $request = [System.Net.FtpWebRequest]::Create($Uri)
  $request.Method = $Method
  $request.Credentials = $credential
  $request.UsePassive = $true
  $request.EnableSsl = $false
  $request.KeepAlive = $false

  try {
    if ($null -ne $Bytes) {
      $request.ContentLength = $Bytes.Length
      try { $stream = $request.GetRequestStream() }
      catch [System.Net.WebException] {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq [System.Net.FtpStatusCode]::NotLoggedIn) {
          throw "FTP authentication failed for '$FtpUser' at '$FtpHost'. Verify the FTP username and password."
        }
        throw
      }
      try { $stream.Write($Bytes, 0, $Bytes.Length) } finally { $stream.Dispose() }
    }
    $response = $request.GetResponse()
    $response.Dispose()
  } catch [System.Net.WebException] {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq [System.Net.FtpStatusCode]::NotLoggedIn) {
      throw "FTP authentication failed for '$FtpUser' at '$FtpHost'. Verify the FTP username and password."
    }
    throw
  }
}

foreach ($relativePath in $releaseFiles) {
  $segments = $relativePath -split '/'
  if ($segments.Count -gt 1) {
    $directory = ''
    for ($index = 0; $index -lt ($segments.Count - 1); $index++) {
      $directory = if ($directory) { "$directory/$($segments[$index])" } else { $segments[$index] }
      if (-not $createdDirectories.ContainsKey($directory)) {
        try { Invoke-FtpRequest -Uri ($base + $directory + '/') -Method ([System.Net.WebRequestMethods+Ftp]::MakeDirectory) }
        catch [System.Net.WebException] {
          $status = if ($_.Exception.Response) { $_.Exception.Response.StatusCode } else { $null }
          if ($status -notin @(
              [System.Net.FtpStatusCode]::ActionNotTakenFileUnavailable,
              [System.Net.FtpStatusCode]::FileActionNotTaken
            )) { throw }
        }
        $createdDirectories[$directory] = $true
      }
    }
  }

  $localPath = Join-Path $root ($relativePath -replace '/', '\')
  if (-not (Test-Path $localPath -PathType Leaf)) { throw "Missing release file: $relativePath" }
  Invoke-FtpRequest -Uri ($base + $relativePath) -Method ([System.Net.WebRequestMethods+Ftp]::UploadFile) -Bytes ([System.IO.File]::ReadAllBytes($localPath))
  Write-Host "Uploaded $relativePath" -ForegroundColor DarkGray
}

Write-Host "Deployment complete: $($releaseFiles.Count) release files uploaded." -ForegroundColor Green

if (-not [string]::IsNullOrWhiteSpace($SiteUrl)) {
  try {
    $response = Invoke-WebRequest -Uri ($SiteUrl.TrimEnd('/') + '/') -UseBasicParsing -TimeoutSec 20
    Write-Host "Smoke test: HTTP $($response.StatusCode)" -ForegroundColor Green
  } catch {
    Write-Warning "Public smoke test failed: $($_.Exception.Message)"
  }
}
