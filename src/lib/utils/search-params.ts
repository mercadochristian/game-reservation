/**
 * Safely extract a string parameter from Next.js searchParams.
 * searchParams can have values as string or string[] in async contexts.
 */
export function getStringParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback = ''
): string {
  const v = params[key]
  return typeof v === 'string' ? v : fallback
}

/**
 * Safely extract an integer parameter from Next.js searchParams.
 * Returns fallback if param is missing or invalid.
 */
export function getIntParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback = 1
): number {
  const v = params[key]
  const n = typeof v === 'string' ? parseInt(v, 10) : NaN
  return isNaN(n) || n < 1 ? fallback : n
}
