# Complete Deployment Guide for binb

This guide covers all deployment options for binb.

## Deployment Options

### 1. Docker Production (Recommended)

**Best for**: Production deployments, easy scaling, isolated environment

```bash
# Create environment file
cp .env.example .env
# Edit .env with your settings

# Start services
docker-compose up --build -d # or npm run docker:prod:up

# View logs
docker-compose logs -f # or npm run docker:prod:logs
```

**Features**:
- ✅ Admin system setup
- ✅ Health checks
- ✅ Persistent data

### 2. Docker Development

**Best for**: Development, testing, quick iteration

```bash
# Start with hot reload
docker-compose -f docker-compose.local.yml up --build # or npm run docker:local
```

**Features**:
- ✅ Build app locally
- ✅ Volume mounts

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

# 5. Setup admin
npm run admin:setup

# 6. Start server
npm start
```

**Requirements**:
- Node.js 20+
- Redis 6+

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

## Post-Deployment Setup

### Create Admin User

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
