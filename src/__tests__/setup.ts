import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

/**
 * Global test setup — runs once before any test file.
 * Registers auto-mocks for modules that need controlled behavior in tests.
 * Tests then configure these mocks using vi.mocked(...).mockReturnValue(...).
 */

vi.mock('@/lib/supabase/service')
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/middleware')
vi.mock('@/lib/logger')
vi.mock('next/headers')
