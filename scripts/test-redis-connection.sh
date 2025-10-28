#!/bin/sh

# Test script to verify Redis connection

if nc -z -w2 $REDIS_HOST $REDIS_PORT; then
    echo "✅ Redis connection successful!"
    exit 0
else
    echo "❌ Redis connection failed"
    echo "   Host: $REDIS_HOST"
    echo "   Port: $REDIS_PORT"
    echo "   Check if Redis is running and accessible"
    exit 1
fi
