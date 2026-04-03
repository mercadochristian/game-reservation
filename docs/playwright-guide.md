# Playwright E2E Testing Guide

This guide covers everything you need to run existing tests and write new ones.

---

## One-Time Setup

### 1. Create a Supabase test project

Go to https://supabase.com, create a **new** project (separate from dev). Copy the project URL, anon key, and service role key from Project Settings → API.

### 2. Create a test user

In the Supabase dashboard for your test project:
- Authentication → Users → Add User
- Email: `testplayer@example.com` (or your choice)
- Password: `TestPassword123!` (or your choice)

Also create a profile row for this user in the `users` table with `role = 'player'` and `profile_complete = true` (required for middleware to allow the user through).

### 3. Fill in `.env.test`

```bash
cp .env.test.example .env.test
```

Edit `.env.test` with your test project credentials and the test user email/password.

### 4. Install Playwright browsers (first time only)

```bash
npx playwright install chromium
```

---

## Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with interactive UI (watch mode, see browser live)
npm run test:e2e:ui

# Open the last HTML report
npm run test:e2e:report

# Run a specific test file
npx playwright test tests/e2e/auth/login.spec.ts

# Run a specific test by name
npx playwright test --grep "shows error toast"

# Debug a specific test (opens inspector)
npx playwright test tests/e2e/auth/login.spec.ts --debug
```

---

## Writing a New Test

### File naming

- Tests live in `tests/e2e/<feature>/`
- Use `.spec.ts` suffix
- Example: `tests/e2e/player/registration.spec.ts`

### Minimal example (authenticated)

```ts
// tests/e2e/player/profile.spec.ts
import { test, expect } from '../fixtures'

test('player can view their profile', async ({ page }) => {
  // page is already signed in (uses saved storageState)
  await page.goto('/player/profile')
  await expect(page.getByText('My Profile')).toBeVisible()
})
```

### Minimal example (unauthenticated)

```ts
// tests/e2e/auth/signup.spec.ts
import { test, expect } from '../fixtures'

test('sign-up form shows validation error for short password', async ({
  unauthenticatedPage: page,
}) => {
  await page.goto('/auth')
  await page.getByRole('button', { name: 'Create Account' }).click()
  await page.fill('input#email', 'new@example.com')
  await page.fill('input#password', '123')
  await page.fill('input#confirm-password', '123')
  await page.click('button[type="submit"]')
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Password must be at least 6 characters' })
  ).toBeVisible()
})
```

---

## Common Patterns Cheat Sheet

```ts
// Navigate
await page.goto('/some/path')

// Fill a form field
await page.fill('input#email', 'user@example.com')
await page.fill('input[name="password"]', 'secret')

// Click
await page.click('button[type="submit"]')
await page.getByRole('button', { name: 'Save' }).click()
await page.getByText('Cancel').click()

// Assert visibility
await expect(page.locator('input#email')).toBeVisible()
await expect(page.getByText('Welcome back')).toBeVisible()

// Assert URL
await expect(page).toHaveURL('/dashboard')
await expect(page).not.toHaveURL(/\/auth/)
await expect(page).toHaveURL(/\/player/)

// Assert a Sonner toast appeared
await expect(
  page.locator('[data-sonner-toast]').filter({ hasText: 'Success' })
).toBeVisible({ timeout: 5_000 })

// Wait for a URL change
await page.waitForURL('/dashboard')
await page.waitForURL(url => !url.href.includes('/auth'))

// Use unauthenticated page (no saved session)
test('my test', async ({ unauthenticatedPage: page }) => {
  await page.goto('/auth')
  // user is not logged in
})
```

---

## CI — GitHub Actions

The workflow at `.github/workflows/e2e.yml` runs on every push to `main` and every PR.

### Secrets to add in GitHub

Go to your repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret name | Value |
|-------------|-------|
| `PLAYWRIGHT_TEST_SUPABASE_URL` | Test project URL |
| `PLAYWRIGHT_TEST_SUPABASE_ANON_KEY` | Test project anon key |
| `PLAYWRIGHT_TEST_SUPABASE_SERVICE_ROLE_KEY` | Test project service role key |
| `PLAYWRIGHT_TEST_EMAIL` | Test user email |
| `PLAYWRIGHT_TEST_PASSWORD` | Test user password |

### When tests fail in CI

- A Playwright HTML report is uploaded as an artifact — download it from the Actions run page.
- Open the report locally: `npx playwright show-report` (after extracting the artifact).
- Reports are kept for 7 days.
