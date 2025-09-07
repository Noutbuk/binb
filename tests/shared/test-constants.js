/**
 * Test Constants
 * Shared constants used across Jest and Playwright tests
 */

module.exports = {
  // Redis configuration
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  
  // Test timeouts
  DEFAULT_TIMEOUT: 60000,
  REDIS_WAIT_TIMEOUT: 30000,
  
  // Test data
  TEST_ROOM_NAME: 'test-room',
  EMPTY_ROOM_NAME: 'empty-room',
  
  // Test users (for Jest)
  TEST_USER: 'testuser',
  TEST_USER_EMAIL: 'test@example.com',
  TEST_USER_PASSWORD: 'testuser1234567',
  
  TEST_USER_2: 'testuser2',
  TEST_USER_2_EMAIL: 'test2@example.com',
  
  ADMIN_USER: 'adminuser',
  ADMIN_USER_EMAIL: 'admin@example.com',
  
  // Server configuration
  TEST_SERVER_URL: 'http://localhost:8138',
  TEST_SERVER_PORT: 8138,
  
  // Playwright-specific constants
  // Test URLs
  URLS: {
    HOME: '/',
    LOGIN: '/login',
    SIGNUP: '/signup',
    LOGOUT: '/logout',
    ADMIN: '/admin',
    TEST_ROOM: '/room/test-room',
  },

  // Test user credentials (for Playwright)
  USERS: {
    TEST_USER: {
      username: 'testuser',
      email: 'test@example.com',
      password: 'testuser1234567'
    },
    NEW_USER: {
      username: 'newuser',
      email: 'newuser@example.com', 
      password: 'newpass123'
    }
  },

  // Test room data
  ROOMS: {
    TEST_ROOM: 'test-room'
  },

  // Common selectors
  SELECTORS: {
    // Navigation
    LOGIN_LINK: 'a[href="/login"]',
    LOGOUT_LINK: 'a[href="/logout"]',
    SIGNUP_LINK: 'a[href="/signup"]',
    DROPDOWN_TOGGLE: '.dropdown-toggle',
    DROPDOWN_MENU: '.dropdown-menu',
    
    // Forms
    USERNAME_INPUT: 'input[name="username"]',
    EMAIL_INPUT: 'input[name="email"]',
    PASSWORD_INPUT: 'input[name="password"]',
    CAPTCHA_INPUT: 'input[name="captcha"]',
    SUBMIT_BUTTON: 'button[type="submit"]',
    
    // Game elements
    ROOM_LIST: '.room-list',
    GUESS_INPUT: 'input[name="guess"]',
    PLAYER_SCORE: '.player-score',
    GAME_ACTIVE: '.game-active',
    ROUND_RESULTS: '.round-results',
    GAME_RESULTS: '.game-results',
    AUDIO_PLAYER: 'audio',
    
    // Admin elements
    ADMIN_PANEL: '.admin-panel',
    
    // Error/success messages
    ERROR_MESSAGE: '.error-message',
    SUCCESS_MESSAGE: '.success-message',
    FLASH_MESSAGE: '.flash-message'
  },

  // Timeouts (in milliseconds)
  TIMEOUTS: {
    SHORT: 2000,
    MEDIUM: 10000,
    LONG: 30000,
    GAME_ROUND: 35000,
    GAME_COMPLETE: 300000, // 5 minutes
    WEBSOCKET_CONNECT: 10000
  },

  // Game settings
  GAME: {
    SONGS_PER_GAME: 3,
    ROUND_DURATION: 30000, // 30 seconds
    GUESS_TIMEOUT: 500
  }
};