/**
 * Global Playwright teardown for binb tests
 * Uses shared Redis manager for cleanup
 */

const redisManager = require('../shared/redis-manager');

async function globalTeardown() {
  console.log('🧹 Tearing down Playwright test environment...');
  
  try {
    // Playwright will handle stopping Redis and the server automatically
    // via webServer configuration, but we can do additional cleanup here
    console.log('✅ Playwright test environment cleanup complete!');
    
  } catch (error) {
    console.error('⚠️ Error during teardown:', error.message);
    // Don't throw error to prevent test suite failure
  }
}

module.exports = globalTeardown;