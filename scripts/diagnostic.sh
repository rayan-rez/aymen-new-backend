#!/bin/bash

###############################################################################
# Comprehensive Deployment Diagnostic & Analysis
# Checks everything and provides recommendations
###############################################################################

echo "🔍 COMPREHENSIVE DEPLOYMENT ANALYSIS"
echo "===================================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ISSUES=0
WARNINGS=0

# =================================================================
# 1. ENVIRONMENT CHECK
# =================================================================
echo "1️⃣  Environment Configuration"
echo "--------------------------------------------------------------------"

if [ -f ".env.production" ]; then
    echo -e "   ${GREEN}✓${NC} .env.production exists"
    
    # Check PORT setting
    PORT=$(grep "^PORT=" .env.production | cut -d '=' -f2 || echo "not set")
    echo "   Port in .env.production: $PORT"
    
    # Check APP_URL
    APP_URL=$(grep "^APP_URL=" .env.production | cut -d '=' -f2 || echo "not set")
    echo "   APP_URL: $APP_URL"
else
    echo -e "   ${RED}✗${NC} .env.production missing"
    ISSUES=$((ISSUES + 1))
fi

echo ""

# =================================================================
# 2. WEB SERVER CHECK
# =================================================================
echo "2️⃣  Web Server Status"
echo "--------------------------------------------------------------------"

# Apache check
if systemctl is-active --quiet apache2 2>/dev/null; then
    echo -e "   ${YELLOW}⚠${NC}  Apache is RUNNING on port 80"
    echo "   This requires reverse proxy configuration"
    WARNINGS=$((WARNINGS + 1))
    
    # Check if reverse proxy is configured
    if [ -f "/etc/apache2/sites-available/aymen-api.conf" ]; then
        echo -e "   ${GREEN}✓${NC} Apache virtual host configured"
        if apache2ctl -S 2>/dev/null | grep -q "aymen-api"; then
            echo -e "   ${GREEN}✓${NC} Virtual host is enabled"
        else
            echo -e "   ${YELLOW}⚠${NC}  Virtual host exists but not enabled"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "   ${RED}✗${NC} Apache reverse proxy NOT configured"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "   ${GREEN}✓${NC} Apache is not running"
fi

# Nginx check
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "   ${YELLOW}⚠${NC}  Nginx is running"
    WARNINGS=$((WARNINGS + 1))
else
    echo "   ℹ️  Nginx is not running"
fi

echo ""

# =================================================================
# 3. PORT AVAILABILITY
# =================================================================
echo "3️⃣  Port Availability"
echo "--------------------------------------------------------------------"

for port in 80 3000; do
    if sudo lsof -i :$port > /dev/null 2>&1; then
        PROCESS=$(sudo lsof -i :$port | tail -n +2 | head -1 | awk '{print $1 " (PID: " $2 ")"}')
        echo "   Port $port: IN USE by $PROCESS"
    else
        echo -e "   ${GREEN}✓${NC} Port $port: FREE"
    fi
done

echo ""

# =================================================================
# 4. PM2 STATUS
# =================================================================
echo "4️⃣  PM2 Application Status"
echo "--------------------------------------------------------------------"

if command -v pm2 &> /dev/null; then
    echo -e "   ${GREEN}✓${NC} PM2 installed ($(pm2 --version))"
    
    # Check if app is running
    if pm2 list | grep -q "aymen-api"; then
        APP_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name | contains("aymen")) | "\(.name): \(.pm2_env.status) (PID: \(.pid), Port: \(.pm2_env.PORT // "not set"))"' | head -1)
        echo "   App Status: $APP_STATUS"
        
        # Check if port matches .env
        PM2_PORT=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name | contains("aymen")) | .pm2_env.PORT' | head -1)
        if [ "$PM2_PORT" != "$PORT" ] && [ "$PORT" != "not set" ]; then
            echo -e "   ${YELLOW}⚠${NC}  Port mismatch: PM2=$PM2_PORT, .env=$PORT"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "   ${YELLOW}⚠${NC}  No aymen-api instance running"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "   ${RED}✗${NC} PM2 not installed"
    ISSUES=$((ISSUES + 1))
fi

echo ""

# =================================================================
# 5. APPLICATION BUILD
# =================================================================
echo "5️⃣  Application Build Status"
echo "--------------------------------------------------------------------"

if [ -d "dist" ]; then
    echo -e "   ${GREEN}✓${NC} dist/ directory exists"
    DIST_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
    echo "   Build size: $DIST_SIZE"
    
    # Check if dist/index.js exists
    if [ -f "dist/index.js" ]; then
        echo -e "   ${GREEN}✓${NC} dist/index.js exists"
    else
        echo -e "   ${RED}✗${NC} dist/index.js missing"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "   ${RED}✗${NC} dist/ directory missing - app not built"
    ISSUES=$((ISSUES + 1))
fi

if [ -d "node_modules" ]; then
    echo -e "   ${GREEN}✓${NC} node_modules exists"
else
    echo -e "   ${RED}✗${NC} node_modules missing"
    ISSUES=$((ISSUES + 1))
fi

echo ""

# =================================================================
# 6. DEPLOYMENT SCRIPTS ANALYSIS
# =================================================================
echo "6️⃣  Deployment Scripts"
echo "--------------------------------------------------------------------"

