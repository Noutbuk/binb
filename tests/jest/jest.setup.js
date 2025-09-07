/**
 * Jest Setup File
 * This runs before each test file
 */

const testConstants = require('../shared/test-constants');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = `redis://${testConstants.REDIS_HOST}:${testConstants.REDIS_PORT}`;

// Extend Jest timeout for Redis operations
jest.setTimeout(testConstants.DEFAULT_TIMEOUT);

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to retry operations (useful for Redis)
  retry: async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await global.testUtils.wait(delay);
      }
    }
  }
};