#!/bin/bash
# init.sh - bootstrap local environment

ENV_FILE="./backend/.env.docker"

if [ -f "$ENV_FILE" ]; then
    echo "$ENV_FILE already exists, skipping..."
else
    echo "Creating $ENV_FILE from example..."
    cp ./backend/.env.example "$ENV_FILE"

    # Configure for Docker environment
    sed -i '' 's/DB_CONNECTION=sqlite/DB_CONNECTION=mysql/g' "$ENV_FILE"
    sed -i '' 's/# DB_HOST=127.0.0.1/DB_HOST=mysql/g' "$ENV_FILE"
    sed -i '' 's/# DB_PORT=3306/DB_PORT=3306/g' "$ENV_FILE"
    sed -i '' 's/# DB_DATABASE=nexus_noir/DB_DATABASE=nexus_noir/g' "$ENV_FILE"
    sed -i '' 's/# DB_USERNAME=root/DB_USERNAME=user/g' "$ENV_FILE"
    sed -i '' 's/# DB_PASSWORD=/DB_PASSWORD=password/g' "$ENV_FILE"
    
    sed -i '' 's/REDIS_HOST=127.0.0.1/REDIS_HOST=redis/g' "$ENV_FILE"
    
    sed -i '' 's/MAIL_MAILER=log/MAIL_MAILER=smtp/g' "$ENV_FILE"
    sed -i '' 's/MAIL_HOST=127.0.0.1/MAIL_HOST=mailpit/g' "$ENV_FILE"
    sed -i '' 's/MAIL_PORT=2525/MAIL_PORT=1025/g' "$ENV_FILE"

    echo "$ENV_FILE created and configured for Docker."
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