SCRIPTS=(
    "scripts/deploy.sh:Main deployment script"
    "scripts/apache-reverse-proxy-setup.sh:Apache proxy setup"
    "scripts/diagnose-port-issue.sh:Port diagnostic"
    "scripts/health-check.sh:Health monitoring"
    "scripts/pm2-setup.sh:PM2 initialization"
    "scripts/pm2-monitor.sh:PM2 monitoring"
    "scripts/backup-db.sh:Database backup"
    "scripts/rollback.sh:Rollback utility"
)

for script_info in "${SCRIPTS[@]}"; do
    IFS=':' read -r script_path desc <<< "$script_info"
    if [ -f "$script_path" ]; then
        if [ -x "$script_path" ]; then
            echo -e "   ${GREEN}✓${NC} $desc ($script_path)"
        else
            echo -e "   ${YELLOW}⚠${NC}  $desc - not executable ($script_path)"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo "   ℹ️  $desc - missing ($script_path)"
    fi
done

echo ""

# =================================================================
# 7. DATABASE CONNECTION
# =================================================================
echo "7️⃣  Database Connection"
echo "--------------------------------------------------------------------"

if [ -f ".env.production" ]; then
    source .env.production 2>/dev/null
    
    if mysql -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u "${DB_USER}" -p"${DB_PASSWORD}" -e "SELECT 1;" &>/dev/null 2>&1; then
        echo -e "   ${GREEN}✓${NC} Database connection successful"
        
        # Check if database exists
        if mysql -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u "${DB_USER}" -p"${DB_PASSWORD}" -e "USE ${DB_NAME};" &>/dev/null 2>&1; then
            echo -e "   ${GREEN}✓${NC} Database '${DB_NAME}' exists"
        else
            echo -e "   ${RED}✗${NC} Database '${DB_NAME}' does not exist"
            ISSUES=$((ISSUES + 1))
        fi
    else
        echo -e "   ${RED}✗${NC} Cannot connect to database"
        ISSUES=$((ISSUES + 1))
    fi
fi

echo ""

# =================================================================
# 8. ACCESSIBILITY TEST
# =================================================================
echo "8️⃣  Application Accessibility"
echo "--------------------------------------------------------------------"

# Test port 80
echo "   Testing port 80..."
RESPONSE_80=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/health 2>/dev/null || echo "000")
if [ "$RESPONSE_80" = "200" ]; then
    echo -e "   ${GREEN}✓${NC} Port 80: Accessible (HTTP $RESPONSE_80)"
else
    SERVER_80=$(curl -s -I http://localhost:80 2>/dev/null | head -n 1 || echo "No response")
    if echo "$SERVER_80" | grep -q "Apache"; then
        echo -e "   ${YELLOW}⚠${NC}  Port 80: Apache default page (needs proxy config)"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "   ${RED}✗${NC} Port 80: Not accessible (HTTP $RESPONSE_80)"
        ISSUES=$((ISSUES + 1))
    fi
fi

# Test port 3000
echo "   Testing port 3000..."
RESPONSE_3000=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$RESPONSE_3000" = "200" ]; then
    echo -e "   ${GREEN}✓${NC} Port 3000: Accessible (HTTP $RESPONSE_3000)"
else
    echo -e "   ${YELLOW}⚠${NC}  Port 3000: Not accessible (HTTP $RESPONSE_3000)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# =================================================================
# SUMMARY & RECOMMENDATIONS
# =================================================================
echo "===================================================================="
echo "📊 SUMMARY"
echo "===================================================================="
echo ""
echo "Issues Found: $ISSUES"
echo "Warnings: $WARNINGS"
echo ""

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Everything looks good!${NC}"
    exit 0
fi

echo "===================================================================="
echo "💡 RECOMMENDATIONS"
echo "===================================================================="
echo ""

# Recommendation logic
if systemctl is-active --quiet apache2 2>/dev/null && [ ! -f "/etc/apache2/sites-available/aymen-api.conf" ]; then
    echo "🔧 PRIMARY ISSUE: Apache is blocking port 80"
    echo ""
    echo "SOLUTION: Configure Apache as reverse proxy"
    echo "  1. Run: sudo bash scripts/apache-reverse-proxy-setup.sh"
    echo "  2. Update .env.production: PORT=3000"
    echo "  3. Update ecosystem.config.js: env_production.PORT = 3000"
    echo "  4. Restart: pm2 restart aymen-api --update-env"
    echo ""
fi

if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
    echo "🔨 Build Required"
    echo "  Run: npm run build"
    echo ""
fi

if ! pm2 list | grep -q "aymen-api"; then
    echo "🚀 Start Application"
    echo "  Run: pm2 start ecosystem.config.js --env production"
    echo "  Then: pm2 save"
    echo ""
fi

if [ $WARNINGS -gt 0 ]; then
    echo "⚠️  Review warnings above and fix configuration mismatches"
    echo ""
fi

echo "===================================================================="
echo "📝 QUICK START DEPLOYMENT GUIDE"
echo "===================================================================="
echo ""
echo "If starting fresh, run these commands in order:"
echo ""
echo "1. Install dependencies:"
echo "   npm ci --production=false"
echo ""
echo "2. Build application:"
echo "   npm run build"
echo ""
echo "3. Run database migrations:"
echo "   npm run migrate:latest"
echo ""
echo "4. Setup Apache reverse proxy:"
echo "   sudo bash scripts/apache-reverse-proxy-setup.sh"
echo ""
echo "5. Start with PM2:"
echo "   pm2 start ecosystem.config.js --env production"
echo "   pm2 save"
echo ""
echo "6. Verify deployment:"
echo "   curl http://localhost/health"
echo ""

exit $ISSUE
