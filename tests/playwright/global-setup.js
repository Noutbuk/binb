/**
 * Global Playwright setup for binb tests
 * Uses shared Redis manager and test data from test-data.json
 */

const { execSync } = require('child_process');
const path = require('path');
const redisManager = require('../shared/redis-manager');

async function globalSetup() {
  console.log('🚀 Setting up Playwright test environment...');

  try {
    // 1. Setup Redis and seed test data using shared manager
    console.log('📡 Setting up Redis and test data...');
    await redisManager.setup(); // Uses direct seeding for Playwright

    // 2. Minify JavaScript assets
    console.log('⚙️ Minifying assets...');
    execSync('npm run minify', { stdio: 'inherit', cwd: path.resolve(__dirname, '../..') });

    console.log('✅ Playwright test environment setup complete!');

  } catch (error) {
    console.error('❌ Playwright setup failed:', error.message);
    throw error;
  }
}

module.exports = globalSetup;