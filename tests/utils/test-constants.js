/**
 * Test constants for binb Playwright tests
 */

module.exports = {
  // Test URLs
  URLS: {
    HOME: '/',
    LOGIN: '/login',
    SIGNUP: '/signup',
    LOGOUT: '/logout',
    ADMIN: '/admin',
    TEST_ROOM: '/room/test-room',
  },

  // Test user credentials
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