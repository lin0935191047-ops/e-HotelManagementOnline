# init.ps1 - PowerShell Initialization Script for Windows
$ErrorActionPreference = "Continue"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " e-Hotel Harness Environment Initialization (PowerShell)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 0. Ensure Deno bin in PATH if installed in user profile
$denoBin = "$HOME\.deno\bin"
if ((Test-Path $denoBin) -and ($env:PATH -notlike "*$denoBin*")) {
    $env:PATH = "$denoBin;$env:PATH"
}

# 1. Check runtime environment (Deno & Docker per ADR-001)
if (Get-Command deno -ErrorAction SilentlyContinue) {
    $denoVer = (deno --version | Select-Object -First 1)
    Write-Host "[OK] Deno version: $denoVer" -ForegroundColor Green
} else {
    Write-Host "[WARN] Deno is not found on PATH." -ForegroundColor Yellow
    Write-Host "       Install Deno 2: irm https://deno.land/install.ps1 | iex" -ForegroundColor Gray
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerVer = (docker --version)
    Write-Host "[OK] Docker version: $dockerVer" -ForegroundColor Green
} else {
    Write-Host "[INFO] Docker is not detected on PATH." -ForegroundColor Yellow
}

# 1.1 Check PostgreSQL local service
$pgService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue
if ($pgService -and ($pgService.Status -eq "Running")) {
    Write-Host "[OK] PostgreSQL local service is RUNNING: $($pgService.DisplayName)" -ForegroundColor Green
}

# 2. Check Backend Deno / Drizzle code if present
if (Test-Path "backend") {
    Write-Host "[INFO] Backend directory found. Verifying codebase..." -ForegroundColor Cyan
    if (Get-Command deno -ErrorAction SilentlyContinue) {
        if (Test-Path "backend/src/main.ts") {
            Write-Host "[RUN] Type check: deno check backend/src/main.ts" -ForegroundColor Gray
            deno check backend/src/main.ts
        }
        if (Test-Path "backend/tests") {
            Write-Host "[RUN] Unit tests: deno test backend/tests/" -ForegroundColor Gray
            deno test -A backend/tests/
        }
    }
} else {
    Write-Host "[INFO] No backend folder yet. Ready to start FEAT-01 (Deno 2 + Drizzle ORM)." -ForegroundColor Blue
}

# 3. Display progress from feature_list.json
if (Test-Path "feature_list.json") {
    Write-Host "----------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "Feature List Status:" -ForegroundColor Cyan
    $jsonContent = Get-Content "feature_list.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    $total = $jsonContent.features.Count
    $passed = ($jsonContent.features | Where-Object { $_.status -eq "done" -or $_.status -eq "passed" }).Count
    Write-Host "Progress: $passed / $total features completed.`n" -ForegroundColor White
    
    foreach ($f in $jsonContent.features) {
        $isDone = ($f.status -eq "done" -or $f.status -eq "passed")
        $tag = if ($isDone) { "[DONE]       " } elseif ($f.status -eq "in-progress") { "[IN-PROGRESS]" } else { "[TODO]       " }
        $color = if ($isDone) { "Green" } elseif ($f.status -eq "in-progress") { "Yellow" } else { "Gray" }
        $name = if ($f.name) { $f.name } else { $f.title }
        Write-Host "$tag [$($f.id)] - $name" -ForegroundColor $color
    }
    Write-Host "----------------------------------------------------" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Read AGENTS.md, docs/SPEC.md, docs/adr/ADR-001-tech-stack-decision.md and ARCHITECHTURE.md"
Write-Host "2. Read feature_list.json and progress.md to identify next feature"
Write-Host "3. Pick exactly one feature at a time"
Write-Host "4. Implement and verify via: deno check, deno lint, deno test"
Write-Host "5. Update session-handoff.md and progress.md before exiting."
