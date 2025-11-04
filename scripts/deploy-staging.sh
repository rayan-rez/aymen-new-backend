#!/bin/bash

echo "🚀 Deploying to STAGING..."
echo "================================"

# Check if on correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "staging" ]; then
    echo "⚠️  Warning: Not on staging branch (currently on $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin staging

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build || {
    echo "❌ Build failed! Deployment aborted."
    exit 1
}

# Deploy with PM2
echo "🚀 Deploying with PM2..."
pm2 deploy ecosystem.config.js staging

echo "✅ Deployment completed!"
echo "================================"
echo "View logs: pm2 logs aymen-api-staging"
echo "Check status: pm2 status"
