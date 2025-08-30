#!/bin/bash

# Docker setup script for binb

set -e

echo "🎵 Setting up binb with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your settings."
fi

# Determine which environment to run
ENV=${1:-production}

if [ "$ENV" = "dev" ] || [ "$ENV" = "development" ]; then
    echo "🚀 Starting binb in development mode..."
    docker-compose -f docker-compose.dev.yml up --build
elif [ "$ENV" = "prod" ] || [ "$ENV" = "production" ]; then
    echo "🚀 Starting binb in production mode..."
    docker-compose up --build -d
    echo "✅ binb is running in production mode!"
    echo "📱 Access the game at: http://localhost:8138"
    echo "🔧 Admin panel at: http://localhost:8138/admin"
    echo ""
    echo "📊 To view logs: docker-compose logs -f"
    echo "🛑 To stop: docker-compose down"
else
    echo "Usage: $0 [dev|prod]"
    echo "  dev  - Start in development mode (with hot reload)"
    echo "  prod - Start in production mode (detached)"
    exit 1
fi