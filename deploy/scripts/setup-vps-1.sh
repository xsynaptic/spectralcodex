#!/bin/bash
set -e

# Phase 1: Root setup - Security hardening and deploy user creation
#
# Run as root on a fresh DigitalOcean Docker droplet:
#   scp setup-vps-1.sh root@<ip>:/root/
#   ssh root@<ip>
#   chmod +x setup-vps-1.sh && ./setup-vps-1.sh

DEPLOY_USER="deploy"

if [ "$EUID" -ne 0 ]; then
  echo "Error: This script must be run as root"
  echo "Usage: sudo ./setup-vps-1.sh"
  exit 1
fi

echo "=== Phase 1: Security Hardening (as root) ==="
echo ""

# Update system
echo "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

# Install essential security tools
echo "Installing fail2ban..."
apt-get install -y -qq fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Close Docker remote API ports (security risk if exposed)
echo "Configuring firewall..."
ufw deny 2375 >/dev/null 2>&1 || true
ufw deny 2376 >/dev/null 2>&1 || true
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Create deploy user if doesn't exist
if ! id "$DEPLOY_USER" &>/dev/null; then
  echo "Creating deploy user..."
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"

  # Allow sudo without password for deploy user
  echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$DEPLOY_USER
  chmod 440 /etc/sudoers.d/$DEPLOY_USER

  # Copy SSH authorized_keys from root to deploy user
  mkdir -p /home/$DEPLOY_USER/.ssh
  cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/
  chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
  chmod 700 /home/$DEPLOY_USER/.ssh
  chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys

  echo "Deploy user created with your SSH key"
else
  echo "Deploy user already exists"
fi

# Copy phase 2 script to deploy user's home if it exists
if [ -f "setup-vps-2.sh" ]; then
  cp setup-vps-2.sh /home/$DEPLOY_USER/
  chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/setup-vps-2.sh
  chmod +x /home/$DEPLOY_USER/setup-vps-2.sh
  echo "Copied setup-vps-2.sh to /home/$DEPLOY_USER/"
fi

echo ""
echo "=== Phase 1 Complete ==="
echo ""
echo "Next steps:"
echo "  1. Log out: exit"
echo "  2. SSH as deploy user: ssh $DEPLOY_USER@$(hostname -I | awk '{print $1}')"
echo "  3. Run: ./setup-vps-2.sh"
echo ""
