# init.ps1 - PowerShell Initialization Script for Windows
$ErrorActionPreference = "Continue"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " e-Hotel Harness Environment Initialization (PowerShell)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Check runtime environment (Node.js & npm per tech stack)
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = (node --version)
    Write-Host "[OK] Node.js version: $nodeVer" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Node.js is not found on PATH." -ForegroundColor Red
    Write-Host "        Please install Node.js (v20+ or v24+)." -ForegroundColor Yellow
}

if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVer = (npm --version)
    Write-Host "[OK] npm version: $npmVer" -ForegroundColor Green
} else {
    Write-Host "[WARN] npm is not found on PATH." -ForegroundColor Yellow
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

# 2. Check Backend Node.js / Prisma code if present
if (Test-Path "backend") {
    Write-Host "[INFO] Backend directory found. Verifying codebase..." -ForegroundColor Cyan
    if (Test-Path "backend/tests") {
        Write-Host "[RUN] Unit tests: npm test" -ForegroundColor Gray
        Push-Location "backend"
        try {
            npm test
        } finally {
            Pop-Location
        }
    }
} else {
    Write-Host "[INFO] No backend folder yet. Ready to start FEAT-01 (Node.js + Prisma ORM)." -ForegroundColor Blue
}

# 3. Display progress from feature_list.json
if (Test-Path "feature_list.json") {
    Write-Host "----------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "Feature List Status:" -ForegroundColor Cyan
    $jsonContent = Get-Content "feature_list.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    $total = $jsonContent.features.Count
    $passed = @($jsonContent.features | Where-Object { $_.status -eq "done" -or $_.status -eq "passed" }).Count
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
Write-Host "4. Implement and verify via: npm run lint, npm test, npx prisma db push"
Write-Host "5. Update session-handoff.md and progress.md before exiting."
