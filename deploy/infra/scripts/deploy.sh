#!/bin/bash
# Deploy shared infra: root Caddyfile, Umami, Docker Compose services
# Site-specific Caddy and image server live in deploy/site/scripts/deploy.sh
set -euo pipefail

# Load deploy/.env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="$(cd "$INFRA_DIR/.." && pwd)"

if [ -f "$DEPLOY_DIR/.env" ]; then
  source "$DEPLOY_DIR/.env"
fi

REMOTE_HOST="${DEPLOY_REMOTE_HOST:?DEPLOY_REMOTE_HOST is required in deploy/.env}"
SSH_KEY="${DEPLOY_SSH_KEY_PATH:-}"
REMOTE_PATH="${DEPLOY_REMOTE_PATH:-/opt/server}"

SSH_OPTS=""
if [ -n "$SSH_KEY" ]; then
  SSH_OPTS="-i $SSH_KEY"
fi

echo "=== Deploy infrastructure ==="
echo "Target: $REMOTE_HOST:$REMOTE_PATH"
echo ""

# Build the server-side .env with only what docker-compose needs
echo "Preparing server environment..."
TEMP_ENV=$(mktemp)
trap 'rm -f "$TEMP_ENV"' EXIT
cat > "$TEMP_ENV" <<EOF
UMAMI_DATA_PATH=${UMAMI_DATA_PATH}
UMAMI_BACKUP_PATH=${UMAMI_BACKUP_PATH}
UMAMI_DB_PASSWORD=${UMAMI_DB_PASSWORD}
UMAMI_APP_SECRET=${UMAMI_APP_SECRET}
EOF

# Sync infra files
echo "Syncing infra files..."
rsync -avz ${SSH_KEY:+-e "ssh -i $SSH_KEY"} \
  --exclude='.git' \
  --exclude='*.example' \
  --exclude='scripts/' \
  "$INFRA_DIR/docker-compose.yml" \
  "$INFRA_DIR/caddy" \
  "$INFRA_DIR/umami-db-backup" \
  "$REMOTE_HOST:$REMOTE_PATH/"

# Push the server .env
echo "Writing server environment..."
rsync -avz ${SSH_KEY:+-e "ssh -i $SSH_KEY"} "$TEMP_ENV" "$REMOTE_HOST:$REMOTE_PATH/.env"

# Pull, build, recreate, wait for healthchecks
echo "Restarting services..."
ssh $SSH_OPTS "$REMOTE_HOST" "cd $REMOTE_PATH && docker compose pull && docker compose build && docker compose up -d --force-recreate --remove-orphans --wait --wait-timeout 60"

echo ""
echo "Verifying service state..."
PS_OUTPUT=$(ssh $SSH_OPTS "$REMOTE_HOST" "cd $REMOTE_PATH && docker compose ps")
echo "$PS_OUTPUT"

# Fail loud on non-Up or unhealthy/restarting services
if echo "$PS_OUTPUT" | tail -n +2 | grep -Ev '\bUp\b' | grep -q .; then
  echo "ERROR: one or more services not in 'Up' state"
  exit 1
fi
if echo "$PS_OUTPUT" | grep -E '\(unhealthy\)|Exit|Restarting'; then
  echo "ERROR: one or more services unhealthy or restarting"
  exit 1
fi

echo ""
echo "Done"
