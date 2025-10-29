#!/bin/bash

echo "🔧 Fixing Docker setup and migrations..."

# Step 1: Stop and remove everything
echo "📦 Stopping containers..."
docker compose down -v

# Step 2: Rebuild without cache to get the updated knexfile
echo "🏗️  Rebuilding Docker image (no cache)..."
docker compose build --no-cache

# Step 3: Start containers
echo "🚀 Starting containers..."
docker compose up -d

# Step 4: Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be healthy..."
sleep 10

# Step 5: Verify knexfile in container
echo "📋 Checking knexfile.js in container..."
docker exec aymen-backend cat knexfile.js | grep -A 5 "production:"

# Step 6: Reset migration tracking tables
echo "🗑️  Resetting migration tracking tables..."
docker exec -i aymen-mysql mysql -uroot -proot aymen_db << EOF
DROP TABLE IF EXISTS knex_migrations;
DROP TABLE IF EXISTS knex_migrations_lock;
EOF

# Step 7: Run migrations
echo "🔄 Running migrations..."
docker exec aymen-backend npm run migrate:latest

# Step 8: Verify migrations
echo "✅ Verifying migrations..."
docker exec -i aymen-mysql mysql -uroot -proot aymen_db -e "SELECT * FROM knex_migrations;"

echo "✨ Done! Check the output above for any errors."