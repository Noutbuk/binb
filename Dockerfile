# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-slim AS base

# NodeJS app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install redis-tools for Redis connectivity checks (needed for both dev and prod)
RUN apt-get update && apt-get install -y --no-install-recommends \
    redis-tools \
   fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y python3 pkg-config build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install node modules
COPY --link package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --link public/js ./public/js

# Build the application
RUN npm run minify

# Final stage for app image
FROM base

COPY --link scripts /app/scripts
# Make scripts executable
RUN chmod +x /app/scripts/*.sh
COPY --link public/css /app/public/css
COPY --link public/img /app/public/img
COPY --link public/fonts /app/public/fonts
COPY --link lib /app/lib
COPY --link routes /app/routes
COPY --link views /app/views
COPY --link app.js /app/app.js
COPY --link redis-config.js /app/redis-config.js

# Copy built application
COPY --link --from=build /app /app

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /app/healthcheck.sh

# Expose port
EXPOSE 8138

# Start the server
CMD ["/app/scripts/docker-entrypoint.sh"]
