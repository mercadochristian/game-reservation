import type { Database } from '@/types/database'
import { createServiceClient } from '@/lib/supabase/service'

type LogInsert = Database['public']['Tables']['logs']['Insert']

async function insertLog(logData: LogInsert) {
  try {
    const db = createServiceClient()
    await db.from('logs').insert(logData as any)
  } catch (err) {
    // Fallback to console error if DB insert fails
    // We don't throw to avoid cascading failures in calling code
    console.error('[Logger] Failed to insert log:', err)
  }
}

export async function logActivity(
  action: string,
  userId: string,
  metadata?: Record<string, unknown>
) {
  const logData: LogInsert = {
    level: 'info',
    action,
    user_id: userId,
    metadata: (metadata || {}) as any,
  }
  await insertLog(logData)
}

export async function logWarn(
  action: string,
  message: string,
  userId?: string | null,
  metadata?: Record<string, unknown>
) {
  const logData: LogInsert = {
    level: 'warn',
    action,
    user_id: userId ?? null,
    message,
    metadata: (metadata || {}) as any,
  }
  await insertLog(logData)
}

export async function logError(
  action: string,
  error: unknown,
  userId?: string | null,
  metadata?: Record<string, unknown>
) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  const logData: LogInsert = {
    level: 'error',
    action,
    user_id: userId ?? null,
    message,
    metadata: {
      ...metadata,
      ...(stack && { stack }),
    } as any,
  }
  await insertLog(logData)
}
