#!/bin/bash

###############################################################################
# Enhanced Deployment Script with Typesense Support
# 
# This script handles the complete deployment process including Typesense
#
# Usage:
#   bash scripts/deploy-with-typesense.sh [--skip-typesense]
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_NAME="aymen-api"
NODE_ENV="${NODE_ENV:-production}"
LOG_FILE="logs/deployment-$(date +%Y%m%d-%H%M%S).log"
SKIP_TYPESENSE=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --skip-typesense)
      SKIP_TYPESENSE=true
      shift
      ;;
  esac
done

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [WARNING] $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$LOG_FILE"
}

print_header() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║        🚀 Aymen Backend Deployment with Typesense          ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  Environment: ${NODE_ENV}                                  ║"
    echo "║  Started: $(date +'%Y-%m-%d %H:%M:%S')                     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

###############################################################################
# Pre-deployment Checks
###############################################################################

check_requirements() {
    log_info "Checking requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js $(node --version) found"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm $(npm --version) found"
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 is not installed"
        exit 1
    fi
    log_success "PM2 found"
    
    # Check environment file
    if [ ! -f ".env.$NODE_ENV" ]; then
        log_error ".env.$NODE_ENV file not found"
        exit 1
    fi
    log_success ".env.$NODE_ENV file found"
    
    # Check Typesense installation
    if [ "$SKIP_TYPESENSE" = false ]; then
        if ! systemctl is-active --quiet typesense 2>/dev/null; then
            log_warning "Typesense service is not running"
            log_info "You can install Typesense with: sudo bash scripts/typesense/install-typesense.sh"
            
            read -p "Continue without Typesense? (yes/no): " -r
            if [ "$REPLY" != "yes" ]; then
                exit 1
            fi
            SKIP_TYPESENSE=true
        else
            log_success "Typesense service is running"
        fi
    fi
}

###############################################################################
# Deployment Steps
###############################################################################

step_1_install_dependencies() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════"
    log_info "STEP 1: Installing dependencies..."
    log_info "═══════════════════════════════════════════════════════════"
    
    npm ci --production=false 2>&1 | tee -a "$LOG_FILE"
    
    log_success "Dependencies installed successfully"
}

step_2_build_application() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════"
    log_info "STEP 2: Building application..."
    log_info "═══════════════════════════════════════════════════════════"
    
    export NODE_ENV="$NODE_ENV"
    
    log_info "Cleaning old build..."
    rm -rf dist
    
    log_info "Running TypeScript compiler..."
    npm run build 2>&1 | tee -a "$LOG_FILE"
    
    if [ ! -d "dist" ]; then
        log_error "Build failed - dist directory not created"
        exit 1
    fi
    
    log_success "Application built successfully"
}

step_3_database_migrations() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════"
    log_info "STEP 3: Running database migrations..."
    log_info "═══════════════════════════════════════════════════════════"
    
    log_info "Checking migration status..."
    NODE_ENV=$NODE_ENV npm run migrate:status 2>&1 | tee -a "$LOG_FILE" || true
    
    log_info "Running pending migrations..."
    NODE_ENV=$NODE_ENV npm run migrate:latest 2>&1 | tee -a "$LOG_FILE"
    
    log_success "Database migrations completed"
}

step_4_configure_typesense() {
    if [ "$SKIP_TYPESENSE" = true ]; then
        log_warning "Skipping Typesense configuration"
        return
    fi
    
    echo ""
    log_info "═══════════════════════════════════════════════════════════"
    log_info "STEP 4: Configuring Typesense..."
    log_info "═══════════════════════════════════════════════════════════"
    
    # Check if Typesense is accessible
    TYPESENSE_HOST=${TYPESENSE_HOST:-localhost}
    TYPESENSE_PORT=${TYPESENSE_PORT:-8108}
    
    log_info "Testing Typesense connection at $TYPESENSE_HOST:$TYPESENSE_PORT..."
    
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
        "http://${TYPESENSE_HOST}:${TYPESENSE_PORT}/health" || echo "000")
    
    if [ "$HEALTH_CHECK" != "200" ]; then
        log_warning "Cannot connect to Typesense (HTTP $HEALTH_CHECK)"
        log_warning "Skipping Typesense configuration"
        return
    fi
    
    log_success "Typesense is accessible"
    
    # Initialize collections
    log_info "Initializing Typesense collections..."
    NODE_ENV=$NODE_ENV npm run typesense:init 2>&1 | tee -a "$LOG_FILE"
    
    # Ask about reindexing
    if [ -t 0 ]; then
        read -p "Reindex all data? (yes/no): " -r
        if [ "$REPLY" = "yes" ]; then
            log_info "Reindexing all data..."
            NODE_ENV=$NODE_ENV npm run typesense:reindex 2>&1 | tee -a "$LOG_FILE"
            log_success "Data reindexed"
        else
            log_info "Skipping data reindexing"
        fi
    else
        log_info "Non-interactive mode - skipping reindexing"
        log_info "You can manually reindex with: npm run typesense:reindex"
    fi
    
    log_success "Typesense configuration completed"
}

