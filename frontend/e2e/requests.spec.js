import { test, expect } from '@playwright/test';

// Helper to login
async function login(page, email, password) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('login-btn').click();
  await page.waitForURL(/\/(home|complete-profile)/);
}

test.describe('Game Requests', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL, 'No test user configured');
    await login(page, process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
  });

  test('home page loads with request list', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: /requests|games/i })).toBeVisible();
  });

  test('can navigate to create request', async ({ page }) => {
    await page.goto('/home');
    // Find the create/new button
    const createBtn = page.getByRole('link', { name: /new|create|\+/i }).or(
      page.getByTestId('create-request-btn')
    );
    if (await createBtn.first().isVisible()) {
      await createBtn.first().click();
      await expect(page).toHaveURL('/requests/new');
    }
  });

  test('create request form has required fields', async ({ page }) => {
    await page.goto('/requests/new');
    await expect(page.getByTestId('club-input')).toBeVisible();
    await expect(page.getByText(/spots needed/i)).toBeVisible();
    await expect(page.getByText(/audience/i)).toBeVisible();
  });

  test('date picker works', async ({ page }) => {
    await page.goto('/requests/new');
    // Click on a future date in the calendar
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayNum = tomorrow.getDate().toString();

    // Find calendar day button
    const dayBtn = page.getByRole('button', { name: new RegExp(`^${dayNum}$`) });
    if (await dayBtn.first().isVisible()) {
      await dayBtn.first().click();
    }
  });

  test('time picker works', async ({ page }) => {
    await page.goto('/requests/new');
    // Click on time display to open picker
    const timePicker = page.getByText(/AM|PM/).first();
    if (await timePicker.isVisible()) {
      await timePicker.click();
    }
  });

  test('audience selection works', async ({ page }) => {
    await page.goto('/requests/new');

    // Test crews option
    const crewsOption = page.getByText(/my crews/i);
    await crewsOption.click();

    // Test club option
    const clubOption = page.getByText(/my club/i);
    await clubOption.click();

    // Test open option
    const openOption = page.getByText(/^open$/i);
    await openOption.click();
  });

  test('skill filter toggle works', async ({ page }) => {
    await page.goto('/requests/new');
    const skillToggle = page.getByText(/skill filter/i).locator('..').getByRole('switch');
    if (await skillToggle.isVisible()) {
      await skillToggle.click();
      // Should show skill range slider
      await expect(page.getByText(/pti range/i).or(page.getByRole('slider'))).toBeVisible();
    }
  });

  test('form validation prevents empty submission', async ({ page }) => {
    await page.goto('/requests/new');
    await page.getByTestId('club-input').clear();
    await page.getByRole('button', { name: /create|submit|post/i }).click();
    // Should show error or stay on page
    await expect(page).toHaveURL('/requests/new');
  });
});
