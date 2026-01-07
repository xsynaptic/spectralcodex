#!/bin/bash
set -e

# Phase 1: Root setup - Security hardening and deploy user creation
#
# Run as root on a fresh DigitalOcean Docker droplet:
#   scp scripts/setup-vps-*.sh root@<ip>:/root/
#   ssh root@<ip>
#   chmod +x setup-vps-*.sh && ./setup-vps-1.sh

DEPLOY_USER="deploy"

if [ "$EUID" -ne 0 ]; then
  echo "Error: This script must be run as root"
  exit 1
fi

echo "=== Phase 1: Security Hardening (as root) ==="
echo ""

echo "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

echo "Installing fail2ban..."
apt-get install -y -qq fail2ban
systemctl enable fail2ban
systemctl start fail2ban

echo "Configuring firewall..."
ufw deny 2375 >/dev/null 2>&1 || true
ufw deny 2376 >/dev/null 2>&1 || true
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

if ! id "$DEPLOY_USER" &>/dev/null; then
  echo "Creating deploy user..."
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"

  echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$DEPLOY_USER
  chmod 440 /etc/sudoers.d/$DEPLOY_USER

  mkdir -p /home/$DEPLOY_USER/.ssh
  cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/
  chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
  chmod 700 /home/$DEPLOY_USER/.ssh
  chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys

  echo "Deploy user created with your SSH key"
else
  echo "Deploy user already exists"
fi

if [ -f "setup-vps-2.sh" ]; then
  cp setup-vps-2.sh /home/$DEPLOY_USER/
  chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/setup-vps-2.sh
  chmod +x /home/$DEPLOY_USER/setup-vps-2.sh
fi

echo ""
echo "=== Phase 1 Complete ==="
echo ""
echo "Next steps:"
echo "  1. Log out: exit"
echo "  2. SSH as deploy user: ssh $DEPLOY_USER@$(hostname -I | awk '{print $1}')"
echo "  3. Run: ./setup-vps-2.sh"
