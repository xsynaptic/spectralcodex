#!/bin/bash

# Remember to make this script executable: `chmod +x deploy.sh`
# Instead of a password you'll need to set up SSH keys with the remote

# Load environment variables from .env file
source .env
REMOTE_HOST=$REMOTE_HOST
REMOTE_USERNAME=$REMOTE_USERNAME
REMOTE_PATH=$REMOTE_PATH
REMOTE_EXCLUDE_BASE=$REMOTE_EXCLUDE_BASE
REMOTE_SSH_KEY_PATH=$REMOTE_SSH_KEY_PATH

# Check if required environment variables are set
if [[ -z $REMOTE_HOST || -z $REMOTE_USERNAME || -z $REMOTE_PATH || -z $REMOTE_EXCLUDE_BASE || -z $REMOTE_SSH_KEY_PATH ]]; then
  echo "Error: Missing environment variables; check your .env file."
  exit 1
fi

# Sync build output with the primary web server
rsync -avz --delete-after -e "ssh -i $REMOTE_SSH_KEY_PATH" --exclude="$REMOTE_EXCLUDE_BASE/*.gif" --exclude="$REMOTE_EXCLUDE_BASE/*.jpg" --exclude="$REMOTE_EXCLUDE_BASE/*.jpeg" --exclude="$REMOTE_EXCLUDE_BASE/*.png" --exclude="$REMOTE_EXCLUDE_BASE/*.webp" dist/ ${REMOTE_USERNAME}@${REMOTE_HOST}:${REMOTE_PATH}

if [ $? -eq 0 ]; then
  echo "Deployment completed successfully!"
else
  echo "Deployment failed"
fi
