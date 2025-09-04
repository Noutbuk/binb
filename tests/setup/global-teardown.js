/**
 * Global Playwright teardown for binb tests
 * Cleans up test environment (Redis and server are handled by Playwright)
 */

async function globalTeardown() {
  console.log('🧹 Tearing down test environment...');
  
  try {
    // Playwright will handle stopping Redis and the server automatically
    // This is just for any additional cleanup if needed
    console.log('✅ Test environment cleanup complete!');
    
  } catch (error) {
    console.error('⚠️ Error during teardown:', error.message);
    // Don't throw error to prevent test suite failure
  }
}

module.exports = globalTeardown;