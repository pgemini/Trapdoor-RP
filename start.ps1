# Trapdoor - one-command bootstrap (Windows / PowerShell)
$ErrorActionPreference = "Stop"

$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Venv    = Join-Path $Backend ".venv"

function Test-PyCmd {
    param([string[]]$Cmd)
    try {
        $args = @()
        if ($Cmd.Length -gt 1) { $args = $Cmd[1..($Cmd.Length - 1)] }
        $args += "--version"
        $out = & $Cmd[0] @args 2>&1
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Get-Python {
    $candidates = @(
        @("python"),
        @("python3"),
        @("py","-3"),
        @("py")
    )
    foreach ($c in $candidates) {
        if ((Get-Command $c[0] -ErrorAction SilentlyContinue) -and (Test-PyCmd $c)) {
            return ,$c
        }
    }
    throw "Could not find a working Python. Install Python 3.10+ from https://www.python.org/"
}

$PyCmd  = Get-Python
$VenvPy = Join-Path $Venv "Scripts\python.exe"

function Test-VenvOk {
    if (-not (Test-Path $VenvPy)) { return $false }
    try { & $VenvPy --version 2>&1 | Out-Null; return ($LASTEXITCODE -eq 0) } catch { return $false }
}

# --- venv -------------------------------------------------------------------
if (-not (Test-VenvOk)) {
    if (Test-Path $Venv) {
        Write-Host "[!] Stale venv at $Venv - removing" -ForegroundColor Yellow
        Remove-Item -Recurse -Force $Venv -ErrorAction SilentlyContinue
    }
    Write-Host "[+] Creating venv at $Venv" -ForegroundColor Cyan
    if ($PyCmd.Length -gt 1) {
        & $PyCmd[0] $PyCmd[1] -m venv $Venv
    } else {
        & $PyCmd[0] -m venv $Venv
    }
}

if (Test-VenvOk) {
    $PYTHON = $VenvPy
    Write-Host "[+] Using venv Python: $PYTHON" -ForegroundColor Cyan
} else {
    Write-Host "[!] Could not create a working venv - using system Python" -ForegroundColor Yellow
    $PYTHON = $PyCmd[0]
}

# --- deps -------------------------------------------------------------------
Write-Host "[+] Installing dependencies..." -ForegroundColor Cyan
& $PYTHON -m pip install --upgrade pip --quiet
& $PYTHON -m pip install --quiet -r (Join-Path $Backend "requirements.txt")

# --- .env hint --------------------------------------------------------------
if (-not (Test-Path (Join-Path $Backend ".env"))) {
    Write-Host "[i] No .env found - running in heuristic-only mode." -ForegroundColor Yellow
    Write-Host "    Copy backend\.env.example to backend\.env to enable AI Foundry." -ForegroundColor Yellow
}

# --- run --------------------------------------------------------------------
$HostBind = if ($env:TRAPDOOR_HOST) { $env:TRAPDOOR_HOST } else { "127.0.0.1" }
$Port     = if ($env:TRAPDOOR_PORT) { $env:TRAPDOOR_PORT } else { "8000" }

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Write-Host ("  Trapdoor running at http://{0}:{1}"           -f $HostBind, $Port) -ForegroundColor Green
Write-Host ("  - UI:         http://{0}:{1}/"                -f $HostBind, $Port) -ForegroundColor Green
Write-Host ("  - API health: http://{0}:{1}/api/healthz"     -f $HostBind, $Port) -ForegroundColor Green
Write-Host ("  - API docs:   http://{0}:{1}/docs"            -f $HostBind, $Port) -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
Write-Host ""

Set-Location $Backend
& $PYTHON -m uvicorn app.main:app --host $HostBind --port $Port --reload
