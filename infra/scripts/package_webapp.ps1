#!/usr/bin/env pwsh

# Package web app for Azure App Service deployment
# This script builds the frontend and packages the backend with static files into a zip

Write-Host "Starting web app packaging for App Service..."

$ErrorActionPreference = "Stop"

# Get the script directory and navigate to project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "../..")
$srcDir = Join-Path $projectRoot "src"
$distDir = Join-Path $srcDir "dist"

Write-Host "Project root: $projectRoot"
Write-Host "Source directory: $srcDir"
Write-Host "Dist directory: $distDir"

# Clean dist directory if it exists
if (Test-Path $distDir) {
    Write-Host "Cleaning existing dist directory..."
    Remove-Item -Path $distDir -Recurse -Force
}

# Create dist directory
Write-Host "Creating dist directory..."
New-Item -Path $distDir -ItemType Directory -Force | Out-Null

# Step 1: Build frontend
Write-Host "`nStep 1: Building frontend..."
$frontendDir = Join-Path $srcDir "frontend"

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "Installing frontend dependencies..."
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

Write-Host "Running frontend build..."
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
Write-Host "`nStep 2: Copying backend files..."

# Copy Python files and backend code
$filesToCopy = @(
    "app.py",
    "requirements.txt"
)

foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $srcDir $file
    if (Test-Path $sourcePath) {
        Write-Host "  Copying $file"
        Copy-Item -Path $sourcePath -Destination $distDir -Force
    }
}

# Copy static files (built frontend)
$staticSrc = Join-Path $srcDir "static"
$staticDst = Join-Path $distDir "static"
if (Test-Path $staticSrc) {
    Write-Host "  Copying static directory (frontend build output)..."
    Copy-Item -Path $staticSrc -Destination $staticDst -Recurse -Force
} else {
    Write-Host "  WARNING: Static directory not found at $staticSrc"
}

# Verify the dist directory
$fileCount = (Get-ChildItem -Path $distDir -Recurse -File | Measure-Object).Count
$distSize = (Get-ChildItem -Path $distDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host "`n✓ Successfully prepared deployment package!"
Write-Host "  Dist location: $distDir"
Write-Host "  Total files: $fileCount"
Write-Host "  Total size: $([math]::Round($distSize, 2)) MB"

Write-Host "`nPackaging complete! azd will handle zip creation during deployment."
