#!/bin/bash
# ========================================
# Deployment Script for Ludic Project
# ========================================
# This script is called by the server when GitHub webhook is triggered
# It updates the code, installs dependencies, builds the project, and restarts services

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Store the current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# ========================================
# 1. Update code from Git
# ========================================
echo "📦 Pulling latest code from repository..."
git fetch --all
git reset --hard origin/main

# ========================================
# 2. Install/Update dependencies
# ========================================
echo "📦 Installing dependencies..."
if command -v bun &> /dev/null; then
    bun install
else
    npm ci --production=false
fi

# ========================================
# 3. Build the frontend
# ========================================
echo "🔨 Building frontend..."
if command -v bun &> /dev/null; then
    bun run build:prod
else
    npm run build:prod
fi

# ========================================
# 4. Create necessary directories
# ========================================
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p dist

# ========================================
# 5. Set proper permissions
# ========================================
echo "🔒 Setting permissions..."
chmod +x deploy.sh
chmod +x server.js

# If PocketBase binary exists, make it executable
if [ -f "pb/pocketbase" ]; then
    chmod +x pb/pocketbase
fi

# ========================================
# 6. Restart services with PM2
# ========================================
echo "🔄 Restarting services..."
if command -v pm2 &> /dev/null; then
    # Reload PM2 processes gracefully
    pm2 reload ecosystem.config.js --env production

    # Save PM2 process list
    pm2 save

    echo "✅ PM2 services reloaded"
else
    echo "⚠️  PM2 not found. Please restart the server manually."
fi

# ========================================
# 7. Clean up old files (optional)
# ========================================
echo "🧹 Cleaning up..."
# Remove old log files older than 30 days
find ./logs -name "*.log" -type f -mtime +30 -delete 2>/dev/null || true

# ========================================
# 8. Health check
# ========================================
echo "🏥 Running health check..."
sleep 5  # Wait for services to start

# Check if server is running
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Server is healthy"
else
    echo "⚠️  Server health check failed"
fi

# Check if PocketBase is running
if curl -f http://127.0.0.1:8090/api/health > /dev/null 2>&1; then
    echo "✅ PocketBase is healthy"
else
    echo "⚠️  PocketBase health check failed"
fi

echo "🎉 Deployment completed successfully!"

# ========================================
# Send notification (optional)
# ========================================
# You can add notification logic here
# For example, send a Discord/Slack webhook notification
# or send an email notification

exit 0
