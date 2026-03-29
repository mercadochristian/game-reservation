'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React class-based error boundary.
 *
 * Catches unhandled render/lifecycle errors in the component tree, logs them
 * to the console, and shows a user-friendly recovery UI. Pass a custom
 * `fallback` prop to override the default error card.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log full technical details for debugging — never shown to users
    console.error('[ErrorBoundary] Caught render error:', error, info)

    // Log to database (fire-and-forget, don't block rendering)
    fetch('/api/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'error_boundary',
        message: error.message,
        stack: error.stack,
        metadata: {
          componentStack: info.componentStack,
        },
      }),
    }).catch((err) => {
      // If logging fails, just log to console as fallback
      console.error('[ErrorBoundary] Failed to log error:', err)
    })
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.reset)
    }

    return <DefaultErrorFallback onRetry={this.reset} />
  }
}

/** Default in-place error card rendered when no custom fallback is provided. */
function DefaultErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[240px] p-8 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        An unexpected error occurred. You can try reloading this section or
        refresh the page.
      </p>
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="cursor-pointer gap-2"
        >
          <RefreshCw size={14} />
          Refresh Page
        </Button>
        <Button
          size="sm"
          onClick={onRetry}
          className="cursor-pointer gap-2"
        >
          <RefreshCw size={14} />
          Try Again
        </Button>
      </div>
    </div>
  )
}
