const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('../test-helpers');
const { URLS, USERS, SELECTORS, TIMEOUTS } = require('../../shared/test-constants');
const redisManager = require('../../shared/redis-manager');

test.describe('Basic Functionality', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Clean and reseed test data before each test
    await redisManager.reset();
  });

  test('should load home page successfully', async ({ page }) => {
    await helpers.goHome();

    // Check page title
    await expect(page).toHaveTitle(/binb/);

    // Check for main navigation elements
    await expect(page.locator(SELECTORS.LOGIN_LINK)).toBeVisible();
    await expect(page.locator(SELECTORS.SIGNUP_LINK)).toBeVisible();

    // Check for room list
    await expect(page.locator(SELECTORS.ROOM_LIST)).toBeVisible();
  });

  test('should show login form', async ({ page }) => {
    await page.goto(URLS.LOGIN);

    // Check form elements
    await expect(page.locator(SELECTORS.USERNAME_INPUT)).toBeVisible();
    await expect(page.locator(SELECTORS.PASSWORD_INPUT)).toBeVisible();
    await expect(page.locator(SELECTORS.SUBMIT_BUTTON)).toBeVisible();
  });

  test('should show signup form', async ({ page }) => {
    await page.goto(URLS.SIGNUP);

    // Check form elements
    await expect(page.locator(SELECTORS.USERNAME_INPUT)).toBeVisible();
    await expect(page.locator(SELECTORS.EMAIL_INPUT)).toBeVisible();
    await expect(page.locator(SELECTORS.PASSWORD_INPUT)).toBeVisible();
    await expect(page.locator(SELECTORS.CAPTCHA_INPUT)).toBeVisible();
    await expect(page.locator(SELECTORS.SUBMIT_BUTTON)).toBeVisible();
  });

  test('should login with test user', async ({ page }) => {
    await helpers.login(USERS.TEST_USER.username, USERS.TEST_USER.password);

    // Check that we're logged in
    expect(await helpers.isLoggedIn()).toBe(true);

    // Check for dropdown with username
    await expect(page.locator(SELECTORS.DROPDOWN_TOGGLE)).toContainText('Logged in as');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await helpers.login(USERS.TEST_USER.username, USERS.TEST_USER.password);
    expect(await helpers.isLoggedIn()).toBe(true);

    // Then logout
    await helpers.logout();

    // Check that we're logged out
    expect(await helpers.isLoggedIn()).toBe(false);
    await expect(page.locator(SELECTORS.LOGIN_LINK)).toBeVisible();
  });

  test('should show available rooms', async ({ page }) => {
    await helpers.goHome();

    // Wait for rooms to load
    await page.waitForSelector(SELECTORS.ROOM_LIST, { timeout: TIMEOUTS.MEDIUM });

    // Check for test room
    const testRoomLink = page.locator('a[href="test-room"]');
    await expect(testRoomLink).toBeVisible();
  });

  test('should be able to visit room page when logged in', async ({ page }) => {
    // Login first
    await helpers.login(USERS.TEST_USER.username, USERS.TEST_USER.password);

    // Visit room
    await helpers.joinRoom('test-room');

    // Check we're on the room page
    expect(page.url()).toContain('test-room');
  });

  test('should handle invalid login gracefully', async ({ page }) => {
    await page.goto(URLS.LOGIN);

    await page.fill(SELECTORS.USERNAME_INPUT, 'invaliduser');
    await page.fill(SELECTORS.PASSWORD_INPUT, 'invalidpass');
    await page.click(SELECTORS.SUBMIT_BUTTON);

    // Should stay on login page or show error
    // The exact behavior depends on your error handling implementation
    await page.waitForTimeout(2000);

    // Should not be logged in
    expect(await helpers.isLoggedIn()).toBe(false);
  });

  test('should handle WebSocket connection', async ({ page }) => {
    const frames = [];
    page.on("websocket", (ws) => {
      ws.on("framereceived", (event) => frames.push(event.payload));
    });

    // Login and join room
    await helpers.login(USERS.TEST_USER.username, USERS.TEST_USER.password);
    await helpers.joinRoom('test-room');

    // Check WebSocket connection is established
    await expect.poll(() => frames.length).toBeGreaterThan(1);
  });
});