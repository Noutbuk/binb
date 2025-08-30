# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-slim as base

# NodeJS app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install redis-tools for Redis connectivity checks (needed for both dev and prod)
RUN apt-get update && apt-get install -y --no-install-recommends \
    redis-tools \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y python3 pkg-config build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install node modules
COPY --link package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --link . .

# Build the application
RUN npm run minify

# Final stage for app image
FROM base

# Install additional runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=build /app /app

# Add Docker scripts
ADD scripts/healthcheck.sh /app/healthcheck.sh
ADD scripts/docker-entrypoint.sh /app/docker-entrypoint.sh

# Make scripts executable
RUN chmod +x /app/healthcheck.sh /app/docker-entrypoint.sh

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /app/healthcheck.sh

# Expose port
EXPOSE 8138

# Start the server
CMD ["/app/docker-entrypoint.sh"]
