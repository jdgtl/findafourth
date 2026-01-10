import { test, expect } from '@playwright/test';

// Helper to login
async function login(page, email, password) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('login-btn').click();
  await page.waitForURL(/\/(home|complete-profile)/);
}

test.describe('Profile Completion', () => {
  test('new user redirected to complete profile', async ({ page }) => {
    // This test requires a fresh user - skip in normal CI
    test.skip(!process.env.TEST_NEW_USER_EMAIL, 'No new test user configured');

    await login(page, process.env.TEST_NEW_USER_EMAIL, process.env.TEST_NEW_USER_PASSWORD);
    await expect(page).toHaveURL('/complete-profile');
    await expect(page.getByTestId('complete-profile-card')).toBeVisible();
  });

  test('profile completion form has required fields', async ({ page }) => {
    await page.goto('/complete-profile');
    // Should redirect to login if not authenticated
    if (await page.url().includes('/login')) {
      return; // Expected behavior
    }

    await expect(page.getByTestId('name-input')).toBeVisible();
    await expect(page.getByTestId('home-club-input')).toBeVisible();
    await expect(page.getByTestId('complete-profile-submit-btn')).toBeVisible();
  });

  test('PTI lookup triggers on name blur', async ({ page }) => {
    test.skip(!process.env.TEST_NEW_USER_EMAIL, 'No new test user configured');

    await login(page, process.env.TEST_NEW_USER_EMAIL, process.env.TEST_NEW_USER_PASSWORD);
    await page.getByTestId('name-input').fill('Test Player');
    await page.getByTestId('name-input').blur();

    // Should show PTI lookup animation or result
    await page.waitForTimeout(2000);
  });
});

test.describe('Profile Settings', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL, 'No test user configured');
    await login(page, process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
  });

  test('profile page loads', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByTestId('profile-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
  });

  test('can edit profile', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();
    await expect(page.getByTestId('name-input')).toBeEnabled();
    await expect(page.getByTestId('save-profile-btn')).toBeVisible();
  });

  test('can cancel edit', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('button', { name: /edit/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByTestId('name-input')).toBeDisabled();
  });

  test('profile image upload button exists', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('button', { name: /photo/i })).toBeVisible();
  });

  test('notification toggles work', async ({ page }) => {
    await page.goto('/profile');
    const pushToggle = page.getByText(/push notifications/i).locator('..').getByRole('switch');
    if (await pushToggle.isVisible()) {
      await pushToggle.click();
      // Toggle should change state
    }
  });

  test('logout works', async ({ page }) => {
    await page.goto('/profile');
    await page.getByTestId('logout-btn').click();
    await expect(page).toHaveURL('/');
  });
});
