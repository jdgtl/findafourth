import { test, expect } from '@playwright/test';

// Helper to login
async function login(page, email = 'test@example.com', password = 'password123') {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('login-btn').click();
  await page.waitForURL(/\/(home|complete-profile)/);
}

test.describe('Clubs', () => {
  test.beforeEach(async ({ page }) => {
    // Skip if no test user exists
    test.skip(!process.env.TEST_USER_EMAIL, 'No test user configured');
    await login(page, process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
  });

  test('clubs page loads', async ({ page }) => {
    await page.goto('/clubs');
    await expect(page.getByTestId('clubs-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /clubs/i })).toBeVisible();
  });

  test('club search works', async ({ page }) => {
    await page.goto('/clubs');
    await page.getByTestId('club-search').fill('test');
    // Should filter clubs or show no results
    await page.waitForTimeout(500); // Debounce
  });

  test('can navigate to club detail', async ({ page }) => {
    await page.goto('/clubs');
    const clubCard = page.getByTestId('club-card').first();

    if (await clubCard.isVisible()) {
      await clubCard.click();
      await expect(page).toHaveURL(/\/clubs\/.+/);
      await expect(page.getByTestId('club-detail-page')).toBeVisible();
    }
  });

  test('club detail shows roster', async ({ page }) => {
    await page.goto('/clubs');
    const clubCard = page.getByTestId('club-card').first();

    if (await clubCard.isVisible()) {
      await clubCard.click();
      await page.waitForURL(/\/clubs\/.+/);
      // Should show members section
      await expect(page.getByText(/members|roster/i)).toBeVisible();
    }
  });
});
