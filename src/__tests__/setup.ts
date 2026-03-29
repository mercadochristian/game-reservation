import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

/**
 * Global test setup — runs once before any test file.
 * Registers auto-mocks for modules that need controlled behavior in tests.
 * Tests then configure these mocks using vi.mocked(...).mockReturnValue(...).
 */

// Mock IntersectionObserver for Framer Motion's whileInView
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
globalThis.IntersectionObserver = MockIntersectionObserver as any

vi.mock('@/lib/supabase/service')
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/middleware')
vi.mock('@/lib/logger')
vi.mock('next/headers')
