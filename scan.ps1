# Trapdoor — recursive folder scanner (Windows).
# Activates backend\.venv if present, then runs `python -m app.cli`.
# Keeps the caller's working directory so relative paths in argv work.
$ErrorActionPreference = "Stop"

$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Venv    = Join-Path $Backend ".venv\Scripts\Activate.ps1"
$Reqs    = Join-Path $Backend "requirements.txt"

if (Test-Path $Venv) {
    & $Venv
}

$env:PYTHONPATH = if ($env:PYTHONPATH) { "$Backend;$env:PYTHONPATH" } else { $Backend }

# Pre-flight: check the core deps are importable so we can fail with a
# clear message instead of a 14-line ModuleNotFoundError traceback.
$probe = & python -c "import pydantic" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  Trapdoor backend dependencies are not installed." -ForegroundColor Yellow
    Write-Host "  ----------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  Run this once from the repo root:" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "    cd backend"
    Write-Host "    python -m venv .venv"
    Write-Host "    .\.venv\Scripts\Activate.ps1"
    Write-Host "    pip install -r requirements.txt"
    Write-Host "    cd .."
    Write-Host "    .\scan.ps1 $args"
    Write-Host ""
    Write-Host "  Or install to your global Python:" -ForegroundColor DarkGray
    Write-Host "    pip install -r $Reqs"
    Write-Host ""
    exit 2
}

& python -m app.cli @args
exit $LASTEXITCODE
