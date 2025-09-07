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

### Testing Commands
```bash
# Unit Testing (Jest)
npm run test:unit                # Run unit tests
npm run test:unit:coverage       # Run unit tests with coverage report

# End-to-End Testing (Playwright)
npm run test:e2e                 # Run all Playwright tests headless
npm run test:e2e:ui              # Run tests with Playwright UI (interactive)
npm run test:e2e:headed          # Run tests with browser visible
npm run test:e2e:debug           # Run tests in debug mode

# Test Infrastructure
npm run test:server              # Start server in test mode
npm run test:redis               # Start Redis for testing
npm run test:cleanup             # Stop test Redis and clean up
npm run test:full                # Complete test cycle (E2E + unit with coverage)
```

### Code Formatting
```bash
# Prettier is configured via .prettierignore
# Currently ignores: *.min.css
```

### Prerequisites
- Redis server must be running before starting the application
- Node.js >=20.0.0 required (updated from >=10.0.0)
- Docker (for Redis in testing)

### Data Import
The `npm run import-data` command scrapes Apple Music playlists defined in `config.json` and populates Redis with track data. This must be run at least once before the game can function.

### Testing & Debugging

#### Automated Testing
The application has comprehensive test suites:

- **Jest Unit Tests**: Located in `tests/jest/unit/` - Test core business logic, data services, and Redis operations
- **Playwright E2E Tests**: Located in `tests/playwright/e2e/` - Test complete user workflows and browser interactions

#### Test Structure
```
tests/
├── jest/
│   ├── jest.setup.js           # Jest configuration and setup
│   └── unit/                   # Unit tests for lib/ modules
├── playwright/
│   ├── global-setup.js         # Test environment setup
│   ├── global-teardown.js      # Test cleanup
│   ├── test-helpers.js         # Reusable test utilities
│   └── e2e/                    # End-to-end test specs
├── shared/                     # Shared test utilities and data
└── data/
    └── test-data.json          # Test fixtures and sample data
```

#### Playwright MCP Integration
The preferred method for interactive testing and debugging is through **Playwright MCP integration**:

- **Visual testing**: Navigate to `http://localhost:8138/` to verify UI functionality
- **Interactive debugging**: Click elements, fill forms, and test user workflows
- **Error verification**: Check for JavaScript errors, network issues, and rendering problems
- **Cross-browser testing**: Test functionality across different browser environments (Chrome, Firefox)
- **Screenshot capture**: Document issues or verify fixes visually

#### Test Environment
- **Test Redis**: Runs on Docker (docker-compose.test.yml)
- **Test Server**: Runs on port 8138 with NODE_ENV=test
- **Test Data**: Predefined test room with sample songs and test user account
- **Coverage Reports**: Generated in `coverage/` directory for unit tests

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
1. **Run tests**: Execute `npm run test:full` to verify both unit and E2E tests pass
2. **Test core functionality**: Verify signup/login/rooms work using Playwright MCP
3. **Restart server**: Run `npm run local:start` to ensure changes work properly
4. **Check for errors**: Ensure no console errors or 500 responses in browser/server logs
5. **Review staged files**: Always run `git status` and `git diff --cached` to verify what will be committed
6. **Exclude temporary files**: Do not commit temporary files, logs, screenshots, test-results/, coverage/, or development artifacts (check `.gitignore`)
7. **Verify all files**: Include all modified files relevant to the commit

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