#!/bin/bash

# Fix Typesense Service Configuration
echo "🔧 Fixing Typesense Service..."

# Check if typesense is installed
if [ ! -f "/opt/typesense/typesense-server" ]; then
    echo "❌ Typesense binary not found at /opt/typesense/typesense-server"
    echo "Please install Typesense first"
    exit 1
fi

# Create data directory
sudo mkdir -p /var/lib/typesense
sudo chown -R $USER:$USER /var/lib/typesense

# Create log directory
sudo mkdir -p /var/log/typesense
sudo chown -R $USER:$USER /var/log/typesense

# Generate API key if not exists
if [ ! -f "/etc/typesense/api-key" ]; then
    sudo mkdir -p /etc/typesense
    echo "$(openssl rand -base64 32)" | sudo tee /etc/typesense/api-key > /dev/null
    sudo chmod 600 /etc/typesense/api-key
fi

API_KEY=$(sudo cat /etc/typesense/api-key)

# Create systemd service file
cat << EOF | sudo tee /etc/systemd/system/typesense.service
[Unit]
Description=Typesense Search Engine
Documentation=https://typesense.org/docs/
After=network.target

[Service]
Type=simple
User=$USER
Group=$USER
ExecStart=/opt/typesense/typesense-server \\
  --data-dir=/var/lib/typesense \\
  --api-key=$API_KEY \\
  --api-port=8108 \\
  --enable-cors
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/typesense/typesense.log
StandardError=append:/var/log/typesense/typesense-error.log

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Systemd service file created"

# Reload systemd
sudo systemctl daemon-reload

# Start Typesense
sudo systemctl start typesense

# Enable on boot
sudo systemctl enable typesense

# Wait a moment for service to start
sleep 2

# Check status
sudo systemctl status typesense --no-pager

echo ""
echo "🔑 Your Typesense API Key:"
echo "$API_KEY"
echo ""
echo "Add this to your .env.development file:"
echo "TYPESENSE_API_KEY=$API_KEY"
echo "TYPESENSE_HOST=localhost"
echo "TYPESENSE_PORT=8108"
echo "TYPESENSE_PROTOCOL=http"