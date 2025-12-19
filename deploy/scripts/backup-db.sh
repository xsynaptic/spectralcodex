#!/bin/bash
set -euo pipefail

# Load environment
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$SCRIPT_DIR/.env" ]]; then
	source "$SCRIPT_DIR/.env"
fi

BACKUP_DIR="${STORAGE_PATH:-/mnt/storage}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/umami_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# Verify container is running
if ! docker ps -q -f "name=^umami-db$" | grep -q .; then
	echo "Error: umami-db container not running" >&2
	exit 1
fi

# Dump Umami PostgreSQL
if docker exec umami-db pg_dump -U umami umami | gzip > "$BACKUP_FILE"; then
	echo "Backup complete: $BACKUP_FILE"
else
	echo "Error: backup failed" >&2
	rm -f "$BACKUP_FILE"
	exit 1
fi

# Keep last 7 daily backups
find "$BACKUP_DIR" -name "umami_*.sql.gz" -mtime +7 -delete
