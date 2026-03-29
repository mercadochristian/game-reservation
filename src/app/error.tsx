'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Next.js route-level error boundary.
 * Catches errors from Server Components and client-side errors within a route segment.
 * Logs the error to the database and shows a user-friendly recovery UI.
 */
export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to the database when the component mounts
    fetch('/api/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'route_error',
        message: error.message,
        stack: error.stack,
        metadata: {
          digest: error.digest,
        },
      }),
    }).catch((err) => {
      // If logging fails, log to console as fallback
      console.error('[Error Page] Failed to log error:', err)
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Something went wrong
      </h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-md">
        An unexpected error occurred on this page. Try refreshing or going back
        to continue.
      </p>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="cursor-pointer gap-2"
        >
          Go Back
        </Button>
        <Button onClick={reset} className="cursor-pointer gap-2">
          <RefreshCw size={16} />
          Try Again
        </Button>
      </div>
    </div>
  )
}
