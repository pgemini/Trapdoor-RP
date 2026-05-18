# =====================================================================
# Trapdoor backend — one-shot Azure App Service configuration.
#
# Run AFTER `az login`. Sets app settings, startup command, and restarts
# the app. Secrets are read with -AsSecureString so they never appear
# in your PowerShell history.
#
# Usage:
#   az login
#   az account set --subscription "<your subscription name or id>"
#   .\backend\configure-azure.ps1 -ResourceGroup <rg> -AppName trapdoor-api-pg
# =====================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $ResourceGroup,
    [Parameter(Mandatory = $true)] [string] $AppName,
    [string] $OpenAIDeployment   = "gpt-4o-mini",
    [string] $OpenAIApiVersion   = "2024-12-01-preview",
    [string] $WhisperDeployment  = "",
    [switch] $Restart
)

$ErrorActionPreference = "Stop"

function Read-Secret($label) {
    $sec = Read-Host -AsSecureString "$label (leave blank to skip)"
    [System.Net.NetworkCredential]::new("", $sec).Password
}

# --- 1. Prompt for the bits that should never be in a script -----
Write-Host "`nEnter values (press Enter to skip any):" -ForegroundColor Cyan

$endpoint  = Read-Host    "AZURE_OPENAI_ENDPOINT (full URL, e.g. https://carerelay-1-resource.services.ai.azure.com/api/projects/carerelay-1/openai/v1/responses)"
$apiKey    = Read-Secret  "AZURE_OPENAI_API_KEY"
$realtime  = Read-Host    "AZURE_REALTIME_ENDPOINT (resource root, e.g. https://carerelay-1-resource.services.ai.azure.com — blank to skip)"
$openaiKey = Read-Secret  "OPENAI_API_KEY (only if NOT using Azure Whisper)"

# --- 2. Build the settings list ---------------------------------
$settings = @(
    "SCM_DO_BUILD_DURING_DEPLOYMENT=1",
    "WEBSITES_PORT=8000",
    "TRAPDOOR_HOST=0.0.0.0",
    "TRAPDOOR_PORT=8000",
    "TRAPDOOR_MAX_UPLOAD_MB=25",
    "TRAPDOOR_TRANSCRIBE_MAX_MB=24",
    "AZURE_OPENAI_DEPLOYMENT=$OpenAIDeployment",
    "AZURE_OPENAI_API_VERSION=$OpenAIApiVersion"
)
if ($endpoint)         { $settings += "AZURE_OPENAI_ENDPOINT=$endpoint" }
if ($apiKey)           { $settings += "AZURE_OPENAI_API_KEY=$apiKey" }
if ($realtime)         { $settings += "AZURE_REALTIME_ENDPOINT=$realtime" }
if ($WhisperDeployment){ $settings += "AZURE_WHISPER_DEPLOYMENT=$WhisperDeployment" }
if ($openaiKey)        { $settings += "OPENAI_API_KEY=$openaiKey" }

Write-Host "`n[1/3] Applying $($settings.Count) app settings..." -ForegroundColor Cyan
az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $AppName `
    --settings $settings `
    --output none

# --- 3. Startup command ----------------------------------------
$startup = "gunicorn -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 app.main:app"
Write-Host "[2/3] Setting startup command..." -ForegroundColor Cyan
az webapp config set `
    --resource-group $ResourceGroup `
    --name $AppName `
    --startup-file $startup `
    --output none

# --- 4. Restart ------------------------------------------------
if ($Restart) {
    Write-Host "[3/3] Restarting the Web App..." -ForegroundColor Cyan
    az webapp restart --resource-group $ResourceGroup --name $AppName --output none
} else {
    Write-Host "[3/3] Skipping restart (pass -Restart to enable)." -ForegroundColor DarkGray
}

# --- 5. Scrub secrets from this session ------------------------
Remove-Variable apiKey, openaiKey -ErrorAction SilentlyContinue

# --- 6. Verify -------------------------------------------------
Write-Host "`nDone. Verifying with /api/healthz (may take 20-40s on cold start)..." -ForegroundColor Green
$health = "https://$AppName.azurewebsites.net/api/healthz"
try {
    $resp = Invoke-RestMethod -Uri $health -Method GET -TimeoutSec 60
    $resp | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Health check failed (cold start? check logs with: az webapp log tail -g $ResourceGroup -n $AppName)" -ForegroundColor Yellow
}
