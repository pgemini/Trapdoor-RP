# Trapdoor - dev launcher (FastAPI backend + Next.js frontend).
$ErrorActionPreference = "Stop"
$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Web     = Join-Path $Root "web"

# --- locate a working Python ------------------------------------------------
function Test-PyCmd {
    param([string]$Exe, [string[]]$Pre)
    try {
        $callArgs = @()
        if ($Pre) { $callArgs += $Pre }
        $callArgs += "--version"
        & $Exe @callArgs *> $null
        return ($LASTEXITCODE -eq 0)
    } catch { return $false }
}

function Find-Python {
    $candidates = @(
        @{ Exe = "python";  Pre = @()        },
        @{ Exe = "python3"; Pre = @()        },
        @{ Exe = "py";      Pre = @("-3")    },
        @{ Exe = "py";      Pre = @()        }
    )
    foreach ($c in $candidates) {
        if (Get-Command $c.Exe -ErrorAction SilentlyContinue) {
            if (Test-PyCmd $c.Exe $c.Pre) {
                return $c
            }
        }
    }
    return $null
}

$PyInfo = Find-Python
if (-not $PyInfo) {
    Write-Host "Python not found on PATH." -ForegroundColor Red
    Write-Host "Install Python 3.10+ from https://www.python.org/ and try again." -ForegroundColor Yellow
    exit 1
}

$PyExe = $PyInfo.Exe
$PyPre = $PyInfo.Pre

# --- free up ports we need (kill any stuck previous run) -------------------
function Free-Port {
    param([int]$Port)
    $owners = @()
    try {
        $owners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
                  Select-Object -ExpandProperty OwningProcess -Unique
    } catch { }
    if (-not $owners) {
        # Fallback for older PowerShell without Get-NetTCPConnection
        $owners = (netstat -ano 2>$null | Select-String -Pattern "(?:^|\s):$Port\s.*LISTENING\s+(\d+)" |
                   ForEach-Object { $_.Matches[0].Groups[1].Value }) | Sort-Object -Unique
    }
    foreach ($ownerPid in $owners) {
        if (-not $ownerPid) { continue }
        try {
            Write-Host "[!] Killing stuck process PID $ownerPid on port $Port" -ForegroundColor Yellow
            Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
        } catch { }
    }
    if ($owners) { Start-Sleep -Milliseconds 600 }
}

Free-Port 8000
Free-Port 3000

# --- start backend ----------------------------------------------------------
Write-Host "[+] Backend: starting uvicorn on http://127.0.0.1:8000" -ForegroundColor Cyan

$backendCmd = @($PyExe) + $PyPre + @("-m","uvicorn","app.main:app","--host","127.0.0.1","--port","8000")
$backendJob = Start-Job -ScriptBlock {
    param($backendDir, $cmd)
    Set-Location $backendDir
    & $cmd[0] $cmd[1..($cmd.Length-1)]
} -ArgumentList $Backend, $backendCmd

Start-Sleep -Seconds 1

# --- start frontend (foreground) -------------------------------------------
Write-Host "[+] Frontend: starting Next.js on http://127.0.0.1:3000" -ForegroundColor Cyan
Set-Location $Web
try {
    npm run dev
} finally {
    Write-Host "[+] Shutting down backend..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -Force -ErrorAction SilentlyContinue
}
