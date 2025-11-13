#!/bin/bash

echo "🏥 Running Health Checks..."
echo "================================"

# Check if app is running
APP_STATUS=$(pm2 jlist | jq '.[] | select(.name=="aymen-api-prod") | .pm2_env.status' -r)

if [ "$APP_STATUS" == "online" ]; then
    echo "✅ Application Status: ONLINE"
else
    echo "❌ Application Status: $APP_STATUS"
    exit 1
fi

# Check API health endpoint
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)

if [ "$HEALTH_CHECK" == "200" ]; then
    echo "✅ Health Endpoint: OK (200)"
else
    echo "❌ Health Endpoint: FAILED ($HEALTH_CHECK)"
    exit 1
fi

# Check memory usage
MEMORY=$(pm2 jlist | jq '.[] | select(.name=="aymen-api-prod") | .monit.memory' -r)
MEMORY_MB=$((MEMORY / 1024 / 1024))

echo "💾 Memory Usage: ${MEMORY_MB}MB"

if [ "$MEMORY_MB" -gt 900 ]; then
    echo "⚠️  Warning: High memory usage!"
fi

# Check CPU usage
CPU=$(pm2 jlist | jq '.[] | select(.name=="aymen-api-prod") | .monit.cpu' -r)
echo "⚡ CPU Usage: ${CPU}%"

if [ "$CPU" -gt 80 ]; then
    echo "⚠️  Warning: High CPU usage!"
fi

# Check uptime
UPTIME=$(pm2 jlist | jq '.[] | select(.name=="aymen-api-prod") | .pm2_env.pm_uptime' -r)
UPTIME_SEC=$(($(date +%s) - UPTIME / 1000))
UPTIME_HOURS=$((UPTIME_SEC / 3600))

echo "⏰ Uptime: ${UPTIME_HOURS} hours"

# Check restart count
RESTARTS=$(pm2 jlist | jq '.[] | select(.name=="aymen-api-prod") | .pm2_env.restart_time' -r)
echo "🔄 Restarts: $RESTARTS"

if [ "$RESTARTS" -gt 5 ]; then
    echo "⚠️  Warning: High restart count!"
fi

echo "================================"
echo "✅ All health checks passed!"
