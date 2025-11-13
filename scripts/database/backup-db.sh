#!/bin/bash

echo "💾 Creating Database Backup..."
echo "================================"

# Load environment variables
source .env

# Create backup directory
BACKUP_DIR="backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/aymen_db_$(date +%Y%m%d_%H%M%S).sql"

# Create backup
echo "Creating backup: $BACKUP_FILE"
mysqldump -h "$DB_HOST" \
          -P "$DB_PORT" \
          -u "$DB_USER" \
          -p"$DB_PASSWORD" \
          "$DB_NAME" > "$BACKUP_FILE"

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_FILE"

echo "✅ Backup created: ${BACKUP_FILE}.gz"
echo "================================"

# Optional: Upload to S3 or cloud storage
# aws s3 cp "${BACKUP_FILE}.gz" s3://your-bucket/backups/
