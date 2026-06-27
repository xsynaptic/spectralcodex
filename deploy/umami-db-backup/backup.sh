#!/bin/sh
set -eu

TS=$(date +%Y%m%d_%H%M%S)
OUT="/backups/umami_${TS}.sql.gz"

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
	-h "$POSTGRES_HOST" \
	-U "$POSTGRES_USER" \
	"$POSTGRES_DB" \
	| gzip > "$OUT"

find /backups -maxdepth 1 -name 'umami_*.sql.gz' -mtime +10 -delete

echo "$(date -Iseconds) backup -> $OUT ($(stat -c%s "$OUT") bytes)"
