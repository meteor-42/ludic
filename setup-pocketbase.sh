#!/bin/bash
# ========================================
# PocketBase Setup Script
# ========================================
# This script downloads and sets up PocketBase

set -e

echo "🚀 Setting up PocketBase..."

# PocketBase version
PB_VERSION="0.22.22"

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Map architecture names
case $ARCH in
    x86_64)
        ARCH="amd64"
        ;;
    aarch64|arm64)
        ARCH="arm64"
        ;;
    armv7l)
        ARCH="armv7"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# Create pb directory if it doesn't exist
mkdir -p pb

# Download URL
DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip"

echo "📥 Downloading PocketBase v${PB_VERSION} for ${OS}_${ARCH}..."
echo "URL: ${DOWNLOAD_URL}"

# Download PocketBase
cd pb
curl -L -o pocketbase.zip "${DOWNLOAD_URL}"

# Extract
echo "📦 Extracting PocketBase..."
unzip -o pocketbase.zip
rm pocketbase.zip

# Make executable
chmod +x pocketbase

# Create data directory
mkdir -p pb_data
mkdir -p pb_migrations
mkdir -p pb_hooks

echo "✅ PocketBase installed successfully!"

# Check if we should start PocketBase
read -p "Do you want to start PocketBase now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting PocketBase on http://127.0.0.1:8090"
    echo "Admin UI: http://127.0.0.1:8090/_/"
    ./pocketbase serve --http="127.0.0.1:8090"
else
    echo "You can start PocketBase later with:"
    echo "cd pb && ./pocketbase serve --http='127.0.0.1:8090'"
fi
