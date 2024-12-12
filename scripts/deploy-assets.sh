#!/bin/bash

# Remember to make this script executable: `chmod +x deploy-assets.sh`
# Instead of a password you'll need to set up SSH keys with the remote

# Load environment variables from .env file
source .env
ASSETS_HOST=$ASSETS_HOST
ASSETS_USERNAME=$ASSETS_USERNAME
ASSETS_PATH=$ASSETS_PATH
ASSETS_SOURCE=$ASSETS_SOURCE
ASSETS_SSH_KEY_PATH=$ASSETS_SSH_KEY_PATH

# Check if required environment variables are set
if [[ -z $ASSETS_HOST || -z $ASSETS_USERNAME || -z $ASSETS_PATH || -z $ASSETS_SOURCE || -z $ASSETS_SSH_KEY_PATH ]]; then
  echo "Error: Missing environment variables; check your .env file."
  exit 1
fi

echo "Deploying assets from ${ASSETS_SOURCE} to ${ASSETS_HOST}:${ASSETS_PATH}"

# Sync image assets to static web hosting
rsync -avr --delete-after -e "ssh -i $ASSETS_SSH_KEY_PATH" --checksum --include='*.gif' --include='*.jpg' --include='*.jpeg' --include='*.png' --include='*.webp' --exclude='*' ${ASSETS_SOURCE} ${ASSETS_USERNAME}@${ASSETS_HOST}:${ASSETS_PATH}

if [ $? -eq 0 ]; then
  echo "Deployment completed successfully!"
else
  echo "Deployment failed"
fi
