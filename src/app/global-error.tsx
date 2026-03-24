'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface GlobalErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global error boundary that wraps the root layout.
 * Must include `<html>` and `<body>` elements.
 * Catches unhandled errors that occur during rendering of the root layout or any app page.
 */
export default function GlobalError({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    // Log the error to the database when the component mounts
    fetch('/api/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'global_error',
        message: error.message,
        stack: error.stack,
        metadata: {
          digest: error.digest,
          critical: true,
        },
      }),
    }).catch((err) => {
      // If logging fails, log to console as fallback
      console.error('[Global Error] Failed to log error:', err)
    })
  }, [error])

  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '32px',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#f9fafb',
            color: '#1f2937',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle size={24} color='#dc2626' />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            Critical Error
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px', maxWidth: '448px' }}>
            The application encountered a critical error. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = '#2563eb')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = '#3b82f6')
            }
          >
            Refresh Page
          </button>
        </div>
      </body>
    </html>
  )
}
