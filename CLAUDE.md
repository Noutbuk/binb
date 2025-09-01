# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Setup
```bash
npm install                    # Install dependencies
npm run minify                 # Minify JavaScript assets (required after JS changes)
npm run import-data           # Load sample tracks from Apple Music playlists into Redis
npm start                     # Start the application server (runs on port 8138)
npm run local:start           # Start server in development mode with .env.local file
```

### Prerequisites
- Redis server must be running before starting the application
- Node.js >=10.0.0 required

### Data Import
The `npm run import-data` command scrapes Apple Music playlists defined in `config.json` and populates Redis with track data. This must be run at least once before the game can function.

### Testing & Debugging
The preferred method for testing and debugging the application is through **Playwright MCP integration**. This provides comprehensive browser automation capabilities for:

- **Visual testing**: Navigate to `http://localhost:8138/` to verify UI functionality
- **Interactive debugging**: Click elements, fill forms, and test user workflows
- **Error verification**: Check for JavaScript errors, network issues, and rendering problems
- **Cross-browser testing**: Test functionality across different browser environments
- **Screenshot capture**: Document issues or verify fixes visually

Use Playwright commands to systematically test the application rather than manual browser testing. This ensures consistent, repeatable testing and better issue identification.

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
- **lib/redis-clients.js**: Redis client configuration and connection management (configured with `legacyMode: true` for callback-style methods)
- **lib/data-service.js**: Redis abstraction layer providing semantic method names and dual callback/async-await support

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

## Development Notes

### Redis Configuration
- Redis clients use `legacyMode: true` which provides callback-style methods (e.g., `hmget`, `zcard`) rather than modern promise-based methods
- All Redis operations use lowercase method names and array syntax: `client.hmget([key, field1, field2], callback)`
- The data service layer (`lib/data-service.js`) provides promisified wrappers around these legacy methods

#### Redis Key Structure
- **Room metadata**: `room:metadata:roomName` - Contains room configuration (description, active status, timestamps)
- **Room songs**: `roomName` - Sorted set containing track IDs and scores
- **Song metadata**: `song:trackId` - Hash containing track details (artist, title, preview URL, artwork)
- **User data**: `user:username` - Hash containing user account information
- **User emails**: `email:address` - Maps email addresses to usernames
- **Session data**: `sess:sessionId` - Express session storage
- **Bans**: `ban:ipAddress` - IP ban information with TTL

#### Redis Debugging
Use `redis-cli` to inspect and debug Redis data:
```bash
redis-cli keys "*"                           # List all keys
redis-cli keys "room:metadata:*"             # List all room metadata
redis-cli hgetall "room:metadata:roomName"   # View room metadata
redis-cli zrange "roomName" 0 -1 WITHSCORES  # View room songs with scores
redis-cli hgetall "song:trackId"             # View song metadata
redis-cli hgetall "user:username"            # View user data
```

### Code Changes Impact
- **Important**: After making changes to JavaScript files, restart the server with `npm run local:start` to see changes
- The application caches compiled assets, so changes may not be visible until restart

### Data Service Architecture
- **SongDataManager**: Handles room/track operations (e.g., `getRoomTrackCount()`, `addTrackToRoom()`)
- **UserDataManager**: Handles user/authentication operations (e.g., `getUserFields()`, `userExists()`)
- **DataService**: Singleton providing access to both managers with backward compatibility for callback and async/await patterns

### Git Workflow & Commit Strategy

#### Good Commit Points
- **Feature completion**: When a complete feature works end-to-end and passes testing
- **Bug fixes**: After resolving errors and confirming fixes work via Playwright testing
- **Refactoring milestones**: After completing systematic code improvements
- **Configuration changes**: When updating configs, package.json, or build settings
- **Documentation updates**: After updating CLAUDE.md or other project docs
- **Before major changes**: Save working state before starting risky modifications

#### Pre-Commit Checklist
1. **Test core functionality**: Verify signup/login/rooms work using Playwright MCP
2. **Restart server**: Run `npm run local:start` to ensure changes work properly
3. **Check for errors**: Ensure no console errors or 500 responses in browser/server logs
4. **Review staged files**: Always run `git status` and `git diff --cached` to verify what will be committed
5. **Exclude temporary files**: Do not commit temporary files, logs, screenshots, or development artifacts (check `.gitignore`)
6. **Verify all files**: Include all modified files relevant to the commit

#### Commit Message Format
Use concise, descriptive commit messages with this structure:
```
Brief summary of changes (50 chars or less)

- Key changes in bullet points
- Focus on "what" and "why" 
- Keep descriptions concise
```

#### Commit Frequency
- **Small, focused commits** are preferred for this active multiplayer game
- **Commit working states** rather than broken intermediate steps
- **Test after each commit** to maintain stability