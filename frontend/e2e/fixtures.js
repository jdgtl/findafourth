import { test as base, expect } from '@playwright/test';

/**
 * Test fixtures and helpers for E2E tests
 */

// Extend base test with custom fixtures
export const test = base.extend({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    // Login with test user if credentials available
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (email && password) {
      await page.goto('/login');
      await page.getByTestId('email-input').fill(email);
      await page.getByTestId('password-input').fill(password);
      await page.getByTestId('login-btn').click();
      await page.waitForURL(/\/(home|complete-profile)/);
    }

    await use(page);
  },

  // API mocking fixture
  mockAPI: async ({ page }, use) => {
    const mocks = new Map();

    const mock = async (url, response) => {
      mocks.set(url, response);
      await page.route(`**/api${url}`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      });
    };

    await use({ mock, mocks });
  },
});

// Re-export expect
export { expect };

// Helper functions
export const helpers = {
  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(page, timeout = 5000) {
    await page.waitForLoadState('networkidle', { timeout });
  },

  /**
   * Take a screenshot with timestamp
   */
  async screenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `playwright-report/screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  },

  /**
   * Get all visible text on page
   */
  async getPageText(page) {
    return page.evaluate(() => document.body.innerText);
  },

  /**
   * Check if element exists (without throwing)
   */
  async elementExists(page, selector) {
    const element = await page.$(selector);
    return element !== null;
  },

  /**
   * Fill form fields from object
   */
  async fillForm(page, fields) {
    for (const [testId, value] of Object.entries(fields)) {
      const element = page.getByTestId(testId);
      if (await element.isVisible()) {
        await element.fill(value);
      }
    }
  },

  /**
   * Create test user via API
   */
  async createTestUser(request, userData) {
    const response = await request.post('/api/auth/register', {
      data: userData,
    });
    return response.json();
  },

  /**
   * Clean up test data
   */
  async cleanupTestUser(request, userId, token) {
    await request.delete(`/api/players/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

// Test data factories
export const factories = {
  user: (overrides = {}) => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    ...overrides,
  }),

  profile: (overrides = {}) => ({
    name: 'Test Player',
    home_club: 'Test Club',
    other_clubs: [],
    pti: 45,
    phone: '555-0100',
    ...overrides,
  }),

  request: (overrides = {}) => ({
    date_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    club: 'Test Club',
    court: 'Court 1',
    spots_needed: 1,
    mode: 'quick_fill',
    audience: 'crews',
    ...overrides,
  }),
};
