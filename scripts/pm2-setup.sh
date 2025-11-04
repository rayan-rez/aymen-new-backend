#!/bin/bash

echo "🔧 Setting up PM2 on server..."
echo "================================"

# Install PM2 globally (if not already installed)
echo "📦 Installing PM2..."
npm install -g pm2

# Setup PM2 startup script
echo "🚀 Setting up PM2 startup..."
pm2 startup

# Create log directory
echo "📁 Creating log directory..."
mkdir -p logs

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads

# Set correct permissions
echo "🔐 Setting permissions..."
chmod 755 logs uploads

# Install PM2 log rotation module
echo "📋 Installing PM2 log rotation..."
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true

echo "✅ PM2 setup completed!"
echo "================================"
echo "Next steps:"
echo "1. Copy your .env file to the server"
echo "2. Run: pm2 start ecosystem.config.js --env production"
echo "3. Run: pm2 save"
