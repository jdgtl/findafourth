import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('landing page loads correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /needafourth/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('can navigate to login page', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByTestId('login-form') || page.getByRole('form')).toBeVisible();
  });

  test('can navigate to signup page', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL('/signup');
  });

  test('login form validates email', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill('invalid-email');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('login-btn').click();
    // Should show validation error or not submit
    await expect(page).toHaveURL('/login');
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill('nonexistent@test.com');
    await page.getByTestId('password-input').fill('wrongpassword');
    await page.getByTestId('login-btn').click();
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Registration', () => {
  test('signup form has required fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('signup-btn')).toBeVisible();
  });

  test('password validation works', async ({ page }) => {
    await page.goto('/signup');
    await page.getByTestId('email-input').fill('test@example.com');
    await page.getByTestId('password-input').fill('short');
    await page.getByTestId('signup-btn').click();
    // Should show password requirement error
    await expect(page).toHaveURL('/signup');
  });
});
