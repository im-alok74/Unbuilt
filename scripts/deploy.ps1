# Unbuilt — one-shot Vercel deploy.
#
#   1. npx vercel login          (once — opens a browser)
#   2. ./scripts/deploy.ps1
#
# Reads the vars in .env.local, pushes them to the Vercel project's
# Production environment, then deploys to production.

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path ".env.local")) { throw ".env.local not found" }

# Parse .env.local
$vars = @{}
foreach ($line in Get-Content ".env.local") {
  if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
    $vars[$Matches[1]] = $Matches[2].Trim('"').Trim("'")
  }
}

$push = @("DATABASE_URL", "ENCRYPTION_KEY", "AUTH_SECRET", "APP_PIN", "NEXT_PUBLIC_MAPBOX_TOKEN", "GOOGLE_PLACES_API_KEY", "GEMINI_API_KEY")

Write-Host "Linking project 'unbuilt'..." -ForegroundColor Cyan
npx vercel link --yes --project unbuilt | Out-Host

foreach ($k in $push) {
  $v = $vars[$k]
  if ([string]::IsNullOrWhiteSpace($v)) { Write-Host "skip $k (empty)" -ForegroundColor DarkGray; continue }
  foreach ($env in @("production", "preview", "development")) {
    # remove then add so re-runs don't error
    npx vercel env rm $k $env --yes 2>$null | Out-Null
    $v | npx vercel env add $k $env | Out-Null
  }
  Write-Host "set $k" -ForegroundColor Green
}

Write-Host "Deploying to production..." -ForegroundColor Cyan
npx vercel deploy --prod --yes | Out-Host
Write-Host "`nDone. Set NEXT_PUBLIC_MAPBOX_TOKEN + your Places/Gemini keys in the You tab (or re-run after adding them to .env.local)." -ForegroundColor Yellow
