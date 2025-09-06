/**
 * Jest Setup File
 * This runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Extend Jest timeout for Redis operations
jest.setTimeout(60000);

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

// Mock console methods if needed (uncomment to reduce noise)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: console.error // Keep errors visible
// };