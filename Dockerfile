# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-slim as base

# NodeJS app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV=production


# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq

# RUN apt-get update -qq && \
#     apt-get install -y python-is-python3 pkg-config build-essential 

# Install node modules
COPY --link package.json .
RUN npm install --production=false

# Copy application code
COPY --link . .

# Remove development dependencies
RUN npm prune --production


# Final stage for app image
FROM base

RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=build /app /app

RUN npm run minify

# Start the server by default, this can be overwritten at runtime
# CMD [ "npm", "run", "start" ]
CMD npm run import-data; npm run start
