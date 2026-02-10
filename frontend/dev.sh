#!/bin/bash
# Try to load NVM (locations vary by OS, this covers most)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Use version 20
nvm use 20

# Run the actual dev command
npm run vite
