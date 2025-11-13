#!/bin/bash
# Verify test setup and configuration

echo "🔍 Verifying Test Setup..."
echo "================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

ERRORS=0

# Check .env.test
echo -n "Checking .env.test file... "
if [ -f ".env.test" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  .env.test file not found!"
    ERRORS=$((ERRORS + 1))
fi

# Check database connection
echo -n "Checking database connection... "
source .env.test 2>/dev/null
if mysql -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" -p"${DB_PASSWORD}" -e "SELECT 1;" &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Cannot connect to database!"
    ERRORS=$((ERRORS + 1))
fi

# Check if test database exists
echo -n "Checking test database... "
if mysql -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" -p"${DB_PASSWORD}" -e "USE ${DB_NAME:-aymen_test};" &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Test database does not exist!"
    echo "  Run: npm run db:setup:test"
    ERRORS=$((ERRORS + 1))
fi

# Check node_modules
echo -n "Checking dependencies... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  node_modules not found!"
    echo "  Run: npm install"
    ERRORS=$((ERRORS + 1))
fi

# Check test files
echo -n "Checking test files... "
if [ -f "__tests__/unit/database-helpers.test.ts" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Test file not found!"
    ERRORS=$((ERRORS + 1))
fi

# Check setup files
echo -n "Checking setup files... "
SETUP_OK=true
[ -f "__tests__/setup.ts" ] || SETUP_OK=false
[ -f "__tests__/global-setup.ts" ] || SETUP_OK=false
[ -f "__tests__/global-teardown.ts" ] || SETUP_OK=false

if [ "$SETUP_OK" = true ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Setup files missing!"
    ERRORS=$((ERRORS + 1))
fi

echo "================================"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "You can run tests with:"
    echo "  npm test"
    exit 0
else
    echo -e "${RED}❌ $ERRORS check(s) failed!${NC}"
    echo ""
    echo "Please fix the issues above before running tests."
    exit 1
fi