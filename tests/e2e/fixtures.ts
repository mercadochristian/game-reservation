// tests/e2e/fixtures.ts
import { test as base, Page } from '@playwright/test'

type Fixtures = {
  unauthenticatedPage: Page
}

export const test = base.extend<Fixtures>({
  unauthenticatedPage: async ({ browser }, use) => {
    // New context with no storageState — simulates a logged-out user
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
