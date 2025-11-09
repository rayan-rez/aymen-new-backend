#!/bin/bash
# Automated Test Environment Setup
# Run with: bash setup-tests.sh

set -e  # Exit on error

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║     Test Environment Setup for Database Helpers      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.test exists
echo "📋 Step 1: Checking .env.test file..."
if [ ! -f ".env.test" ]; then
    echo -e "${YELLOW}⚠️  .env.test not found. Creating from template...${NC}"
    
    cat > .env.test << 'EOF'
# Test Environment Configuration
NODE_ENV=test

# Database Configuration (Main)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=aymen_db_test

# Legacy Database Configuration
OLD_DB_HOST=127.0.0.1
OLD_DB_PORT=3306
OLD_DB_USER=root
OLD_DB_PASSWORD=
OLD_DB_NAME=aymen-database

# Test Settings
SUPPRESS_TEST_LOGS=false
EOF
    
    echo -e "${GREEN}✅ Created .env.test${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env.test and add your MySQL password!${NC}"
    echo ""
    read -p "Press Enter after you've edited .env.test with your MySQL password..."
else
    echo -e "${GREEN}✅ .env.test found${NC}"
fi

# Load environment variables
source .env.test 2>/dev/null || true

# Check MySQL is running
echo ""
echo "🔌 Step 2: Checking MySQL/MariaDB service..."
if systemctl is-active --quiet mysql || systemctl is-active --quiet mariadb; then
    echo -e "${GREEN}✅ MySQL/MariaDB is running${NC}"
else
    echo -e "${YELLOW}⚠️  MySQL/MariaDB not running. Attempting to start...${NC}"
    sudo systemctl start mysql 2>/dev/null || sudo systemctl start mariadb 2>/dev/null || {
        echo -e "${RED}❌ Failed to start MySQL/MariaDB${NC}"
        echo "   Please start it manually: sudo systemctl start mysql"
        exit 1
    }
    echo -e "${GREEN}✅ Started MySQL/MariaDB${NC}"
fi

# Test MySQL connection
echo ""
echo "🔑 Step 3: Testing MySQL connection..."
if mysql -h 127.0.0.1 -u root -p"${DB_PASSWORD}" -e "SELECT 1;" &>/dev/null; then
    echo -e "${GREEN}✅ MySQL connection successful${NC}"
else
    echo -e "${RED}❌ MySQL connection failed${NC}"
    echo "   Check your password in .env.test"
    echo "   Try manually: mysql -u root -p"
    exit 1
fi

# Create test database
echo ""
echo "🗄️  Step 4: Creating test database..."
mysql -h 127.0.0.1 -u root -p"${DB_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};" || {
    echo -e "${RED}❌ Failed to create database${NC}"
    exit 1
}
echo -e "${GREEN}✅ Database '${DB_NAME}' ready${NC}"

# Grant permissions
echo ""
echo "🔐 Step 5: Setting permissions..."
mysql -h 127.0.0.1 -u root -p"${DB_PASSWORD}" -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;" || {
    echo -e "${YELLOW}⚠️  Could not grant permissions (might already exist)${NC}"
}
echo -e "${GREEN}✅ Permissions configured${NC}"

# Test database connection
echo ""
echo "🧪 Step 6: Testing database connection..."
mysql -h 127.0.0.1 -u root -p"${DB_PASSWORD}" "${DB_NAME}" -e "SELECT 'Connection OK' as status;" || {
    echo -e "${RED}❌ Database connection test failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Database connection test passed${NC}"

# Install dependencies if needed
echo ""
echo "📦 Step 7: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Create test connection script
echo ""
echo "📝 Step 8: Creating connection test script..."
cat > test-connection.js << 'EOF'
require('dotenv').config({ path: '.env.test' });
const knex = require('knex');

console.log('Testing database connection...');
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`Port: ${process.env.DB_PORT}`);
console.log(`User: ${process.env.DB_USER}`);
console.log(`Database: ${process.env.DB_NAME}`);

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  }
});

db.raw('SELECT 1 as test')
  .then(() => {
    console.log('✅ Connection successful!');
    return db.destroy();
  })
  .then(() => {
    console.log('✅ Connection closed');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    db.destroy();
    process.exit(1);
  });
EOF

node test-connection.js || {
    echo -e "${RED}❌ Node.js connection test failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Node.js connection test passed${NC}"

# Summary
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                  ✅ Setup Complete!                   ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "You can now run tests with:"
echo "  ${GREEN}npm test${NC}"
echo ""
echo "Or run database helpers tests specifically:"
echo "  ${GREEN}npm test database-helpers.test.ts${NC}"
echo ""
echo "Configuration summary:"
echo "  • Database: ${DB_NAME}"
echo "  • Host: ${DB_HOST}:${DB_PORT}"
echo "  • User: ${DB_USER}"
echo ""
echo "If tests fail, check:"
echo "  1. MySQL is running: sudo systemctl status mysql"
echo "  2. Password is correct in .env.test"
echo "  3. Database exists: mysql -u root -p -e 'SHOW DATABASES;'"
echo ""