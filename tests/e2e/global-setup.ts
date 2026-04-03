// tests/e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:3000'
  const email = process.env.PLAYWRIGHT_TEST_EMAIL
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Missing PLAYWRIGHT_TEST_EMAIL or PLAYWRIGHT_TEST_PASSWORD in .env.test'
    )
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto(`${baseURL}/auth`)

  // Fill in credentials and submit
  await page.fill('input#email', email)
  await page.fill('input#password', password)
  await page.click('button[type="submit"]')

  // Wait for redirect away from /auth (confirms login succeeded)
  await page.waitForURL((url) => !url.href.includes('/auth'), { timeout: 15_000 })

  const currentUrl = page.url()
  if (currentUrl.includes('/auth')) {
    throw new Error(
      `Global setup failed: still on /auth after login. Check credentials in .env.test.\nCurrent URL: ${currentUrl}`
    )
  }

  // Save session state for all tests
  await page.context().storageState({ path: AUTH_FILE })
  await browser.close()

  console.log(`✅ Global setup: signed in as ${email}, session saved to tests/e2e/.auth/user.json`)
}

export default globalSetup
