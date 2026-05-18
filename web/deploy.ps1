# Trapdoor web — build + deploy to Azure Static Web Apps.
#
# Reads configuration from web/.env.local (which is gitignored). The file
# must define at least AZURE_SWA_DEPLOY_TOKEN. Optional values:
#   NEXT_PUBLIC_API_BASE  — Render backend URL
#   TRAPDOOR_STATIC_EXPORT (default: 1)
#   SWA_ENV               (default: production)
#
# Usage:
#   cd web
#   .\deploy.ps1
#
# Or, if you'd rather pass the token on the command line (still won't be
# committed, but will land in PowerShell history):
#   .\deploy.ps1 -Token "<deployment-token>"
[CmdletBinding()]
param(
    [string]$Token,
    [string]$ApiBase,
    [string]$Env = "production",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$Here    = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $Here ".env.local"
$OutDir  = Join-Path $Here "out"

# --- 1. Load .env.local if present --------------------------
$envVars = @{}
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $kv = $line -split "=", 2
        if ($kv.Count -eq 2) {
            $envVars[$kv[0].Trim()] = $kv[1].Trim().Trim('"')
        }
    }
}

# --- 2. Resolve token + API base ----------------------------
if (-not $Token)   { $Token   = $envVars["AZURE_SWA_DEPLOY_TOKEN"] }
if (-not $ApiBase) { $ApiBase = $envVars["NEXT_PUBLIC_API_BASE"]    }

if (-not $Token) {
    Write-Host ""
    Write-Host "  Missing deployment token." -ForegroundColor Yellow
    Write-Host "  --------------------------" -ForegroundColor DarkGray
    Write-Host "  Either:"
    Write-Host "    a) Copy web\.env.local.example to web\.env.local"
    Write-Host "       and set AZURE_SWA_DEPLOY_TOKEN there, or"
    Write-Host "    b) Pass it on the command line:"
    Write-Host "         .\deploy.ps1 -Token '<token>'"
    Write-Host ""
    Write-Host "  Get the token from the Azure portal:"
    Write-Host "    Static Web Apps -> <your SWA> -> Manage deployment token"
    Write-Host ""
    exit 2
}

# --- 3. Build (unless skipped) ------------------------------
if (-not $SkipBuild) {
    Write-Host "[1/2] Building static export..." -ForegroundColor Cyan
    Push-Location $Here
    try {
        $env:TRAPDOOR_STATIC_EXPORT = "1"
        if ($ApiBase) { $env:NEXT_PUBLIC_API_BASE = $ApiBase }
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed (exit $LASTEXITCODE)."
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[1/2] -SkipBuild set, using existing $OutDir" -ForegroundColor DarkGray
}

if (-not (Test-Path $OutDir)) {
    throw "Build output not found at $OutDir. Run without -SkipBuild."
}

# --- 4. Deploy ----------------------------------------------
Write-Host "[2/2] Deploying to Azure Static Web Apps (env=$Env)..." -ForegroundColor Cyan
& npx --yes @azure/static-web-apps-cli deploy $OutDir --env $Env --deployment-token $Token
$code = $LASTEXITCODE

# Scrub the token from this process's env so it isn't visible to children.
Remove-Variable Token -ErrorAction SilentlyContinue

if ($code -ne 0) {
    Write-Host ""
    Write-Host "  Deploy failed (exit $code)." -ForegroundColor Red
    Write-Host "  If the token is rejected, rotate it in the Azure portal and update .env.local."
    exit $code
}

Write-Host ""
Write-Host "  Done. Hard-reload the SWA URL to see the new build." -ForegroundColor Green
