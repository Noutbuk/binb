# Docker Deployment Guide for binb

This guide covers deploying binb using Docker and Docker Compose.

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/noutbuk/binb.git
   cd binb
   ```

2. **Run setup script**:
   ```bash
   # For production
   ./scripts/docker-setup.sh prod
   
   # For development
   ./scripts/docker-setup.sh dev
   ```

3. **Access the application**:
   - Game: http://localhost:8138
   - Admin Panel: http://localhost:8138/admin

## Manual Setup

### Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+

### Environment Configuration

1. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file**:
   ```env
   NODE_ENV=production
   SITE_SECRET=your-very-secure-secret-key
   REDIS_URL=redis://redis:6379
   ```

### Production Deployment

```bash
# Build and start services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Development Deployment

```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Stop
docker-compose -f docker-compose.dev.yml down
```

## Services

### Application Container (`binb-app`)
- **Image**: Custom built from Dockerfile
- **Port**: 8138
- **Environment**: Node.js application with admin system
- **Features**:
  - Automatic data import on first run
  - Admin system setup
  - Health checks
  - Graceful startup with Redis dependency

### Redis Container (`binb-redis`)
- **Image**: redis:7-alpine
- **Port**: 6379
- **Persistence**: Redis data persisted to named volume
- **Configuration**: 
  - AOF persistence enabled
  - Memory limit: 512MB
  - LRU eviction policy

## Container Features

### Health Checks
- **App**: HTTP check on port 8138
- **Redis**: Redis PING command
- **Startup time**: 60s grace period for app initialization

### Automatic Setup
- **Data Import**: Imports sample tracks on first run
- **Admin Setup**: Creates admin user metadata
- **Smart Detection**: Skips import if data already exists

### Persistence
- **Redis Data**: Stored in `redis_data` volume
- **Configuration**: Environment-based configuration

## Administration

### Creating Admin Users

```bash
# Access the running container
docker exec -it binb-app bash

# Run admin setup
node scripts/setup-admin.js setup

# List users
node scripts/setup-admin.js list

# Promote user to admin
node scripts/setup-admin.js promote username
```

### Managing Data

```bash
# Import fresh data
docker exec -it binb-app npm run import-data

# Access Redis CLI
docker exec -it binb-redis redis-cli

# Backup Redis data
docker exec binb-redis redis-cli BGSAVE
```

## Scaling and Production

### Resource Requirements
- **Minimum**: 1 CPU, 1GB RAM
- **Recommended**: 2 CPU, 2GB RAM
- **Storage**: 1GB for application, 512MB for Redis

### Production Optimizations

1. **Use external Redis** for better performance:
   ```yaml
   environment:
     - REDIS_URL=redis://your-redis-server:6379
   ```

2. **Add nginx reverse proxy** (commented in docker-compose.yml):
   ```bash
   # Uncomment nginx service in docker-compose.yml
   # Add SSL certificates to ./ssl/
   # Configure nginx.conf
   ```

3. **Environment Variables**:
   ```env
   NODE_ENV=production
   SITE_SECRET=very-secure-random-string
   ```

### Monitoring

```bash
# View container status
docker-compose ps

# Check logs
docker-compose logs app
docker-compose logs redis

# Monitor resource usage
docker stats binb-app binb-redis

# Health check status
docker inspect binb-app | grep Health -A 10
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Change port in docker-compose.yml
   ports:
     - "8139:8138"  # Use different external port
   ```

2. **Redis connection failed**:
   ```bash
   # Check Redis container
   docker logs binb-redis
   
   # Verify network connectivity
   docker exec binb-app ping redis
   ```

3. **Import fails**:
   ```bash
   # Manual import
   docker exec -it binb-app npm run import-data
   
   # Check available memory
   docker stats binb-redis
   ```

4. **Admin panel not accessible**:
   ```bash
   # Check if admin user exists
   docker exec -it binb-app node scripts/setup-admin.js list
   
   # Create admin user
   docker exec -it binb-app node scripts/setup-admin.js setup
   ```

### Logs and Debugging

```bash
# Application logs
docker-compose logs -f app

# Redis logs
docker-compose logs -f redis

# Container shell access
docker exec -it binb-app bash

# Check file permissions
docker exec binb-app ls -la /app
```

## Development

### Hot Reload Development

```bash
# Start with volume mounts for development
docker-compose -f docker-compose.dev.yml up

# Code changes are reflected immediately
# Redis data persists between restarts
```

### Building Custom Images

```bash
# Build production image
docker build -t binb:latest .

# Build development image
docker build --target build -t binb:dev .

# Multi-architecture build
docker buildx build --platform linux/amd64,linux/arm64 -t binb:latest .
```

## Updates and Maintenance

### Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up --build -d

# Clean up old images
docker image prune -f
```

### Backup and Restore

```bash
# Backup Redis data
docker run --rm -v binb_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .

# Restore Redis data
docker run --rm -v binb_redis_data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup.tar.gz -C /data
```

## Security

### Production Security Checklist

- [ ] Use strong `SITE_SECRET`
- [ ] Configure firewall to limit port access
- [ ] Use HTTPS with reverse proxy
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Backup Redis data regularly

### Network Security

```yaml
# Use custom networks (already configured)
networks:
  binb-network:
    driver: bridge
```

This setup provides a complete, production-ready deployment of binb with the new admin system.