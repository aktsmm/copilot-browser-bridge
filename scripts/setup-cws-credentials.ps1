param(
  [string]$ExtensionId = "nggfpdadfepkbpjfnpcihagbnnfpeian",
  [string]$ClientId,
  [string]$ClientSecret,
  [string]$RefreshToken,
  [ValidateSet("default", "trustedTesters")]
  [string]$PublishTarget = "default",
  [switch]$OpenBrowser,
  [switch]$SaveUserEnv
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ClientId)) {
  throw "ClientId is required. Pass -ClientId or use npm run cws:setup and enter it interactively."
}

if ([string]::IsNullOrWhiteSpace($ClientSecret)) {
  throw "ClientSecret is required. Pass -ClientSecret or use npm run cws:setup and enter it interactively."
}

if ([string]::IsNullOrWhiteSpace($RefreshToken)) {
  $scope = [uri]::EscapeDataString("https://www.googleapis.com/auth/chromewebstore")
  $escapedClientId = [uri]::EscapeDataString($ClientId)
  $redirectUri = [uri]::EscapeDataString("urn:ietf:wg:oauth:2.0:oob")
  $authUrl = "https://accounts.google.com/o/oauth2/auth?response_type=code&scope=$scope&client_id=$escapedClientId&redirect_uri=$redirectUri"

  Write-Host "Open this URL, login, grant access, and paste the auth code:" -ForegroundColor Cyan
  Write-Host $authUrl -ForegroundColor Yellow

  if ($OpenBrowser) {
    Start-Process $authUrl | Out-Null
  }

  $authCode = Read-Host "Auth code"
  if ([string]::IsNullOrWhiteSpace($authCode)) {
    throw "Auth code is required to generate refresh token."
  }

  $tokenResponse = Invoke-RestMethod `
    -Uri "https://accounts.google.com/o/oauth2/token" `
    -Method Post `
    -Body @{
      client_id = $ClientId
      client_secret = $ClientSecret
      code = $authCode
      grant_type = "authorization_code"
      redirect_uri = "urn:ietf:wg:oauth:2.0:oob"
    }

  $RefreshToken = $tokenResponse.refresh_token
  if ([string]::IsNullOrWhiteSpace($RefreshToken)) {
    throw "Refresh token was not returned. Verify OAuth client settings and retry."
  }
}

$envPath = Join-Path $PSScriptRoot "..\.env.submit"
$envPath = [System.IO.Path]::GetFullPath($envPath)

$content = @(
  "CHROME_EXTENSION_ID=$ExtensionId"
  "CHROME_CLIENT_ID=$ClientId"
  "CHROME_CLIENT_SECRET=$ClientSecret"
  "CHROME_REFRESH_TOKEN=$RefreshToken"
  "CHROME_PUBLISH_TARGET=$PublishTarget"
) -join "`n"

Set-Content -Path $envPath -Value $content -Encoding utf8
Write-Host "Saved Chrome Web Store credentials to: $envPath" -ForegroundColor Green

if ($SaveUserEnv) {
  setx CHROME_EXTENSION_ID $ExtensionId | Out-Null
  setx CHROME_CLIENT_ID $ClientId | Out-Null
  setx CHROME_CLIENT_SECRET $ClientSecret | Out-Null
  setx CHROME_REFRESH_TOKEN $RefreshToken | Out-Null
  setx CHROME_PUBLISH_TARGET $PublishTarget | Out-Null
  Write-Host "Saved credentials to user environment variables as well." -ForegroundColor Green
}
