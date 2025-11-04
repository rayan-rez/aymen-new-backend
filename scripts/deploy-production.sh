#!/bin/bash

echo "🚀 Deploying to PRODUCTION..."
echo "================================"

# Check if on correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: Not on main branch (currently on $CURRENT_BRANCH)"
    echo "Please switch to main branch first: git checkout main"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: You have uncommitted changes"
    echo "Please commit or stash your changes first"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests (if available)
echo "🧪 Running tests..."
npm run test:ci || {
    echo "❌ Tests failed! Deployment aborted."
    exit 1
}

# Build the application
echo "🔨 Building application..."
npm run build || {
    echo "❌ Build failed! Deployment aborted."
    exit 1
}

# Deploy with PM2
echo "🚀 Deploying with PM2..."
pm2 deploy ecosystem.config.js production

echo "✅ Deployment completed!"
echo "================================"
echo "View logs: pm2 logs aymen-api-prod"
echo "Check status: pm2 status"
