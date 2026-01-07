#!/bin/bash
set -euo pipefail

# Backup Umami PostgreSQL database
# Run on VPS or via SSH

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$SCRIPT_DIR/.env" ]]; then
	source "$SCRIPT_DIR/.env"
fi

BACKUP_DIR="${UMAMI_DATA_PATH:-/mnt/storage/data/umami}/../backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/umami_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

if ! docker ps -q -f "name=^umami-db$" | grep -q .; then
	echo "Error: umami-db container not running" >&2
	exit 1
fi

if docker exec umami-db pg_dump -U umami umami | gzip > "$BACKUP_FILE"; then
	echo "Backup complete: $BACKUP_FILE"
else
	echo "Error: backup failed" >&2
	rm -f "$BACKUP_FILE"
	exit 1
fi

# Keep last 7 daily backups
find "$BACKUP_DIR" -name "umami_*.sql.gz" -mtime +7 -delete
