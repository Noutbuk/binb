const { expect } = require('@playwright/test');

/**
 * Common test utilities for binb Playwright tests
 */

class TestHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigate to the home page
   */
  async goHome() {
    await this.page.goto('/');
    await expect(this.page).toHaveTitle(/binb/);
  }

  /**
   * Sign up a new user
   */
  async signUp(username, email, password) {
    await this.page.goto('/signup');

    // Fill signup form
    await this.page.fill('[name="username"]', username);
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
    await this.page.fill('[name="password2"]', password);

    // Handle captcha if present
    const captchaInput = this.page.locator('[name="captcha"]');
    if (await captchaInput.isVisible()) {
      // For tests, we might want to skip captcha or use a test captcha
      await captchaInput.fill('test');
    }

    // Submit form
    await this.page.click('button[type="submit"]');

    // Wait for redirect or success
    await this.page.waitForURL(/\/$/);
  }

  /**
   * Log in an existing user
   */
  async login(username, password) {
    await this.page.goto('/login');

    await this.page.fill('[name="username"]', username);
    await this.page.fill('[name="password"]', password);
    await this.page.click('button[type="submit"]');

    // Wait for redirect to home page
    await this.page.waitForURL(/\/$/);

    // Verify login success by checking for username in dropdown toggle
    await expect(this.page.locator('.dropdown-toggle')).toContainText('Logged in as');
  }

  /**
   * Log out current user
   */
  async logout() {
    // Click the dropdown toggle to open the menu
    await this.page.click('.dropdown-toggle');

    // Wait for dropdown menu to be visible and click logout
    await this.page.waitForSelector('.dropdown-menu', { state: 'visible' });
    await this.page.click('a[href="/logout"]');
    await this.page.waitForURL(/\/$/);

    // Verify logout by checking for login link
    await expect(this.page.locator('a[href="/login"]')).toBeVisible();
  }

  /**
   * Join a game room
   */
  async joinRoom(roomName) {
    await this.goHome();

    // Wait for rooms to load
    await this.page.waitForSelector('.room-list', { timeout: 10000 });

    // Find and click the room
    const roomLink = this.page.locator(`a[href="${roomName}"]`);
    await expect(roomLink).toBeVisible();
    await roomLink.click();

    // Wait for room page to load
    await this.page.waitForURL(`${roomName}`);

    // Wait for WebSocket connection
    // await this.page.waitForFunction(() => {
    //   return window.spark && window.spark.readyState === 1;
    // }, { timeout: 10000 });
  }

  /**
   * Wait for game to start
   */
  async waitForGameStart() {
    // Wait for game start indicator
    await this.page.waitForSelector('.game-active', { timeout: 30000 });

    // Wait for first song to load
    await this.page.waitForSelector('audio', { timeout: 10000 });
  }

  /**
   * Make a guess during the game
   */
  async makeGuess(guess) {
    const guessInput = this.page.locator('input[name="guess"]');
    await expect(guessInput).toBeVisible();

    await guessInput.fill(guess);
    await guessInput.press('Enter');

    // Wait a moment for the guess to be processed
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for round to end
   */
  async waitForRoundEnd() {
    await this.page.waitForSelector('.round-results', { timeout: 35000 });
  }

  /**
   * Wait for game to complete
   */
  async waitForGameEnd() {
    await this.page.waitForSelector('.game-results', { timeout: 300000 }); // 5 minutes max
  }

  /**
   * Get current score
   */
  async getScore() {
    const scoreElement = this.page.locator('.player-score');
    await expect(scoreElement).toBeVisible();
    const scoreText = await scoreElement.textContent();
    return parseInt(scoreText.replace(/\D/g, '')) || 0;
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn() {
    try {
      await expect(this.page.locator('.dropdown-toggle')).toContainText('Logged in as', { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for element with timeout and error handling
   */
  async waitForElement(selector, options = {}) {
    const defaultOptions = { timeout: 10000 };
    const mergedOptions = { ...defaultOptions, ...options };

    try {
      await this.page.waitForSelector(selector, mergedOptions);
      return true;
    } catch (error) {
      console.error(`Failed to find element ${selector}:`, error.message);
      return false;
    }
  }

  /**
   * Take screenshot for debugging
   */
  async takeDebugScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `test-results/debug-${name}-${timestamp}.png`,
      fullPage: true
    });
  }

  /**
   * Check for JavaScript errors on page
   */
  async checkForJSErrors() {
    const errors = [];

    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    this.page.on('pageerror', error => {
      errors.push(error.message);
    });

    return errors;
  }
}

module.exports = { TestHelpers };