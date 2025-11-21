#!/bin/bash

# Package web app for Azure App Service deployment
# This script builds the frontend and packages the backend with static files

echo "Starting web app packaging for App Service..."

set -e

# Get the script directory and navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SRC_DIR="$PROJECT_ROOT/src"
DIST_DIR="$SRC_DIR/dist"

echo "Project root: $PROJECT_ROOT"
echo "Source directory: $SRC_DIR"
echo "Dist directory: $DIST_DIR"

# Clean dist directory if it exists
if [ -d "$DIST_DIR" ]; then
    echo "Cleaning existing dist directory..."
    rm -rf "$DIST_DIR"
fi

# Create dist directory
echo "Creating dist directory..."
mkdir -p "$DIST_DIR"

# Step 1: Build frontend
echo ""
echo "Step 1: Building frontend..."
FRONTEND_DIR="$SRC_DIR/frontend"

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm ci
fi

echo "Running frontend build..."
cd "$FRONTEND_DIR"
export NODE_OPTIONS="--max_old_space_size=8192"
npm run build
unset NODE_OPTIONS

# Step 2: Copy backend files
echo ""
echo "Step 2: Copying backend files..."

# Copy Python files and backend code
for file in app.py requirements.txt; do
    if [ -f "$SRC_DIR/$file" ]; then
        echo "  Copying $file"
        cp "$SRC_DIR/$file" "$DIST_DIR/"
    fi
done

# Copy static files (built frontend)
STATIC_SRC="$SRC_DIR/static"
STATIC_DST="$DIST_DIR/static"
if [ -d "$STATIC_SRC" ]; then
    echo "  Copying static directory (frontend build output)..."
    cp -r "$STATIC_SRC" "$STATIC_DST"
else
    echo "  WARNING: Static directory not found at $STATIC_SRC"
fi

# Verify the dist directory
FILE_COUNT=$(find "$DIST_DIR" -type f | wc -l)
DIST_SIZE=$(du -sm "$DIST_DIR" | cut -f1)

echo ""
echo "✓ Successfully prepared deployment package!"
echo "  Dist location: $DIST_DIR"
echo "  Total files: $FILE_COUNT"
echo "  Total size: ${DIST_SIZE} MB"

echo ""
echo "Packaging complete! azd will handle zip creation during deployment."
