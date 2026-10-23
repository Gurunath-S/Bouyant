#!/usr/bin/env bash
set -e

# Resolve project root regardless of where the command is invoked from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKUP_DIR="$ROOT_DIR/backups"
mkdir -p "$BACKUP_DIR"

# Clean, human-friendly date format: YYYY-MM-DD_HH-MM-AM/PM (e.g., 2026-10-23_09-35-AM)
TIMESTAMP=$(date +"%Y-%m-%d_%I-%M-%p")

SQL_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
DUMP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.dump"

echo "📦 Backing up database 'buoyant_media'..."

# 1. Plain text SQL backup
pg_dump -U guru -d buoyant_media --clean --if-exists -f "$SQL_FILE"
echo "  ✓ Created SQL backup:  backups/backup_${TIMESTAMP}.sql"

# 2. Compressed Custom dump backup
pg_dump -U guru -d buoyant_media -Fc -f "$DUMP_FILE"
echo "  ✓ Created Dump backup: backups/backup_${TIMESTAMP}.dump"

echo "✅ All backups created successfully!"
