#!/bin/bash

###############################################################################
# Project Cleanup Script
# Reorganizes scripts and removes obsolete files
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          🧹 Project Cleanup - Aymen Backend                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Confirm action
echo -e "${YELLOW}⚠️  This will reorganize your scripts directory${NC}"
echo -e "${YELLOW}   A backup will be created at scripts.backup/${NC}"
echo ""
read -p "Continue? (yes/no): " -r
echo

if [ "$REPLY" != "yes" ]; then
    echo "Cleanup cancelled"
    exit 0
fi

###############################################################################
# 1. Create Backup
###############################################################################

echo -e "${BLUE}[1/6]${NC} Creating backup..."
if [ -d "scripts" ]; then
    cp -r scripts scripts.backup
    echo -e "${GREEN}✓${NC} Backup created at scripts.backup/"
else
    echo -e "${RED}✗${NC} scripts/ directory not found"
    exit 1
fi

###############################################################################
# 2. Create New Directory Structure
###############################################################################

echo -e "${BLUE}[2/6]${NC} Creating new directory structure..."
mkdir -p scripts/dev
mkdir -p scripts/archive
echo -e "${GREEN}✓${NC} Created scripts/dev/ and scripts/archive/"

###############################################################################
# 3. Move Development Scripts
###############################################################################

echo -e "${BLUE}[3/6]${NC} Moving development scripts..."

# Move to dev/
for script in verify-test-setup.sh verify-migration.ts setup-test-db.ts diagnose-test-issue.ts; do
    if [ -f "scripts/$script" ]; then
        mv "scripts/$script" scripts/dev/
        echo -e "${GREEN}✓${NC} Moved $script to scripts/dev/"
    fi
done

###############################################################################
# 4. Archive Legacy Scripts
###############################################################################

echo -e "${BLUE}[4/6]${NC} Archiving legacy scripts..."

# Move to archive/
LEGACY_SCRIPTS=(
    "verify-legacy-db.ts"
)

for script in "${LEGACY_SCRIPTS[@]}"; do
    if [ -f "scripts/$script" ]; then
        mv "scripts/$script" scripts/archive/
        echo -e "${GREEN}✓${NC} Archived $script"
    fi
done

###############################################################################
# 5. Remove Obsolete Scripts
###############################################################################

echo -e "${BLUE}[5/6]${NC} Removing obsolete scripts..."

# Scripts to remove
OBSOLETE_SCRIPTS=(
    "deploy-production.sh"
    "deploy-staging.sh"
    "pm2-setup.sh"
    "pm2-monitor.sh"
    "stop-apache-use-pm2.sh"
    "diagnose-port-issue.sh"
)

for script in "${OBSOLETE_SCRIPTS[@]}"; do
    if [ -f "scripts/$script" ]; then
        rm "scripts/$script"
        echo -e "${GREEN}✓${NC} Removed $script"
    fi
done

###############################################################################
# 6. Set Permissions
###############################################################################

echo -e "${BLUE}[6/6]${NC} Setting executable permissions..."

# Make all .sh files executable
find scripts -name "*.sh" -type f -exec chmod +x {} \;
echo -e "${GREEN}✓${NC} Set executable permissions on shell scripts"

###############################################################################
# Summary
###############################################################################

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ Cleanup Complete!                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "📁 New Structure:"
echo ""
echo "scripts/"
echo "├── deploy.sh                          # Main deployment"
echo "├── apache-reverse-proxy-setup.sh      # Apache setup"
echo "├── comprehensive-diagnostic.sh        # System diagnostic"
echo "├── health-check.sh                    # Health monitoring"
echo "├── backup-db.sh                       # Database backup"
echo "├── rollback.sh                        # Rollback utility"
echo "│"
echo "├── dev/                               # Development tools"
echo "│   ├── verify-test-setup.sh"
echo "│   ├── verify-migration.ts"
echo "│   ├── setup-test-db.ts"
echo "│   └── diagnose-test-issue.ts"
echo "│"
echo "└── archive/                           # Legacy scripts"
echo "    └── verify-legacy-db.ts"
echo ""

echo "📝 Next Steps:"
echo ""
echo "1. Review the changes:"
echo "   ls -la scripts/"
echo ""
echo "2. Update package.json scripts (manual step)"
echo "   See: CLEANUP_PLAN.md for recommended changes"
echo ""
echo "3. Test deployment workflow:"
echo "   npm run deploy:check"
echo ""
echo "4. If everything works, commit changes:"
echo "   git add scripts/"
echo "   git commit -m 'chore: reorganize deployment scripts'"
echo ""
echo "5. Delete backup after verification:"
echo "   rm -rf scripts.backup"
echo ""

echo "⚠️  Important:"
echo "   - Backup kept at: scripts.backup/"
echo "   - To restore: rm -rf scripts && mv scripts.backup scripts"
echo ""