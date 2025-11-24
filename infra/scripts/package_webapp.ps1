#!/usr/bin/env pwsh

# Package web app for Azure App Service deployment
# This script builds the frontend and packages the backend with static files into a zip

Write-Host "Starting web app packaging for App Service..." -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

# Get the script directory and navigate to project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "../..")
$srcDir = Join-Path $projectRoot "src/App"
$distDir = Join-Path $srcDir "dist"

Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Write-Host "Source directory: $srcDir" -ForegroundColor Gray
Write-Host "Dist directory: $distDir" -ForegroundColor Gray

# Clean dist directory if it exists
if (Test-Path $distDir) {
    Write-Host "Cleaning existing dist directory..." -ForegroundColor Yellow
    Remove-Item -Path $distDir -Recurse -Force
}

# Create dist directory
Write-Host "Creating dist directory..." -ForegroundColor Yellow
New-Item -Path $distDir -ItemType Directory -Force | Out-Null

# Step 1: Build frontend
Write-Host "`nStep 1: Building frontend..." -ForegroundColor Cyan
$frontendDir = Join-Path $srcDir "frontend"

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location $frontendDir
    try {
        npm ci
        if ($LASTEXITCODE -ne 0) {
            throw "npm ci failed"
        }
    } finally {
        Pop-Location
    }
}

Write-Host "Running frontend build..." -ForegroundColor Yellow
Push-Location $frontendDir
try {
    $env:NODE_OPTIONS = "--max_old_space_size=8192"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed"
    }
} finally {
    Pop-Location
    Remove-Item Env:\NODE_OPTIONS -ErrorAction SilentlyContinue
}

# Step 2: Copy backend files
Write-Host "`nStep 2: Copying backend files..." -ForegroundColor Cyan

# Copy Python files and backend code
$filesToCopy = @(
    "app.py",
    "requirements.txt",
    "start.sh",
    "start.cmd"
)

foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $srcDir $file
    if (Test-Path $sourcePath) {
        Write-Host "  Copying $file" -ForegroundColor Gray
        Copy-Item -Path $sourcePath -Destination $distDir -Force
    }
}

# Copy backend directory
$backendSrc = Join-Path $srcDir "backend"
$backendDst = Join-Path $distDir "backend"
if (Test-Path $backendSrc) {
    Write-Host "  Copying backend directory..." -ForegroundColor Gray
    Copy-Item -Path $backendSrc -Destination $backendDst -Recurse -Force
}

# Copy static files (built frontend)
$staticSrc = Join-Path $srcDir "static"
$staticDst = Join-Path $distDir "static"
if (Test-Path $staticSrc) {
    Write-Host "  Copying static directory (frontend build output)..." -ForegroundColor Gray
    Copy-Item -Path $staticSrc -Destination $staticDst -Recurse -Force
} else {
    Write-Host "  WARNING: Static directory not found at $staticSrc" -ForegroundColor Yellow
}

# Verify the dist directory
$fileCount = (Get-ChildItem -Path $distDir -Recurse -File | Measure-Object).Count
$distSize = (Get-ChildItem -Path $distDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host "`n✓ Successfully prepared deployment package!" -ForegroundColor Green
Write-Host "  Dist location: $distDir" -ForegroundColor Cyan
Write-Host "  Total files: $fileCount" -ForegroundColor Cyan
Write-Host "  Total size: $([math]::Round($distSize, 2)) MB" -ForegroundColor Cyan

Write-Host "`nPackaging complete! azd will handle zip creation during deployment." -ForegroundColor Green
