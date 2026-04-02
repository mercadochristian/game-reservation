import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logError } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

const logErrorSchema = z.object({
  action: z.string().min(1, 'action is required'),
  message: z.string().min(1, 'message is required'),
  stack: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

type LogErrorPayload = z.infer<typeof logErrorSchema>

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validation = logErrorSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: validation.error.flatten(),
        },
        { status: 400 }
      )
    }

    const payload: LogErrorPayload = validation.data

    // Try to get the current user
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: userData } = await supabase.auth.getUser()
      userId = userData?.user?.id ?? null
    } catch (err) {
      // If we can't get the user, just log without user_id
      // This is expected for errors that happen pre-auth
    }

    // Log the error
    await logError(payload.action, payload.message, userId, {
      ...(payload.metadata || {}),
      ...(payload.stack && { stack: payload.stack }),
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    // Still try to log this error
    try {
      const message = err instanceof Error ? err.message : String(err)
      await logError('api.logs.error.unhandled', message, null, {
        originalError: true,
      })
    } catch (logErr) {
      // If even logging fails, just give up silently
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
