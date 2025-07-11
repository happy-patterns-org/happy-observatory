'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
  componentName?: string
}

export function ErrorFallback({ error, resetErrorBoundary, componentName }: ErrorFallbackProps) {
  // Check if it's a rate limit error
  const isRateLimit = error.message?.includes('429') || error.message?.includes('Too Many Requests')

  // Check if it's a connection error
  const isConnectionError =
    error.message?.includes('fetch failed') ||
    error.message?.includes('NetworkError') ||
    error.message?.includes('Failed to fetch')

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-900 mb-1">
            {componentName ? `Error in ${componentName}` : 'Something went wrong'}
          </h3>

          {isRateLimit ? (
            <div className="space-y-2">
              <p className="text-sm text-red-700">
                Rate limit exceeded. Too many requests have been made.
              </p>
              <p className="text-xs text-red-600">Please wait a moment before trying again.</p>
            </div>
          ) : isConnectionError ? (
            <div className="space-y-2">
              <p className="text-sm text-red-700">Unable to connect to the server.</p>
              <p className="text-xs text-red-600">
                Please check if the bridge server is running on port 8080.
              </p>
            </div>
          ) : (
            <p className="text-sm text-red-700">
              {error.message || 'An unexpected error occurred'}
            </p>
          )}

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-3">
              <summary className="text-xs text-red-600 cursor-pointer">Technical details</summary>
              <pre className="mt-2 text-xs text-red-600 overflow-x-auto whitespace-pre-wrap">
                {error.stack}
              </pre>
            </details>
          )}

          <button
            type="button"
            onClick={resetErrorBoundary}
            className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-red-300 rounded text-sm text-red-700 hover:bg-red-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
