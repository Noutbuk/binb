# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Setup
```bash
npm install                    # Install dependencies
npm run minify                 # Minify JavaScript assets (required after JS changes)
npm run import-data           # Load sample tracks from Apple Music playlists into Redis
npm start                     # Start the application server (runs on port 8138)
```

### Prerequisites
- Redis server must be running before starting the application
- Node.js >=10.0.0 required

### Data Import
The `npm run import-data` command scrapes Apple Music playlists defined in `config.json` and populates Redis with track data. This must be run at least once before the game can function.

## Architecture

### Core Application Structure

**binb** is a realtime multiplayer music guessing game built with Node.js, Express, and WebSockets via Primus.

#### Main Components

- **app.js**: Express application entry point, sets up routes, sessions, and WebSocket server
- **lib/rooms.js**: Core game logic handling room management, game state, scoring, and player interactions
- **lib/sparks.js**: WebSocket connection management and real-time communication
- **config.json**: Game configuration defining rooms and their associated Apple Music playlists/artists

#### Data Layer

- **Redis**: Primary data store with two prefixed databases:
  - `songs:` prefix: Track metadata (artist, title, preview URLs, artwork)
  - `users:` prefix: User accounts, sessions, statistics, and bans
- **lib/redis-clients.js**: Redis client configuration and connection management

#### Game Flow

1. **Room Initialization**: Each room loads tracks from configured Apple Music playlists/artists
2. **Game Rounds**: 15 songs per game, 30-second guessing window per track
3. **Scoring System**: Points awarded for correct artist/title guesses, with bonus points for speed
4. **Real-time Updates**: All game state changes broadcast via WebSocket to connected players

#### Key Modules

- **lib/match.js**: Fuzzy string matching for player guesses against track/artist names
- **lib/user.js**: User authentication, registration, password management
- **lib/stats.js**: Player statistics tracking and leaderboards
- **routes/**: Express route handlers for web pages and user actions
- **util/load_with_complex_config.js**: Apple Music playlist scraper and data importer

#### Front-end

- **public/js/**: Client-side JavaScript handling WebSocket communication and game UI
- **views/**: Pug templates for web pages
- **public/css/**: Bootstrap-based styling

#### Security Features

- **lib/middleware/ban-handler.js**: IP-based banning system
- **lib/captcha.js**: CAPTCHA generation for user registration
- Session-based authentication with Redis storage

The application uses a room-based architecture where each room represents a different music category (e.g., "80er", "90er", "britpop") with its own set of tracks and independent game sessions.