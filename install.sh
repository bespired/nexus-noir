#!/bin/bash
# init.sh - bootstrap local environment

ENV_FILE="./backend/.env.docker"

if [ -f "$ENV_FILE" ]; then
    echo "$ENV_FILE already exists, skipping..."
else
    echo "Creating $ENV_FILE from example..."
    cp ./backend/.env.example "$ENV_FILE"

    echo "$ENV_FILE created."
fi

# Create storage symbolic link for Laravel (using relative path for Docker compatibility)
echo "Creating storage symbolic link..."
if [ -d "./backend/public" ]; then
    cd backend/public
    ln -sf ../storage/app/public storage 2>/dev/null || echo "Note: Storage link may already exist"
    cd ../..
    echo "Storage link created (relative path for Docker)"
else
    echo "Note: Run 'cd backend/public && ln -sf ../storage/app/public storage' after setting up Laravel"
fi

# Create symlinks for backup and electron
echo "Creating symlinks for backup and electron..."
ln -sf ../backup ./backend/backup
ln -sf ../electron ./backend/electron
echo "Symlinks for backup and electron created."

echo "You can now run: docker compose up -d"