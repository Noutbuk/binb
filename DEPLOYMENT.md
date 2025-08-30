# Complete Deployment Guide for binb

This guide covers all deployment options for binb with the new admin system.

## Quick Start (Docker - Recommended)

```bash
# 1. Clone and navigate
git clone https://github.com/noutbuk/binb.git
cd binb

# 2. Quick production start
./scripts/docker-setup.sh prod

# 3. Access the application
# Game: http://localhost:8138
# Admin: http://localhost:8138/admin
```

## Deployment Options

### 1. Docker Production (Recommended)

**Best for**: Production deployments, easy scaling, isolated environment

```bash
# Create environment file
cp .env.example .env
# Edit .env with your settings

# Start services
docker-compose up --build -d

# Verify setup
docker exec -it binb-app node scripts/test-setup.js

# View logs
docker-compose logs -f
```

**Features**:
- ✅ Automatic data import
- ✅ Admin system setup
- ✅ Health checks
- ✅ Persistent data
- ✅ Production optimized

### 2. Docker Development

**Best for**: Development, testing, quick iteration

```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Code changes reflected immediately
# Data persists between restarts
```

**Features**:
- ✅ Hot reload
- ✅ Volume mounts
- ✅ Development tools
- ✅ Easy debugging

### 3. Manual Installation

**Best for**: Custom environments, existing infrastructure

```bash
# 1. Install dependencies
npm install

# 2. Start Redis
redis-server

# 3. Set environment
export REDIS_URL=redis://localhost:6379
export SITE_SECRET=your-secret-key

# 4. Build and import
npm run minify
npm run import-data

# 5. Setup admin
npm run admin:setup

# 6. Start server
npm start
```

**Requirements**:
- Node.js 18+
- Redis 6+
- Build tools (for canvas)

## Configuration

### Environment Variables

```env
# Required
NODE_ENV=production
SITE_SECRET=your-very-secure-secret-key-here
REDIS_URL=redis://localhost:6379

# Optional
PORT=8138
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@yourdomain.com
```

### Redis Configuration

```bash
# Production Redis settings
redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru --appendonly yes
```

## Post-Deployment Setup

### 1. Verify Installation

```bash
# Test the setup
node scripts/test-setup.js

# Or with Docker
docker exec -it binb-app node scripts/test-setup.js
```

### 2. Create Admin User

```bash
# Setup admin system
npm run admin:setup

# List users
npm run admin:list

# Promote existing user
npm run admin:promote username

# With Docker
docker exec -it binb-app npm run admin:setup
```

### 3. Import Additional Data

```bash
# Re-import data
npm run import-data

# With Docker
docker exec -it binb-app npm run import-data
```

## Admin System Usage

### Accessing Admin Panel

1. **Login** as an admin user at `/login`
2. **Navigate** to `/admin` or click "Admin Panel"
3. **Manage** rooms and songs through the interface

### Creating Rooms

1. Go to **Admin Dashboard** → **Create New Room**
2. Enter room name (alphanumeric, hyphens, underscores)
3. Add description and set active status
4. Click **Create Room**

### Managing Songs

1. **Individual songs**: Search Apple Music and add
2. **Playlists**: Import entire Apple Music playlists
3. **Bulk operations**: Select multiple songs for actions

## Scaling and Production

### Resource Requirements

| Environment | CPU | RAM | Storage |
|-------------|-----|-----|---------|
| Development | 1 core | 1GB | 2GB |
| Small Production | 2 cores | 2GB | 5GB |
| Large Production | 4+ cores | 4GB+ | 10GB+ |

### Production Optimizations

1. **External Redis**:
   ```env
   REDIS_URL=redis://your-redis-cluster:6379
   ```

2. **Load Balancing**:
   ```yaml
   # docker-compose.yml
   app:
     deploy:
       replicas: 3
   ```

3. **Reverse Proxy** (nginx example):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       location / {
           proxy_pass http://localhost:8138;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### SSL/HTTPS Setup

```bash
# With Let's Encrypt
certbot --nginx -d yourdomain.com

# Or uncomment nginx service in docker-compose.yml
# Add certificates to ./ssl/ directory
```

## Monitoring and Maintenance

### Health Checks

```bash
# Application health
curl http://localhost:8138/

# Container health (Docker)
docker inspect binb-app | grep Health -A 10

# Redis health
docker exec binb-redis redis-cli ping
```

### Logging

```bash
# Application logs
docker-compose logs app

# Redis logs
docker-compose logs redis

# Follow logs
docker-compose logs -f
```

### Backup

```bash
# Backup Redis data
docker exec binb-redis redis-cli BGSAVE

# Export backup
docker run --rm -v binb_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .

# Restore backup
docker run --rm -v binb_redis_data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup.tar.gz -C /data
```

### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up --build -d

# Clean old images
docker image prune -f
```

## Troubleshooting

### Common Issues

1. **Port 8138 in use**:
   ```yaml
   ports:
     - "8139:8138"  # Use different external port
   ```

2. **Redis connection fails**:
   ```bash
   # Check Redis status
   docker logs binb-redis
   
   # Test connectivity
   docker exec binb-app ping redis
   ```

3. **Import fails**:
   ```bash
   # Check memory
   docker stats binb-redis
   
   # Manual import
   docker exec -it binb-app npm run import-data
   ```

4. **Admin panel not accessible**:
   ```bash
   # Check admin users
   docker exec -it binb-app npm run admin:list
   
   # Create admin
   docker exec -it binb-app npm run admin:setup
   ```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=binb:*

# Or with Docker
docker-compose -f docker-compose.dev.yml up
```

## Security Checklist

- [ ] Strong `SITE_SECRET` (32+ random characters)
- [ ] Firewall configured (only necessary ports open)
- [ ] HTTPS enabled (SSL certificates)
- [ ] Regular backups scheduled
- [ ] Monitor access logs
- [ ] Update dependencies regularly
- [ ] Admin access restricted to necessary users

## Performance Tuning

### Redis Optimization

```conf
# redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Node.js Optimization

```bash
# Production settings
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"
```

### Apple Music API

```javascript
// Rate limiting is handled automatically
// Adjust in lib/services/apple-music-importer.js if needed
```

## Support

### Getting Help

1. **Documentation**: Check ADMIN.md and DOCKER.md
2. **Issues**: Create GitHub issue with logs
3. **Debugging**: Use test script for diagnostics

### Providing Debug Info

```bash
# System info
node --version
docker --version
docker-compose --version

# Application test
node scripts/test-setup.js

# Container status
docker-compose ps
docker-compose logs app | tail -50
```

This guide provides everything needed for a successful binb deployment with the new admin system.