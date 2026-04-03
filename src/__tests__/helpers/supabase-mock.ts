import { vi } from 'vitest'

/**
 * Creates a chainable query builder mock.
 * Exported so tests can create per-table builders for complex multi-table mocks.
 */
export function createQueryBuilder() {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  builder.then = vi.fn((onFulfilled: any) => {
    return Promise.resolve({ data: null, error: null }).then(onFulfilled)
  })
  builder.catch = vi.fn()
  builder.finally = vi.fn()

  return builder
}

/**
 * Factory for a mock Supabase service client (bypasses RLS).
 * Includes `rpc` for Postgres function calls and `storage` for file operations.
 */
export function createMockServiceClient() {
  const queryBuilder = createQueryBuilder()

  return {
    from: vi.fn().mockReturnValue(queryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  }
}

/**
 * Factory for a mock Supabase server client (respects RLS).
 */
export function createMockServerClient() {
  const queryBuilder = createQueryBuilder()

  return {
    from: vi.fn().mockReturnValue(queryBuilder),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }
}
