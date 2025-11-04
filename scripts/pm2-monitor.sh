#!/bin/bash

echo "📊 PM2 Monitoring Dashboard"
echo "================================"
echo ""

# Display PM2 status
echo "🔍 Current Status:"
pm2 status

echo ""
echo "💾 Memory Usage:"
pm2 list | grep -E "memory|aymen-api"

echo ""
echo "🔄 Restart Count:"
pm2 jlist | jq '.[] | {name: .name, restarts: .pm2_env.restart_time}'

echo ""
echo "📈 Uptime:"
pm2 jlist | jq '.[] | {name: .name, uptime: .pm2_env.pm_uptime}'

echo ""
echo "================================"
echo "Commands:"
echo "  pm2 logs              - View all logs"
echo "  pm2 monit            - Live monitoring"
echo "  pm2 describe <app>   - Detailed info"
echo "  pm2 reload all       - Zero-downtime reload"
echo "  pm2 restart all      - Restart all apps"
