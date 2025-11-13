#!/bin/bash

###############################################################################
# Typesense Installation Script
# Installs Typesense server on Ubuntu/Debian systems
# 
# Usage:
#   sudo bash scripts/typesense/install-typesense.sh
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🔍 Typesense Server Installation Script            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    echo -e "${RED}❌ Cannot detect OS. This script supports Ubuntu/Debian only.${NC}"
    exit 1
fi

echo -e "${BLUE}[1/7]${NC} Detected OS: $OS $VER"

# Update package list
echo -e "${BLUE}[2/7]${NC} Updating package list..."
apt-get update -qq

# Install dependencies
echo -e "${BLUE}[3/7]${NC} Installing dependencies..."
apt-get install -y curl wget gnupg2 ca-certificates lsb-release

# Download and install Typesense
echo -e "${BLUE}[4/7]${NC} Downloading Typesense..."

TYPESENSE_VERSION="27.1"
ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ]; then
    TYPESENSE_URL="https://dl.typesense.org/releases/${TYPESENSE_VERSION}/typesense-server-${TYPESENSE_VERSION}-amd64.deb"
elif [ "$ARCH" = "aarch64" ]; then
    TYPESENSE_URL="https://dl.typesense.org/releases/${TYPESENSE_VERSION}/typesense-server-${TYPESENSE_VERSION}-arm64.deb"
else
    echo -e "${RED}❌ Unsupported architecture: $ARCH${NC}"
    exit 1
fi

cd /tmp
wget -q "$TYPESENSE_URL" -O typesense-server.deb

echo -e "${BLUE}[5/7]${NC} Installing Typesense..."
dpkg -i typesense-server.deb
rm typesense-server.deb

# Create directories
echo -e "${BLUE}[6/7]${NC} Creating directories..."
mkdir -p /var/lib/typesense
mkdir -p /var/log/typesense
mkdir -p /etc/typesense

# Generate API key if not exists
if [ ! -f "/etc/typesense/api-key" ]; then
    echo -e "${BLUE}[7/7]${NC} Generating API key..."
    openssl rand -base64 32 > /etc/typesense/api-key
    chmod 600 /etc/typesense/api-key
    
    API_KEY=$(cat /etc/typesense/api-key)
    echo ""
    echo -e "${GREEN}✅ Generated Typesense API Key:${NC}"
    echo -e "${YELLOW}$API_KEY${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Save this key securely! Add it to your .env.production:${NC}"
    echo -e "TYPESENSE_API_KEY=$API_KEY"
    echo ""
else
    echo -e "${GREEN}✅ API key already exists at /etc/typesense/api-key${NC}"
    API_KEY=$(cat /etc/typesense/api-key)
fi

# Create systemd service
echo -e "${BLUE}Creating systemd service...${NC}"

cat > /etc/systemd/system/typesense.service <<EOF
[Unit]
Description=Typesense Search Engine
Documentation=https://typesense.org/docs/
After=network.target

[Service]
Type=simple
User=root
Group=root
ExecStart=/usr/bin/typesense-server \\
  --data-dir=/var/lib/typesense \\
  --api-key=$API_KEY \\
  --api-port=8108 \\
  --enable-cors
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/typesense/typesense.log
StandardError=append:/var/log/typesense/typesense-error.log
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Set permissions
chown -R root:root /var/lib/typesense
chown -R root:root /var/log/typesense
chmod 755 /var/lib/typesense
chmod 755 /var/log/typesense

# Reload systemd and start service
echo -e "${BLUE}Starting Typesense service...${NC}"
systemctl daemon-reload
systemctl enable typesense
systemctl start typesense

# Wait for service to start
sleep 3

# Check status
if systemctl is-active --quiet typesense; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           ✅ Typesense Installed Successfully!             ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${GREEN}✓${NC} Service Status: Running"
    echo -e "${GREEN}✓${NC} API Port: 8108"
    echo -e "${GREEN}✓${NC} Data Directory: /var/lib/typesense"
    echo -e "${GREEN}✓${NC} Log Directory: /var/log/typesense"
    echo ""
    echo "📝 Next Steps:"
    echo "1. Add API key to your .env.production file"
    echo "2. Configure firewall if needed: sudo ufw allow 8108"
    echo "3. Test connection: curl http://localhost:8108/health"
    echo "4. Initialize collections: npm run typesense:init"
    echo ""
    echo "🔧 Useful Commands:"
    echo "   systemctl status typesense    # Check status"
    echo "   systemctl restart typesense   # Restart service"
    echo "   journalctl -u typesense -f    # View logs"
    echo ""
else
    echo -e "${RED}❌ Typesense failed to start${NC}"
    echo "Check logs: journalctl -u typesense -xe"
    exit 1
fi