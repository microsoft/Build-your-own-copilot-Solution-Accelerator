#!/usr/bin/env pwsh

Write-Host "`n========================================" 
Write-Host "  Frontend Build Script (PowerShell)"
Write-Host "  Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "========================================`n"

# Get the script directory and navigate to frontend
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $scriptDir "..\..\src\frontend"
$distDir = Join-Path $scriptDir "..\..\dist"

Write-Host "📂 Frontend directory: $frontendDir"
Write-Host "📂 Output directory: $distDir`n"

# Check if frontend directory exists
if (-not (Test-Path $frontendDir)) {
    Write-Host "❌ Frontend directory not found: $frontendDir"
    exit 1
}

# Navigate to frontend directory
Push-Location $frontendDir

try {
    # Install dependencies
    Write-Host "📦 Installing frontend dependencies..."
    npm ci
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies"
        exit 1
    }
    
    # Build the frontend
    Write-Host "`n🏗️  Building frontend application..."
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to build frontend"
        exit 1
    }
    
    # Create dist directory if it doesn't exist
    if (-not (Test-Path $distDir)) {
        New-Item -ItemType Directory -Path $distDir -Force | Out-Null
    }
    
    # Copy build output to dist directory
    Write-Host "`n📋 Copying build output to dist directory..."
    # Vite outputs to ../static from frontend directory, which is src/static
    $buildOutput = Join-Path $scriptDir "..\..\src\static"
    
    if (Test-Path $buildOutput) {
        Copy-Item -Path "$buildOutput\*" -Destination $distDir -Recurse -Force
        Write-Host "✅ Frontend build completed successfully!"
        Write-Host "   Build output copied from: $buildOutput"
    } else {
        Write-Host "❌ Build output directory not found: $buildOutput"
        exit 1
    }
    
} finally {
    # Return to original directory
    Pop-Location
}

Write-Host "`n========================================" 
Write-Host "✅ Frontend packaging completed!"
Write-Host "========================================`n"
