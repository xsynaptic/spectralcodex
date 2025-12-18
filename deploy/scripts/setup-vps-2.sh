#!/bin/bash
set -e

# Phase 2: Deploy user setup - Storage and application directories
#
# Run as deploy user after setup-vps-1.sh:
#   ssh deploy@<ip>
#   ./setup-vps-2.sh

DEPLOY_USER="deploy"

if [ "$EUID" -eq 0 ]; then
  echo "Error: Do not run this script as root"
  echo "Usage: ./setup-vps-2.sh (as deploy user)"
  exit 1
fi

echo "=== Phase 2: Application Setup (as $USER) ==="
echo ""

# Verify we're the deploy user
if [ "$USER" != "$DEPLOY_USER" ]; then
  echo "Warning: Running as $USER instead of $DEPLOY_USER"
  echo "This should work, but $DEPLOY_USER is recommended"
  echo ""
fi

# Check for storage volume
if [ ! -d "/mnt" ]; then
  echo "Error: /mnt directory not found"
  exit 1
fi

# Find attached volume (DigitalOcean names them like volume_sfo3_01)
# Note: DO uses underscores in volume names, not hyphens
VOLUME_PATH=$(find /mnt -maxdepth 1 -type d -name "volume_*" 2>/dev/null | head -1)

if [ -z "$VOLUME_PATH" ]; then
  echo "Warning: No DigitalOcean volume found in /mnt"
  echo "Please attach a storage volume in the DO console and re-run"
  echo ""
  echo "Alternatively, create /mnt/storage manually"
  exit 1
fi

echo "Found volume: $VOLUME_PATH"
STORAGE_PATH="$VOLUME_PATH"

# Create symlink for consistency (optional, for convenience)
if [ ! -L "/mnt/storage" ] && [ ! -d "/mnt/storage" ]; then
  sudo ln -s "$VOLUME_PATH" /mnt/storage
  echo "Created symlink: /mnt/storage -> $VOLUME_PATH"
fi

# Create directory structure on the actual volume
echo "Creating directories..."
sudo mkdir -p "$STORAGE_PATH"/{media,cache/ipx,www,data/umami,backups}
sudo mkdir -p /opt/server

# Set permissions for deploy user
# Note: Use /* to set ownership inside mount point, not the mount point itself
echo "Setting permissions..."
sudo chown -R $USER:$USER "$STORAGE_PATH"/*
sudo chown -R $USER:$USER /opt/server

# Generate secrets and create .env file
echo "Creating /opt/server/.env..."
if [ -f /opt/server/.env ]; then
  echo "Warning: /opt/server/.env already exists, not overwriting"
  echo "Current contents:"
  cat /opt/server/.env
else
  cat > /opt/server/.env << EOF
STORAGE_PATH=$STORAGE_PATH
UMAMI_DB_PASSWORD=$(openssl rand -hex 32)
UMAMI_APP_SECRET=$(openssl rand -hex 32)
EOF
  echo "Created /opt/server/.env with generated secrets"
fi

echo ""
echo "=== Phase 2 Complete ==="
echo ""
echo "Storage path: $STORAGE_PATH"
echo ""
echo "Next steps:"
echo "  1. From local machine, deploy server configs:"
echo "     ./deploy/scripts/deploy.sh"
echo ""
echo "  2. Start services on VPS:"
echo "     cd /opt/server && docker compose up -d"
echo ""
