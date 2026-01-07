#!/bin/bash
set -euo pipefail

# Load environment from deploy/.env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="$(cd "$INFRA_DIR/.." && pwd)"

if [ -f "$DEPLOY_DIR/.env" ]; then
  source "$DEPLOY_DIR/.env"
fi

REMOTE_HOST="${DEPLOY_REMOTE_HOST:?DEPLOY_REMOTE_HOST is required in deploy/.env}"
SSH_KEY="${DEPLOY_SSH_KEY_PATH:?DEPLOY_SSH_KEY_PATH is required in deploy/.env}"
REMOTE_PATH="${DEPLOY_REMOTE_PATH:-/opt/server}"

echo "=== Deploy infrastructure ==="
echo "Target: $REMOTE_HOST:$REMOTE_PATH"
echo ""

# Create server-side .env with only what docker-compose needs
echo "Preparing server environment..."
SERVER_ENV=$(cat <<EOF
# Umami analytics data path
UMAMI_DATA_PATH=${UMAMI_DATA_PATH}

# Umami secrets
UMAMI_DB_PASSWORD=${UMAMI_DB_PASSWORD}
UMAMI_APP_SECRET=${UMAMI_APP_SECRET}
EOF
)

# Sync infrastructure files
echo "Syncing infrastructure files..."
rsync -avz -e "ssh -i $SSH_KEY" \
  --exclude='.git' \
  --exclude='*.example' \
  --exclude='scripts/' \
  "$INFRA_DIR/docker-compose.yml" \
  "$INFRA_DIR/caddy" \
  "$REMOTE_HOST:$REMOTE_PATH/"

# Write server-side .env
echo "Writing server environment..."
ssh -i "$SSH_KEY" "$REMOTE_HOST" "cat > $REMOTE_PATH/.env << 'ENVEOF'
$SERVER_ENV
ENVEOF"

# Restart services
echo "Restarting services..."
ssh -i "$SSH_KEY" "$REMOTE_HOST" "cd $REMOTE_PATH && docker compose up -d"

echo ""
echo "Done! Check status:"
echo "  ssh -i $SSH_KEY $REMOTE_HOST 'docker compose -f $REMOTE_PATH/docker-compose.yml ps'"
