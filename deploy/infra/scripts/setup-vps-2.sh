#!/bin/bash
set -e

# Phase 2: Deploy user setup - Shared infrastructure directories
#
# Run as deploy user after setup-vps-1.sh:
#   ssh deploy@<ip>
#   ./setup-vps-2.sh

DEPLOY_USER="deploy"

if [ "$EUID" -eq 0 ]; then
  echo "Error: Do not run this script as root"
  exit 1
fi

echo "=== Phase 2: Shared Infrastructure Setup (as $USER) ==="
echo ""

# Find attached volume
VOLUME_PATH=$(find /mnt -maxdepth 1 -type d -name "volume_*" 2>/dev/null | head -1)

if [ -z "$VOLUME_PATH" ]; then
  echo "Error: No DigitalOcean volume found in /mnt"
  echo "Please attach a storage volume in the DO console and re-run"
  exit 1
fi

echo "Found volume: $VOLUME_PATH"

# Create shared infrastructure directories
echo "Creating directories..."
sudo mkdir -p /opt/server/caddy/sites
sudo mkdir -p /opt/server/certs
sudo mkdir -p "$VOLUME_PATH/data/umami"
sudo mkdir -p "$VOLUME_PATH/backups"

# Set permissions
echo "Setting permissions..."
sudo chown -R $USER:$USER /opt/server
sudo chown -R $USER:$USER "$VOLUME_PATH/data"
sudo chown -R $USER:$USER "$VOLUME_PATH/backups"

# Generate .env file
echo "Creating /opt/server/.env..."
if [ -f /opt/server/.env ]; then
  echo "Warning: /opt/server/.env already exists"
  cat /opt/server/.env
else
  cat > /opt/server/.env << EOF
UMAMI_DATA_PATH=$VOLUME_PATH/data/umami

UMAMI_DB_PASSWORD=$(openssl rand -hex 32)
UMAMI_APP_SECRET=$(openssl rand -hex 32)
EOF
  echo "Created /opt/server/.env with generated secrets"
  echo ""
  echo "IMPORTANT: Copy these values to your local astro-infra/.env"
  cat /opt/server/.env
fi

echo ""
echo "=== Phase 2 Complete ==="
echo ""
echo "Next steps:"
echo "  1. Copy the secrets above to local astro-infra/.env"
echo "  2. Deploy astro-infra: cd astro-infra && ./scripts/deploy.sh"
echo "  3. Deploy projects (each project creates its own directories)"
