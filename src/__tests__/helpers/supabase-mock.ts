import { vi } from 'vitest'

/**
 * Creates a chainable query builder mock that can be used with .from(), .select(), .in(), etc.
 * The builder itself is thenable so it can be awaited directly or chained further.
 * By default resolves to { data: null, error: null }.
 *
 * Usage in tests:
 *   const client = createMockServiceClient()
 *   vi.mocked(createServiceClient).mockReturnValue(client)
 *   vi.mocked(client.from).mockReturnValue(queryBuilder)
 */
function createQueryBuilder() {
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
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  // Make the builder itself thenable so `await client.from('x').select('*')` works
  builder.then = vi.fn((onFulfilled: any) => {
    return Promise.resolve({ data: null, error: null }).then(onFulfilled)
  })
  builder.catch = vi.fn()
  builder.finally = vi.fn()

  return builder
}

/**
 * Factory for a fully-typed mock Supabase service client.
 * This is used by server-side code that needs unrestricted (service-role) access.
 */
export function createMockServiceClient() {
  const queryBuilder = createQueryBuilder()

  return {
    from: vi.fn().mockReturnValue(queryBuilder),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }
}

/**
 * Factory for a fully-typed mock Supabase server client.
 * This is used by middleware and server-side code with RLS enforcement.
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
