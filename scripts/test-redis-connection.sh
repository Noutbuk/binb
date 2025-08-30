#!/bin/bash

# Test script to verify Redis connection setup

echo "🧪 Testing Redis connection configuration..."

# Test 1: Check if redis-cli is available
if command -v redis-cli &> /dev/null; then
    echo "✅ redis-cli is available"
else
    echo "❌ redis-cli not found - check if redis-tools is installed"
    exit 1
fi

# Test 2: Check REDIS_URL parsing
if [ -z "$REDIS_URL" ]; then
    echo "⚠️  REDIS_URL not set, using default: redis://localhost:6379"
    export REDIS_URL="redis://localhost:6379"
fi

echo "📡 REDIS_URL: $REDIS_URL"

# Parse Redis URL
url_without_protocol="${REDIS_URL#redis://}"
if echo "$url_without_protocol" | grep -q ":"; then
    REDIS_HOST=$(echo "$url_without_protocol" | cut -d":" -f1)
    REDIS_PORT=$(echo "$url_without_protocol" | cut -d":" -f2 | cut -d"/" -f1)
else
    REDIS_HOST="$url_without_protocol"
    REDIS_PORT="6379"
fi

echo "🔍 Parsed connection: $REDIS_HOST:$REDIS_PORT"

# Test 3: Try to connect to Redis
echo "🔌 Testing Redis connection..."
if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
    echo "✅ Redis connection successful!"
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info server | head -5
else
    echo "❌ Redis connection failed"
    echo "   Host: $REDIS_HOST"
    echo "   Port: $REDIS_PORT"
    echo "   Check if Redis is running and accessible"
    exit 1
fi

echo "🎉 All Redis connection tests passed!"