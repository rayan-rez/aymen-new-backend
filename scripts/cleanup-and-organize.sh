#!/bin/bash

###############################################################################
# Project Cleanup and Organization Script
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
echo "║       🧹 Project Cleanup - Typesense Organization            ║"
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
    rm -rf scripts.backup
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
mkdir -p scripts/typesense
mkdir -p scripts/deployment
mkdir -p scripts/database
mkdir -p scripts/maintenance
echo -e "${GREEN}✓${NC} Created organized directory structure"

###############################################################################
# 3. Move Typesense Scripts
###############################################################################

echo -e "${BLUE}[3/6]${NC} Organizing Typesense scripts..."

# Remove old, messy scripts
rm -f scripts/fix-typesense-service.sh
rm -f scripts/install-typesense.sh
rm -f scripts/typesense-cli.ts

# The new scripts are already created in scripts/typesense/
echo -e "${GREEN}✓${NC} Typesense scripts organized"

###############################################################################
# 4. Organize Deployment Scripts
###############################################################################

echo -e "${BLUE}[4/6]${NC} Organizing deployment scripts..."

# Move deployment scripts
[ -f "scripts/deploy.sh" ] && mv scripts/deploy.sh scripts/deployment/deploy-legacy.sh
[ -f "scripts/apache-reverse-proxy-setup.sh" ] && mv scripts/apache-reverse-proxy-setup.sh scripts/deployment/
[ -f "scripts/diagnostic.sh" ] && mv scripts/diagnostic.sh scripts/deployment/

# deploy-with-typesense.sh stays at root for easy access
echo -e "${GREEN}✓${NC} Deployment scripts organized"

###############################################################################
# 5. Organize Database Scripts
###############################################################################

echo -e "${BLUE}[5/6]${NC} Organizing database scripts..."

[ -f "scripts/backup-db.sh" ] && mv scripts/backup-db.sh scripts/database/
[ -f "scripts/verify-migration.ts" ] && mv scripts/verify-migration.ts scripts/database/
[ -f "scripts/verify-legacy-db.ts" ] && mv scripts/verify-legacy-db.ts scripts/database/

echo -e "${GREEN}✓${NC} Database scripts organized"

###############################################################################
# 6. Organize Maintenance Scripts
###############################################################################

echo -e "${BLUE}[6/6]${NC} Organizing maintenance scripts..."

[ -f "scripts/health-check.sh" ] && mv scripts/health-check.sh scripts/maintenance/
[ -f "scripts/rollback.sh" ] && mv scripts/rollback.sh scripts/maintenance/

echo -e "${GREEN}✓${NC} Maintenance scripts organized"

###############################################################################
# 7. Set Permissions
###############################################################################

echo -e "${BLUE}Setting executable permissions...${NC}"

# Make all .sh files executable
find scripts -name "*.sh" -type f -exec chmod +x {} \;

# Make TypeScript scripts executable
find scripts -name "*.ts" -type f -exec chmod +x {} \;

echo -e "${GREEN}✓${NC} Set executable permissions"

###############################################################################
# Summary
###############################################################################

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ Cleanup Complete!                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "📁 New Structure:"
echo ""
echo "scripts/"
echo "├── deploy-with-typesense.sh          # Main deployment (NEW)"
echo "│"
echo "├── typesense/                         # Typesense management"
echo "│   ├── install-typesense.sh          # Install Typesense server"
echo "│   ├── configure.sh        # Configure & index"
echo "│   ├── init-collections.ts           # Initialize collections"
echo "│   ├── reindex.ts                    # Reindex data"
echo "│   └── status.ts                     # Check status"
echo "│"
echo "├── deployment/                        # Deployment utilities"
echo "│   ├── deploy-legacy.sh"
echo "│   ├── apache-reverse-proxy-setup.sh"
echo "│   └── diagnostic.sh"
echo "│"
echo "├── database/                          # Database utilities"
echo "│   ├── backup-db.sh"
echo "│   ├── verify-migration.ts"
echo "│   └── verify-legacy-db.ts"
echo "│"
echo "└── maintenance/                       # Maintenance tools"
echo "    ├── health-check.sh"
echo "    └── rollback.sh"
echo ""

echo "📝 Updated package.json scripts:"
echo ""
echo "  Typesense:"
echo "    npm run typesense:install       # Install Typesense"
echo "    npm run typesense:init          # Initialize collections"
echo "    npm run typesense:reindex       # Reindex all data"
echo "    npm run typesense:status        # Check status"
echo "    npm run typesense:configure     # Full configuration"
echo ""
echo "  Deployment:"
echo "    npm run deploy                  # Full deployment with Typesense"
echo "    npm run deploy:check            # Pre-deployment diagnostic"
echo "    npm run deploy:typesense        # Configure Typesense only"
echo ""

echo "🚀 Quick Start:"
echo ""
echo "1. Local Development:"
echo "   sudo npm run typesense:install"
echo "   npm run typesense:init"
echo "   npm run typesense:reindex"
echo ""
echo "2. Production Deployment:"
echo "   # On server:"
echo "   sudo bash scripts/typesense/install-typesense.sh"
echo "   bash scripts/deploy-with-typesense.sh"
echo ""
echo "3. Check Status:"
echo "   npm run typesense:status"
echo ""

echo "📚 Documentation:"
echo "   See TYPESENSE_DEPLOYMENT_GUIDE.md for complete guide"
echo ""

echo "⚠️  Important:"
echo "   - Backup kept at: scripts.backup/"
echo "   - To restore: rm -rf scripts && mv scripts.backup scripts"
echo "   - Update your CI/CD pipelines with new script paths"
echo ""