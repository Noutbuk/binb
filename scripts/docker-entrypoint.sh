#!/bin/sh

# Docker entrypoint script for binb
# Handles initialization and startup sequence

set -e

echo "🎵 Starting binb application..."

# Function to extract Redis host and port from REDIS_URL
parse_redis_url() {
    if [ -z "$REDIS_URL" ]; then
        echo "❌ REDIS_URL environment variable is not set"
        exit 1
    fi
    
    # Extract host and port from redis://host:port format
    # Remove redis:// prefix
    local url_without_protocol="${REDIS_URL#redis://}"
    
    # Extract host and port
    if echo "$url_without_protocol" | grep -q ':'; then
        REDIS_HOST=$(echo "$url_without_protocol" | cut -d':' -f1)
        REDIS_PORT=$(echo "$url_without_protocol" | cut -d':' -f2 | cut -d'/' -f1)
    else
        REDIS_HOST="$url_without_protocol"
        REDIS_PORT="6379"
    fi
    
    echo "📡 Parsed Redis connection: $REDIS_HOST:$REDIS_PORT"
}

# Function to wait for Redis
wait_for_redis() {
    echo "⏳ Waiting for Redis..."
    local max_attempts=30
    local attempt=1
    
    # Parse Redis URL to get host and port
    parse_redis_url
    
    while [ $attempt -le $max_attempts ]; do
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
            echo "✅ Redis is ready!"
            return 0
        fi
        
        echo "⏳ Redis not ready, attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Redis failed to become ready after $max_attempts attempts"
    exit 1
}


# Function to setup admin system
setup_admin_system() {
    echo "👑 Setting up admin system..."
    
    if node scripts/setup-admin.js setup; then
        echo "✅ Admin system setup completed"
    else
        echo "⚠️  Admin setup failed, but continuing..."
    fi
}

# Main execution
main() {
    # Wait for Redis to be available
    wait_for_redis
    
    # Setup admin system
    setup_admin_system
    
    echo "🚀 Starting binb server..."
    exec npm start
}

# Handle termination signals gracefully
trap 'echo "🛑 Received termination signal, shutting down..."; exit 0' TERM INT

# Run main function
main "$@"