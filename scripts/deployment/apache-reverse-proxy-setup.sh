#!/bin/bash

###############################################################################
# Apache Reverse Proxy Setup for Node.js App
# This configures Apache to forward requests to your PM2 application
###############################################################################

set -e

echo "🔧 Setting up Apache Reverse Proxy..."
echo "================================"

# Enable required Apache modules
echo "📦 Enabling Apache modules..."
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo a2enmod ssl
sudo a2enmod rewrite

# Create Apache virtual host configuration
echo "📝 Creating Apache virtual host configuration..."

VHOST_FILE="/etc/apache2/sites-available/aymen-api.conf"

sudo tee "$VHOST_FILE" > /dev/null <<'EOF'
<VirtualHost *:80>
    ServerName backendnew.aymenpromotion-dz.com
    ServerAdmin admin@aymenpromotion-dz.com

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/aymen-api-error.log
    CustomLog ${APACHE_LOG_DIR}/aymen-api-access.log combined

    # Proxy settings
    ProxyPreserveHost On
    ProxyPass / http://localhost:8080/
    ProxyPassReverse / http://localhost:8080/

    # WebSocket support (if needed)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://localhost:8080/$1 [P,L]

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"

    # Allow encoded slashes
    AllowEncodedSlashes NoDecode

    # File upload size limits
    LimitRequestBody 10485760

    <Proxy *>
        Order deny,allow
        Allow from all
    </Proxy>
</VirtualHost>

# SSL Configuration (if you have certificates)
# <VirtualHost *:443>
#     ServerName backendnew.aymenpromotion-dz.com
#     
#     SSLEngine on
#     SSLCertificateFile /path/to/cert.pem
#     SSLCertificateKeyFile /path/to/key.pem
#     
#     ProxyPreserveHost On
#     ProxyPass / http://localhost:8080/
#     ProxyPassReverse / http://localhost:8080/
#     
#     ErrorLog ${APACHE_LOG_DIR}/aymen-api-ssl-error.log
#     CustomLog ${APACHE_LOG_DIR}/aymen-api-ssl-access.log combined
# </VirtualHost>
EOF

echo "✅ Virtual host configuration created"

# Disable default Apache site
echo "🚫 Disabling default Apache site..."
sudo a2dissite 000-default.conf

# Enable the new site
echo "✅ Enabling aymen-api site..."
sudo a2ensite aymen-api.conf

# Test Apache configuration
echo "🔍 Testing Apache configuration..."
sudo apache2ctl configtest

# Restart Apache
echo "🔄 Restarting Apache..."
sudo systemctl restart apache2

echo ""
echo "================================"
echo "✅ Apache reverse proxy setup complete!"
echo ""
