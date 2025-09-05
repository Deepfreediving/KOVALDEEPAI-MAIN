'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DiveLogError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dive log page error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <div className="flex justify-center mb-4">
            <svg
              className="w-16 h-16 text-red-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-red-900 mb-2">
            Something went wrong!
          </h2>
          
          <p className="text-red-700 mb-6">
            We encountered an error while loading this dive log. This could be due to:
          </p>
          
          <ul className="text-left text-red-700 mb-6 space-y-1">
            <li>• The dive log might not exist</li>
            <li>• There could be a temporary connection issue</li>
            <li>• You might not have permission to view this log</li>
          </ul>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
            >
              🔄 Try again
            </button>
            
            <Link
              href="/dive-logs"
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
            >
              ← Back to dive logs
            </Link>
          </div>
          
          {process.env.NODE_ENV === 'development' && error.message && (
            <details className="mt-6 p-4 bg-red-100 rounded text-left">
              <summary className="cursor-pointer font-medium text-red-800">
                Developer Error Details
              </summary>
              <pre className="mt-2 text-sm text-red-700 whitespace-pre-wrap">
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
