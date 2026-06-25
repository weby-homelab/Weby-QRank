#!/bin/bash
set -e

echo "🚀 Starting Weby-QRank installation..."

# Check for docker and docker compose
if ! command -v docker &> /dev/null; then
    echo "❌ Error: docker is not installed. Please install docker first."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Error: docker compose is not installed. Please install docker compose first."
    exit 1
fi

# Check if we are inside the repo or need to clone
if [ ! -d ".git" ]; then
    echo "📂 Cloning repository..."
    git clone https://github.com/weby-homelab/Weby-QRank.git .
fi

echo "🐳 Starting services with Docker Compose..."
docker compose up -d

echo "✅ Installation complete!"
echo "🚀 Services are running in the background."
echo "🌐 Check your configured ports to access the services."
