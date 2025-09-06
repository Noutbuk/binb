/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: ['**/tests/unit/**/*.test.js'],
  
  // Test timeout (60 seconds for Redis operations)
  testTimeout: 60000,
  
  // Verbose output for detailed test reporting
  verbose: true,
  
  // Collect coverage information
  collectCoverage: false, // Can be enabled with --coverage flag or CI environment
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/**/*.test.js',
    '!**/node_modules/**'
  ],
  
  // Coverage reporters
  coverageReporters: [
    'text',        // Console output
    'text-summary', // Brief summary
    'html',        // HTML report in coverage/ directory
    'lcov',        // For CI/CD integration
    'cobertura'    // XML format for GitHub Actions
  ],
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Setup files - run before each test file
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles (useful for debugging Redis connections)
  detectOpenHandles: true,
  
  // Maximum number of concurrent tests (useful for Redis)
  maxConcurrency: 1, // Run Redis tests sequentially to avoid conflicts
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
    }]
  ],
  
  // Error handling
  bail: false, // Continue running tests even if some fail
  
  // Transform files (if needed for ES modules)
  transform: {},
  
  // Module paths
  roots: ['<rootDir>/tests', '<rootDir>/lib'],
  
  // Global variables available in tests
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.REDIS_URL': 'redis://localhost:6379'
  }
};