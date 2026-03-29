import { vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Factory for a mock NextRequest object.
 *
 * Usage:
 *   const req = createMockRequest('/api/test', {
 *     method: 'POST',
 *     body: { id: 123 },
 *     headers: { authorization: 'Bearer token' }
 *   })
 */
export function createMockRequest(
  url: string,
  options?: {
    method?: string
    body?: object
    headers?: Record<string, string>
    cookies?: Record<string, string>
  }
): NextRequest {
  const fullUrl = url.startsWith('http') ? url : `http://localhost${url}`

  const init: RequestInit = {
    method: options?.method ?? 'GET',
    headers: new Headers(options?.headers ?? {}),
  }

  if (options?.body) {
    init.body = JSON.stringify(options.body)
    ;(init.headers as Headers).set('content-type', 'application/json')
  }

  if (options?.cookies) {
    const cookieHeader = Object.entries(options.cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
    ;(init.headers as Headers).set('cookie', cookieHeader)
  }

  return new NextRequest(fullUrl, init as RequestInit & { signal?: AbortSignal })
}

/**
 * Factory for a mock NextResponse object with mocked cookie methods.
 *
 * Usage:
 *   const res = createMockResponse()
 *   res.cookies.set('sessionId', 'abc123')
 *   expect(res.cookies.set).toHaveBeenCalledWith('sessionId', 'abc123')
 */
export function createMockResponse(): any {
  // Create a mock response object instead of trying to modify NextResponse
  return {
    status: 200,
    headers: new Headers(),
    cookies: {
      set: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn().mockReturnValue([]),
    },
  }
}
