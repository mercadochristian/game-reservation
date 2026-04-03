// tests/e2e/auth/login.spec.ts
import { test, expect } from '../fixtures'

test.describe('Login flow', () => {
  test('shows sign-in form on /auth', async ({ unauthenticatedPage: page }) => {
    await page.goto('/auth')

    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })

  test('shows error toast on wrong credentials', async ({ unauthenticatedPage: page }) => {
    await page.goto('/auth')

    await page.fill('input#email', 'doesnotexist@example.com')
    await page.fill('input#password', 'wrongpassword123')
    await page.click('button[type="submit"]')

    // Sonner renders toasts as <li data-sonner-toast>
    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: 'Incorrect email or password' })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows banned message when accessing /auth?error=banned', async ({
    unauthenticatedPage: page,
  }) => {
    await page.goto('/auth?error=banned')
    await page.waitForSelector('input#email') // ensures component has fully hydrated before checking toast

    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: 'Your account has been banned' })
    ).toBeVisible({ timeout: 5_000 })
  })

  test('redirects authenticated user away from /auth', async ({ page }) => {
    // page has saved storageState — user is already signed in
    await page.goto('/auth')

    // Middleware should redirect away from /auth immediately
    await expect(page).not.toHaveURL(/\/auth/, { timeout: 10_000 })
  })

  test('toggles to sign-up mode and shows confirm-password field', async ({
    unauthenticatedPage: page,
  }) => {
    await page.goto('/auth')

    // In sign-in mode: submit = "Sign In", toggle = "Create Account"
    await page.getByRole('button', { name: 'Create Account' }).click()

    // Sign-up mode: confirm-password field should now be visible
    await expect(page.locator('input#confirm-password')).toBeVisible()
  })
})
