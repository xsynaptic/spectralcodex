#!/bin/bash
set -e

# Phase 2: Deploy user setup (server directories)
#
# Run as deploy user after setup-vps-1.sh:
#   ssh deploy@<ip>
#   ./setup-vps-2.sh

DEPLOY_USER="deploy"

if [ "$EUID" -eq 0 ]; then
  echo "Error: Do not run this script as root"
  exit 1
fi

echo "=== Phase 2: Server Setup (as $USER) ==="
echo ""

# Create server directories
echo "Creating directories..."
sudo mkdir -p /opt/server/caddy
sudo mkdir -p /opt/server/certs
sudo install -d -m 755 /srv/spectralcodex
sudo install -d -o $USER -g $USER /srv/spectralcodex/img /srv/umami /srv/umami/data /srv/umami/backups

# Set permissions
echo "Setting permissions..."
sudo chown -R $USER:$USER /opt/server

# Generate Umami secrets for local deploy/.env
# The server .env is owned by `pnpm deploy-infra`, which overwrites on every deploy, so we only emit secrets to copy locally
echo "Generating Umami secrets..."
echo ""
echo "IMPORTANT: Copy these into your local deploy/.env"
echo "DEPLOY_MEDIA_PATH=/srv/spectralcodex"
echo "UMAMI_DATA_PATH=/srv/umami/data"
echo "UMAMI_BACKUP_PATH=/srv/umami/backups"
echo "UMAMI_DB_PASSWORD=$(openssl rand -hex 32)"
echo "UMAMI_APP_SECRET=$(openssl rand -hex 32)"

# Revokes the grant setup-vps-1.sh wrote; needs sudo itself, so no sudo command may follow it
echo ""
echo "Removing provisioning sudo grant..."
sudo rm -f /etc/sudoers.d/$DEPLOY_USER

echo ""
echo "=== Phase 2 Complete ==="
echo ""
echo "Next steps:"
echo "  1. Copy the secrets above into local deploy/.env"
echo "  2. Deploy: pnpm deploy-infra"