step_5_start_pm2() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════"
    log_info "STEP 5: Starting application with PM2..."
    log_info "═══════════════════════════════════════════════════════════"
    
    # Check if app is already running
    if pm2 list | grep -q "$APP_NAME"; then
        log_info "Application is already running, reloading..."
        pm2 reload "$APP_NAME" --update-env 2>&1 | tee -a "$LOG_FILE"
        log_success "Application reloaded (zero-downtime)"
    else
        log_info "Starting new application instance..."
        pm2 start ecosystem.config.js --only "$APP_NAME" --env "$NODE_ENV" 2>&1 | tee -a "$LOG_FILE"
        log_success "Application started"
    fi
    
    # Save PM2 configuration
    log_info "Saving PM2 configuration..."
    pm2 save 2>&1 | tee -a "$LOG_FILE"
    
    log_success "PM2 deployment completed"
}

step_6_health_check() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════"
    log_info "STEP 6: Running health checks..."
    log_info "═══════════════════════════════════════════════════════════"
    
    # Wait for app to start
    log_info "Waiting for application to start..."
    sleep 5
    
    # Check if app is online
    APP_STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.status" 2>/dev/null || echo "unknown")
    
    if [ "$APP_STATUS" = "online" ]; then
        log_success "Application status: ONLINE ✓"
    else
        log_error "Application status: $APP_STATUS ✗"
        exit 1
    fi
    
    # Check health endpoint
    PORT=$(grep "^PORT=" .env.$NODE_ENV | cut -d '=' -f2 || echo "8080")
    log_info "Testing health endpoint on port $PORT..."
    
    for i in {1..3}; do
        HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health" || echo "000")
        
        if [ "$HEALTH_CHECK" = "200" ]; then
            log_success "Health endpoint: OK (200) ✓"
            break
        else
            if [ $i -eq 3 ]; then
                log_warning "Health endpoint: Not responding (HTTP $HEALTH_CHECK)"
            else
                log_info "Retrying in 3 seconds..."
                sleep 3
            fi
        fi
    done
    
    # Check Typesense endpoint if enabled
    if [ "$SKIP_TYPESENSE" = false ]; then
        log_info "Testing search endpoint..."
        SEARCH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
            "http://localhost:$PORT/api/search?q=test" || echo "000")
        
        if [ "$SEARCH_CHECK" = "200" ]; then
            log_success "Search endpoint: OK (200) ✓"
        else
            log_warning "Search endpoint: HTTP $SEARCH_CHECK (may be expected if no data)"
        fi
    fi
    
    log_success "Health checks completed"
}

###############################################################################
# Main Execution
###############################################################################

main() {
    START_TIME=$(date +%s)
    
    print_header
    
    mkdir -p logs
    
    check_requirements
    step_1_install_dependencies
    step_2_build_application
    step_3_database_migrations
    step_4_configure_typesense
    step_5_start_pm2
    step_6_health_check
    
    END_TIME=$(date +%s)
    DEPLOY_TIME=$((END_TIME - START_TIME))
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           ✅ Deployment Completed Successfully!            ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  Total time: ${DEPLOY_TIME}s                               ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📊 Useful commands:"
    echo "   pm2 logs $APP_NAME              # View logs"
    echo "   pm2 monit                       # Monitor app"
    echo "   npm run typesense:status        # Check search status"
    echo "   npm run typesense:reindex       # Reindex data"
    echo ""
}

main