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
- Imports initial data if none exists
- Sets up admin system
- Starts the application

**Used by**: Docker CMD instruction
**Features**:
- Robust Redis connectivity checking
- Smart data import (only when needed)
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
- `setup`: Create admin metadata for existing rooms and promote first user
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

### `validate-docker.sh`
Docker configuration validation.

**Purpose**: 
- Validate Docker setup
- Check required files
- Verify script permissions
- Test Dockerfile and docker-compose syntax

```bash
# Validate Docker setup
./scripts/validate-docker.sh

# Or with npm
npm run docker:validate
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
├── Calls: npm run import-data
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

## File Permissions

All shell scripts should be executable:
```bash
chmod +x scripts/*.sh
```

The Dockerfile automatically sets correct permissions for:
- `/app/healthcheck.sh`
- `/app/docker-entrypoint.sh`

## Error Handling

### Docker Scripts
- **Graceful failures**: Continue operation when non-critical operations fail
- **Signal handling**: Proper cleanup on container termination
- **Timeout handling**: Avoid infinite waits for external services

### Admin Scripts  
- **Connection errors**: Clear error messages for Redis connectivity issues
- **Data validation**: Check data integrity before operations
- **User feedback**: Informative success/error messages

## Debugging

### Enable Debug Mode
```bash
# For shell scripts
set -x

# For Node.js scripts  
export DEBUG=binb:*
```

### Common Issues

1. **Permission denied**:
   ```bash
   chmod +x scripts/script-name.sh
   ```

2. **Redis connection failed**:
   ```bash
   # Check Redis status
   redis-cli ping
   docker logs binb-redis
   ```

3. **Script not found in container**:
   ```bash
   # Verify script was copied
   docker exec -it binb-app ls -la /app/scripts/
   ```

## Development

### Adding New Scripts

1. Create script in `scripts/` directory
2. Add shebang line (`#!/bin/bash` or `#!/usr/bin/env node`)
3. Make executable: `chmod +x scripts/new-script.sh`
4. Update this README
5. Add to package.json scripts if needed
6. Update Dockerfile if script needs to be in container

### Testing Scripts

```bash
# Test individual scripts
./scripts/test-setup.js
./scripts/validate-docker.sh

# Test in Docker environment
docker build -t binb:test .
docker run --rm binb:test node scripts/test-setup.js
```

## Security Considerations

- Scripts handle sensitive Redis data
- Use environment variables for secrets
- Avoid logging sensitive information
- Validate input parameters
- Use secure file permissions

## Integration with CI/CD

These scripts are designed to work in automated environments:

```yaml
# Example GitHub Actions
- name: Validate Docker setup
  run: npm run docker:validate

- name: Test application setup  
  run: |
    docker-compose up -d
    docker exec binb-app npm run test:setup
```