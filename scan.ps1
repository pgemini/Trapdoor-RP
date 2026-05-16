# Trapdoor — recursive folder scanner (Windows).
# Activates backend\.venv if present, then runs `python -m app.cli`.
# Keeps the caller's working directory so relative paths in argv work.
$ErrorActionPreference = "Stop"

$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Venv    = Join-Path $Backend ".venv\Scripts\Activate.ps1"

if (Test-Path $Venv) {
    & $Venv
}

$env:PYTHONPATH = if ($env:PYTHONPATH) { "$Backend;$env:PYTHONPATH" } else { $Backend }
& python -m app.cli @args
exit $LASTEXITCODE
