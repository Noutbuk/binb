# Local Development Setup

This guide shows how to run binb in a simplified local development environment where Redis runs in Docker but the main application runs locally with Node.js.

## Prerequisites

- Node.js >= 10.0.0 (Note: Node.js v18-20 recommended for best compatibility)
- Docker and Docker Compose
- npm
- System dependencies for canvas module (see Troubleshooting section)

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Redis in Docker**:
   ```bash
   npm run local:redis
   ```

3. **Copy and configure environment variables**:
   ```bash
   cp .env.local .env
   # Edit .env if needed - defaults should work for local development
   ```

4. **Start the application locally**:
   ```bash
   npm run local:start
   ```

5. **Access the application**:
   - Main app: http://localhost:8138
   - Admin panel: http://localhost:8138/admin (after creating an admin user)

## Available Commands

### Redis Management
- `npm run local:redis` - Start Redis container
- `npm run local:redis-stop` - Stop Redis container  
- `npm run local:redis-logs` - View Redis logs

### Application
- `npm run local:start` - Start app locally (with .env.local config)
- `npm run dev` - Start app in development mode
- `npm run start` - Start app normally

### Data Management
- `npm run import-data` - Import sample song data
- `npm run admin:setup` - Set up admin system
- `npm run admin:list` - List all users
- `npm run admin:promote <username>` - Promote user to admin

### Assets
- `npm run minify` - Minify JavaScript files

## First Time Setup

1. Follow the Quick Start steps above
2. Open http://localhost:8138 and create a user account
3. Run `npm run admin:setup` to promote the first user to admin
4. (Optional) Run `npm run import-data` to load sample music data
5. Visit http://localhost:8138/admin to access the admin panel

## Environment Variables

The `.env.local` file contains:
- `REDIS_URL=redis://localhost:6379` - Redis connection (Docker container)
- `PORT=8138` - Application port
- `NODE_ENV=development` - Environment mode
- `SESSION_SECRET=local-dev-secret-change-in-production` - Session secret

## Troubleshooting

### Redis Connection Issues
- Ensure Redis container is running: `npm run local:redis`
- Check Redis logs: `npm run local:redis-logs`
- Verify Redis is accessible: `redis-cli ping` (if redis-cli is installed locally)

### Port Conflicts
- If port 8138 is in use, change `PORT` in `.env`
- If port 6379 is in use, modify `docker-compose.local.yml`

### Missing Dependencies
- Run `npm install` to ensure all dependencies are installed
- For canvas/image processing issues, install system dependencies as needed

## Docker Alternative

If you prefer to run everything in Docker, use:
- `npm run docker:dev` - Full Docker development environment
- `npm run docker:stop` - Stop Docker containers