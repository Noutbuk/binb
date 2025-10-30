# Scripts Directory

This directory contains various utility and Docker-related scripts for the binb application.

## Docker Scripts

### `healthcheck.sh`
Health check script used by Docker to monitor application status.

**Purpose**: Verifies that the binb application is responding on port 8138
**Used by**: Docker HEALTHCHECK instruction
**Usage**: Automatically executed by Docker runtime

```bash
# Manual execution
./scripts/healthcheck.sh
```

### `docker-entrypoint.sh`
Main entry point script for Docker containers.

**Purpose**: 
- Waits for Redis to be available
- Sets up admin system
- Starts the application

**Used by**: Docker CMD instruction
**Features**:
- Robust Redis connectivity checking
- Graceful error handling
- Signal handling for clean shutdown

```bash
# Manual execution (in container)
./scripts/docker-entrypoint.sh
```

## Admin Scripts

### `setup-admin.js`
Admin system setup and user management.

**Purpose**: Initialize admin system and manage admin users
**Commands**:
- `setup`: Promote first user to admin
- `list`: List all users with their roles
- `promote <username>`: Promote a user to admin

```bash
# Setup admin system
node scripts/setup-admin.js setup

# List users
node scripts/setup-admin.js list

# Promote user
node scripts/setup-admin.js promote username
```

## Development Scripts

### `test-setup.js`
Comprehensive setup validation and diagnostics.

**Purpose**: 
- Test Redis connectivity
- Verify data integrity
- Check admin users
- Validate file structure
- Provide diagnostic information

```bash
# Run setup test
node scripts/test-setup.js

# Or with npm
npm run test:setup
```

### `docker-setup.sh`
One-command Docker deployment script.

**Purpose**: Simplify Docker deployment for development and production
**Modes**:
- `dev`: Development mode with hot reload
- `prod`: Production mode (detached)

```bash
# Development
./scripts/docker-setup.sh dev

# Production
./scripts/docker-setup.sh prod
```

## Script Dependencies

### Runtime Dependencies
- **Node.js**: Required for JavaScript scripts
- **Redis**: Required for data operations
- **Docker**: Required for container scripts
- **curl**: Required for health checks
- **redis-cli**: Required for Redis connectivity checks

### Script Relationships
```
docker-entrypoint.sh
├── Uses: redis-cli (connectivity check)
├── Calls: setup-admin.js
└── Calls: npm start

healthcheck.sh
└── Uses: curl (health check)

setup-admin.js
├── Connects to: Redis
└── Uses: lib/redis-clients.js

test-setup.js
├── Connects to: Redis  
└── Uses: lib/redis-clients.js
```
