# Testing Guide for binb

This document describes how to run Playwright end-to-end tests for the binb music guessing game.

## Prerequisites

- Node.js 20 or higher
- Docker (for Redis)
- npm dependencies installed (`npm install`)

## Quick Start

**Run all tests with automatic setup:**
```bash
npm run test:full
```

## Available Test Commands

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all Playwright tests headless |
| `npm run test:e2e:ui` | Run tests with Playwright UI (interactive) |
| `npm run test:e2e:headed` | Run tests with browser visible |
| `npm run test:e2e:debug` | Run tests in debug mode |
| `npm run test:server` | Start server in test mode |
| `npm run test:cleanup` | Stop Redis and clean up |
| `npm run test:full` | Complete test cycle (setup → test → cleanup) |

## Test Environment

The test suite automatically:

1. **Starts Redis** using Docker Compose
2. **Sets up test data:**
   - Test room with 3 sample songs
   - Test user (`testuser` / `testuser1234567`)
3. **Minifies assets** (JavaScript files)
4. **Starts the server** in test mode
5. **Runs tests** in Chrome and Firefox
6. **Cleans up** after completion

## Test Data

- **Test Room:** `test-room` with 3 songs
- **Test User:** 
  - Username: `testuser`
  - Password: `testuser1234567`
  - Email: `test@example.com`

## Configuration

### Playwright Configuration
- **Browsers:** Chrome and Firefox
- **Base URL:** `http://localhost:8138`
- **Timeouts:** 10s test timeout, 5s assertion timeout
- **Artifacts:** Screenshots on failure, traces on retry

### Environment Variables
- `NODE_ENV=test` - Set during testing
- `CI=true` - Detected automatically in CI environments

## Debugging Tests

1. **Run with UI mode:**
   ```bash
   npm run test:e2e:ui
   ```

2. **Run with visible browser:**
   ```bash
   npm run test:e2e:headed
   ```

3. **Debug specific test:**
   ```bash
   npx playwright test basic-functionality.spec.js --debug
   ```

4. **View test results:**
   ```bash
   npx playwright show-report
   ```

## CI/CD Integration

### GitHub Actions
- Tests run automatically on push/PR
- Uploads test reports and artifacts

## Writing New Tests

1. **Use the test helpers:**
   ```javascript
   const { TestHelpers } = require('../utils/test-helpers');
   const helpers = new TestHelpers(page);
   ```

2. **Follow the existing patterns:**
   ```javascript
   test('should do something', async ({ page }) => {
     await helpers.login(USERS.TEST_USER.username, USERS.TEST_USER.password);
     // Your test logic here
   });
   ```

3. **Use constants:**
   ```javascript
   const { SELECTORS, TIMEOUTS } = require('../utils/test-constants');
   await page.waitForSelector(SELECTORS.LOGIN_LINK, { timeout: TIMEOUTS.MEDIUM });
   ```
