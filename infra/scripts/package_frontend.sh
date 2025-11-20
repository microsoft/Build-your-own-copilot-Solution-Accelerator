#!/bin/bash

echo ""
echo "========================================"
echo "  Frontend Build Script (Bash)"
echo "  Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# Get the script directory and navigate to frontend
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_DIR="$SCRIPT_DIR/../../src/frontend"
DIST_DIR="$SCRIPT_DIR/../../dist"

echo "📂 Frontend directory: $FRONTEND_DIR"
echo "📂 Output directory: $DIST_DIR"
echo ""

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

# Navigate to frontend directory
cd "$FRONTEND_DIR" || exit 1

# Install dependencies
echo "📦 Installing frontend dependencies..."
npm ci

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build the frontend
echo ""
echo "🏗️  Building frontend application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build frontend"
    exit 1
fi

# Create dist directory if it doesn't exist
mkdir -p "$DIST_DIR"

# Copy build output to dist directory
echo ""
echo "📋 Copying build output to dist directory..."
# Vite outputs to ../static from frontend directory, which is src/static
BUILD_OUTPUT="$SCRIPT_DIR/../../src/static"

if [ -d "$BUILD_OUTPUT" ]; then
    cp -r "$BUILD_OUTPUT"/* "$DIST_DIR/"
    echo "✅ Frontend build completed successfully!"
    echo "   Build output copied from: $BUILD_OUTPUT"
else
    echo "❌ Build output directory not found: $BUILD_OUTPUT"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ Frontend packaging completed!"
echo "========================================"
echo ""
