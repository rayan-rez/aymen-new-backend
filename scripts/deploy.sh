#!/bin/bash

###############################################################################
# Aymen Backend Deployment Script
# 
# This script handles the complete deployment process:
# 1. Install dependencies
# 2. Build the application
# 3. Run database migrations
# 4. Seed the database
# 5. Clean up project directory
# 6. Start/restart with PM2
#
# Usage:
#   bash scripts/deploy.sh
#   chmod +x scripts/deploy.sh && ./scripts/deploy.sh
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="aymen-api-prod"
NODE_ENV="${NODE_ENV:-production}"
LOG_FILE="logs/deployment-$(date +%Y%m%d-%H%M%S).log"

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
    echo "║           🚀 Aymen Backend Deployment Script               ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  Environment: ${NODE_ENV}                                        "
    echo "║  Started: $(date +'%Y-%m-%d %H:%M:%S')                           "
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

print_footer() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              ✅ Deployment Completed Successfully          ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  Finished: $(date +'%Y-%m-%d %H:%M:%S')                          "
    echo "║  Total time: $1 seconds                                    "
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

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
        log_error "PM2 is not installed. Install it with: npm install -g pm2"
        exit 1
    fi
    log_success "PM2 $(pm2 --version) found"
    
    # Check .env.production file
    if [ ! -f ".env.production" ]; then
        log_error ".env.production file not found"
        exit 1
    fi
    log_success ".env.production file found"
}

create_directories() {
    log_info "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p uploads
    mkdir -p backups
    
    log_success "Directories created"
}

###############################################################################
# Main Deployment Steps
###############################################################################

step_1_install_dependencies() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════"
    log_info "STEP 1: Installing dependencies..."
    log_info "═══════════════════════════════════════════════════════════"
    
    # Clean install for production
    if [ "$NODE_ENV" = "production" ]; then
        log_info "Running production install (without dev dependencies)..."
        npm ci --production=false 2>&1 | tee -a "$LOG_FILE"
    else
        log_info "Running development install..."
        npm install 2>&1 | tee -a "$LOG_FILE"
    fi
    
    log_success "Dependencies installed successfully"
}

step_2_build_application() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════"
    log_info "STEP 2: Building application..."
    log_info "═══════════════════════════════════════════════════════════"
    
    # Set NODE_ENV for build
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
    
    # Check migration status first
    log_info "Checking migration status..."
    npm run migrate:status 2>&1 | tee -a "$LOG_FILE" || true
    
    # Run migrations
    log_info "Running pending migrations..."
    npm run migrate:latest 2>&1 | tee -a "$LOG_FILE"
    
    log_success "Database migrations completed"
}

step_4_seed_database() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════"
    log_info "STEP 4: Seeding database..."
    log_info "═══════════════════════════════════════════════════════════"
    
    # Ask for confirmation in production
    if [ "$NODE_ENV" = "production" ]; then
        log_warning "You are about to seed the PRODUCTION database!"
        read -p "Continue? (yes/no): " -r
        echo
        if [ "$REPLY" != "yes" ]; then
            log_warning "Database seeding skipped"
            return
        fi
    fi
    
    log_info "Running database seeds..."
    npm run seed:run 2>&1 | tee -a "$LOG_FILE" || {
        log_warning "Seeding failed or skipped (this may be expected)"
    }
    
    log_success "Database seeding completed"
}

step_5_cleanup() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════"
    log_info "STEP 5: Cleaning up project directory..."
    log_info "═══════════════════════════════════════════════════════════"
    
    # Remove node_modules cache
    log_info "Clearing npm cache..."
    npm cache clean --force 2>&1 | tee -a "$LOG_FILE" || true
    
    # Remove temporary files
    log_info "Removing temporary files..."
    find . -name "*.tmp" -type f -delete 2>/dev/null || true
    find . -name ".DS_Store" -type f -delete 2>/dev/null || true
    
    # Clean old logs (keep last 30 days)
    log_info "Cleaning old log files..."
    find logs -name "*.log" -type f -mtime +30 -delete 2>/dev/null || true
    
    # Remove old backups (keep last 7 days)
    log_info "Cleaning old backup files..."
    find backups -type f -mtime +7 -delete 2>/dev/null || true
    
    # In production, remove dev dependencies
    if [ "$NODE_ENV" = "production" ]; then
        log_info "Removing dev dependencies for production..."
        npm prune --production 2>&1 | tee -a "$LOG_FILE"
    fi
    
    log_success "Cleanup completed"
}

step_6_start_pm2() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════"
    log_info "STEP 6: Starting application with PM2..."
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
    
    # Show status
    echo ""
    log_info "Current PM2 status:"
    pm2 list
    
    log_success "PM2 deployment completed"
}

step_7_health_check() {
    echo ""
    log_info "═══════════════════════════════════════════════════════════"
    log_info "STEP 7: Running health checks..."
    log_info "═══════════════════════════════════════════════════════════"
    
    # Wait for app to start
    log_info "Waiting for application to start (10 seconds)..."
    sleep 10
    
    # Check if app is online
    APP_STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.status" 2>/dev/null || echo "unknown")
    
    if [ "$APP_STATUS" = "online" ]; then
        log_success "Application status: ONLINE ✓"
    else
        log_error "Application status: $APP_STATUS ✗"
        log_error "Check logs with: pm2 logs $APP_NAME"
        exit 1
    fi
    
    # Check health endpoint
    PORT=$(grep "^PORT=" .env.production | cut -d '=' -f2 || echo "3000")
    log_info "Testing health endpoint on port $PORT..."
    
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health" || echo "000")
    
    if [ "$HEALTH_CHECK" = "200" ]; then
        log_success "Health endpoint: OK (200) ✓"
    else
        log_warning "Health endpoint: $HEALTH_CHECK (may need more time to start)"
    fi
    
    # Display basic metrics
    log_info "Application metrics:"
    pm2 describe "$APP_NAME" | grep -E "uptime|restarts|memory|cpu" || true
    
    log_success "Health checks completed"
}

###############################################################################
# Cleanup on Error
###############################################################################

cleanup_on_error() {
    log_error "Deployment failed! Rolling back..."
    
    # Try to restart the previous version if it exists
    if pm2 list | grep -q "$APP_NAME"; then
        log_info "Attempting to restart previous version..."
        pm2 restart "$APP_NAME" 2>&1 | tee -a "$LOG_FILE" || true
    fi
    
    log_error "Check the log file for details: $LOG_FILE"
    exit 1
}

trap cleanup_on_error ERR

###############################################################################
# Main Execution
###############################################################################

main() {
    START_TIME=$(date +%s)
    
    print_header
    
    # Create log directory
    mkdir -p logs
    
    # Pre-deployment checks
    check_requirements
    create_directories
    
    # Deployment steps
    step_1_install_dependencies
    step_2_build_application
    step_3_database_migrations
    step_4_seed_database
    step_5_cleanup
    step_6_start_pm2
    step_7_health_check
    
    # Calculate deployment time
    END_TIME=$(date +%s)
    DEPLOY_TIME=$((END_TIME - START_TIME))
    
    print_footer "$DEPLOY_TIME"
    
    # Final instructions
    echo "📊 Useful commands:"
    echo "   View logs:        pm2 logs $APP_NAME"
    echo "   Monitor app:      pm2 monit"
    echo "   Check status:     pm2 status"
    echo "   Restart app:      pm2 restart $APP_NAME"
    echo "   Stop app:         pm2 stop $APP_NAME"
    echo ""
    echo "🌐 Access your API at: http://localhost:${PORT:-3000}"
    echo ""
}

# Run main function
main