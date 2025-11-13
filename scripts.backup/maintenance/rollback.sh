#!/bin/bash

echo "⏮️  Rolling back deployment..."
echo "================================"

# Show last 5 commits
echo "Recent commits:"
git log --oneline -5

echo ""
read -p "Enter commit hash to rollback to: " COMMIT_HASH

if [ -z "$COMMIT_HASH" ]; then
    echo "❌ No commit hash provided"
    exit 1
fi

# Confirm rollback
echo ""
echo "⚠️  WARNING: This will rollback to commit $COMMIT_HASH"
read -p "Are you sure? (yes/no) " -r
echo

if [ "$REPLY" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Backup current state
echo "📦 Creating backup of current state..."
git branch backup-$(date +%Y%m%d-%H%M%S)

# Rollback
echo "⏮️  Rolling back..."
git reset --hard "$COMMIT_HASH"

# Rebuild
echo "🔨 Building..."
npm run build

# Restart PM2
echo "🔄 Restarting application..."
pm2 reload ecosystem.config.js --env production

echo "✅ Rollback completed!"
echo "================================"
