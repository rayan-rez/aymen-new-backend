#!/bin/bash

###############################################################################
# Typesense Configuration Script
# Initializes collections and indexes data
# 
# Usage:
#   bash scripts/typesense/configure-typesense.sh [environment]
#   Examples:
#     bash scripts/typesense/configure-typesense.sh development
#     bash scripts/typesense/configure-typesense.sh production
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Get environment (default to current NODE_ENV or development)
ENVIRONMENT=${1:-${NODE_ENV:-development}}

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          🔧 Typesense Configuration & Indexing             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}Environment:${NC} $ENVIRONMENT"
echo ""

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    echo -e "${GREEN}✓${NC} Loading .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ .env.$ENVIRONMENT not found!${NC}"
    exit 1
fi

# Verify Typesense configuration
if [ -z "$TYPESENSE_API_KEY" ]; then
    echo -e "${RED}❌ TYPESENSE_API_KEY not set in .env.$ENVIRONMENT${NC}"
    exit 1
fi

if [ -z "$TYPESENSE_HOST" ]; then
    echo -e "${RED}❌ TYPESENSE_HOST not set in .env.$ENVIRONMENT${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Typesense Host: $TYPESENSE_HOST:${TYPESENSE_PORT:-8108}"
echo ""

# Test Typesense connection
echo -e "${BLUE}[1/4]${NC} Testing Typesense connection..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://${TYPESENSE_HOST}:${TYPESENSE_PORT:-8108}/health" || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✓${NC} Typesense is reachable"
else
    echo -e "${RED}❌ Cannot connect to Typesense (HTTP $HEALTH_CHECK)${NC}"
    echo "   Check if Typesense is running: systemctl status typesense"
    exit 1
fi

# Build the project if needed
if [ ! -d "dist" ]; then
    echo -e "${BLUE}[2/4]${NC} Building project..."
    npm run build
else
    echo -e "${GREEN}✓${NC} Project already built"
fi

# Initialize collections
echo -e "${BLUE}[3/4]${NC} Initializing Typesense collections..."
NODE_ENV=$ENVIRONMENT npm run typesense:init

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Collections initialized"
else
    echo -e "${RED}❌ Failed to initialize collections${NC}"
    exit 1
fi

# Reindex all data
echo -e "${BLUE}[4/4]${NC} Reindexing all data..."
NODE_ENV=$ENVIRONMENT npm run typesense:reindex

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Data reindexed successfully"
else
    echo -e "${YELLOW}⚠${NC}  Reindexing completed with warnings (check output above)"
fi

# Get collection statistics
echo ""
echo -e "${BLUE}📊 Collection Statistics:${NC}"
NODE_ENV=$ENVIRONMENT npm run typesense:status

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         ✅ Typesense Configuration Complete!               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🔍 You can now use search functionality in your application"
echo ""