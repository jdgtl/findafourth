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
    await expect(page.getByTestId('signup-submit-btn')).toBeVisible();
  });

  test('password validation works', async ({ page }) => {
    await page.goto('/signup');
    await page.getByTestId('email-input').fill('test@example.com');
    await page.getByTestId('password-input').fill('short');
    await page.getByTestId('signup-submit-btn').click();
    // Should show password requirement error
    await expect(page).toHaveURL('/signup');
  });
});

test.describe('Password Visibility Toggle', () => {
  test('login page has password visibility toggle', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('toggle-password-visibility')).toBeVisible();
  });

  test('clicking toggle shows password on login page', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.getByTestId('password-input');
    const toggleBtn = page.getByTestId('toggle-password-visibility');

    // Initially password type
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click to show
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click to hide
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('signup page has password visibility toggles', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByTestId('toggle-password-visibility')).toBeVisible();
    await expect(page.getByTestId('toggle-confirm-password-visibility')).toBeVisible();
  });

  test('clicking toggle shows password on signup page', async ({ page }) => {
    await page.goto('/signup');
    const passwordInput = page.getByTestId('password-input');
    const confirmInput = page.getByTestId('confirm-password-input');
    const toggleBtn = page.getByTestId('toggle-password-visibility');
    const toggleConfirmBtn = page.getByTestId('toggle-confirm-password-visibility');

    // Initially password type
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(confirmInput).toHaveAttribute('type', 'password');

    // Toggle password field
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(confirmInput).toHaveAttribute('type', 'password'); // Should still be hidden

    // Toggle confirm field
    await toggleConfirmBtn.click();
    await expect(confirmInput).toHaveAttribute('type', 'text');
  });

  test('password toggle has correct aria-label', async ({ page }) => {
    await page.goto('/login');
    const toggleBtn = page.getByTestId('toggle-password-visibility');

    await expect(toggleBtn).toHaveAttribute('aria-label', 'Show password');
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-label', 'Hide password');
  });
});
