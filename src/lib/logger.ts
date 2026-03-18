import { createServiceClient } from '@/lib/supabase/service'

export async function logActivity(
  action: string,
  userId: string,
  metadata?: Record<string, unknown>
) {
  const db = createServiceClient()
  await db.from('logs').insert({
    level: 'info',
    action,
    user_id: userId,
    metadata: metadata || {},
  } as any)
}

export async function logError(
  action: string,
  error: unknown,
  userId?: string | null,
  metadata?: Record<string, unknown>
) {
  const db = createServiceClient()
  const message = error instanceof Error ? error.message : String(error)
  await db.from('logs').insert({
    level: 'error',
    action,
    user_id: userId ?? null,
    message,
    metadata: metadata || {},
  } as any)
}
