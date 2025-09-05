'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteDiveLog } from '@/app/actions/dive-logs'
import { DiveLog } from '@/types/supabase'

interface DiveLogsListProps {
  diveLogsPromise: Promise<DiveLog[]>
  darkMode?: boolean
}

export default function DiveLogsList({ diveLogsPromise, darkMode = false }: DiveLogsListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [diveLogs, setDiveLogs] = useState<DiveLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Resolve the promise in useEffect for React 18 compatibility
  useEffect(() => {
    diveLogsPromise
      .then((logs) => {
        setDiveLogs(logs)
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load dive logs')
        setIsLoading(false)
      })
  }, [diveLogsPromise])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Loading skeleton */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 bg-white border border-gray-200 rounded-lg animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">Error loading dive logs: {error}</p>
        <button 
          onClick={() => router.refresh()} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  const handleDelete = async (diveLog: DiveLog) => {
    if (!confirm(`Delete dive log from ${diveLog.date} at ${diveLog.location || 'unknown location'}?`)) {
      return
    }

    setDeletingId(diveLog.id)
    
    try {
      const result = await deleteDiveLog(diveLog.id)
      
      if (result.success) {
        // Use startTransition for better UX during navigation/revalidation
        startTransition(() => {
          router.refresh()
        })
      } else {
        alert(result.error || 'Failed to delete dive log')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete dive log')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (seconds: number | null) => {
    if (!seconds) return null
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const themeClasses = {
    container: darkMode 
      ? "bg-gray-800 border-gray-600" 
      : "bg-white border-gray-200",
    card: darkMode
      ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-650"
      : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50",
    text: {
      primary: darkMode ? "text-white" : "text-gray-900",
      secondary: darkMode ? "text-gray-300" : "text-gray-600",
      muted: darkMode ? "text-gray-400" : "text-gray-500"
    },
    badge: {
      success: "bg-green-500 text-white",
      warning: "bg-yellow-500 text-black",
      danger: "bg-red-500 text-white",
      info: "bg-blue-500 text-white"
    },
    button: {
      primary: darkMode
        ? "bg-blue-600 hover:bg-blue-700 text-white"
        : "bg-blue-500 hover:bg-blue-600 text-white",
      secondary: darkMode
        ? "bg-gray-600 hover:bg-gray-700 text-gray-300"
        : "bg-gray-200 hover:bg-gray-300 text-gray-700",
      danger: darkMode
        ? "bg-red-600 hover:bg-red-700 text-white"
        : "bg-red-500 hover:bg-red-600 text-white"
    }
  }

  if (diveLogs.length === 0) {
    return (
      <div className={`p-8 text-center rounded-lg border ${themeClasses.container}`}>
        <div className="text-6xl mb-4">🤿</div>
        <h3 className={`text-xl font-semibold mb-2 ${themeClasses.text.primary}`}>
          No dive logs yet
        </h3>
        <p className={`mb-4 ${themeClasses.text.secondary}`}>
          Start tracking your freediving progress by creating your first dive log.
        </p>
        <Link
          href="/dive-logs/new"
          className={`inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors ${themeClasses.button.primary}`}
        >
          ➕ Create First Dive Log
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
          Dive Logs ({diveLogs.length})
        </h2>
        <Link
          href="/dive-logs/new"
          className={`px-4 py-2 rounded-md font-medium transition-colors ${themeClasses.button.primary}`}
        >
          ➕ New Dive Log
        </Link>
      </div>

      {/* Dive Logs Grid */}
      <div className="grid gap-4">
        {diveLogs.map((diveLog) => (
          <div
            key={diveLog.id}
            className={`p-4 rounded-lg border transition-colors ${themeClasses.card}`}
          >
            <div className="flex justify-between items-start">
              {/* Main Content */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                    {diveLog.discipline || 'Freedive'}
                  </h3>
                  
                  {/* Performance Badge */}
                  {diveLog.surface_protocol && (
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      diveLog.surface_protocol === 'OK' ? themeClasses.badge.success :
                      diveLog.surface_protocol === 'LMC' ? themeClasses.badge.warning :
                      diveLog.surface_protocol === 'BO' ? themeClasses.badge.danger :
                      themeClasses.badge.info
                    }`}>
                      {diveLog.surface_protocol}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                  {/* Date & Location */}
                  <div>
                    <p className={`text-sm ${themeClasses.text.muted}`}>Date & Location</p>
                    <p className={`font-medium ${themeClasses.text.primary}`}>
                      {formatDate(diveLog.date)}
                    </p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>
                      📍 {diveLog.location || 'Unknown'}
                    </p>
                  </div>

                  {/* Depth Performance */}
                  <div>
                    <p className={`text-sm ${themeClasses.text.muted}`}>Depth Performance</p>
                    <p className={`font-medium ${themeClasses.text.primary}`}>
                      {diveLog.reached_depth ? `${diveLog.reached_depth}m` : 'N/A'}
                      {diveLog.target_depth && (
                        <span className={`text-sm ${themeClasses.text.secondary}`}>
                          {' '}/ {diveLog.target_depth}m target
                        </span>
                      )}
                    </p>
                    {diveLog.mouthfill_depth && (
                      <p className={`text-sm ${themeClasses.text.secondary}`}>
                        💨 Mouthfill: {diveLog.mouthfill_depth}m
                      </p>
                    )}
                  </div>

                  {/* Time Performance */}
                  <div>
                    <p className={`text-sm ${themeClasses.text.muted}`}>Time Performance</p>
                    <p className={`font-medium ${themeClasses.text.primary}`}>
                      {formatTime(diveLog.total_dive_time) || 'N/A'}
                    </p>
                    {diveLog.bottom_time && (
                      <p className={`text-sm ${themeClasses.text.secondary}`}>
                        ⏱️ Bottom: {formatTime(diveLog.bottom_time)}
                      </p>
                    )}
                  </div>

                  {/* Safety Issues */}
                  <div>
                    <p className={`text-sm ${themeClasses.text.muted}`}>Safety</p>
                    <div className="flex flex-wrap gap-1">
                      {diveLog.squeeze && (
                        <span className={`px-1 py-0.5 text-xs rounded ${themeClasses.badge.warning}`}>
                          Squeeze
                        </span>
                      )}
                      {diveLog.blackout && (
                        <span className={`px-1 py-0.5 text-xs rounded ${themeClasses.badge.danger}`}>
                          BO
                        </span>
                      )}
                      {diveLog.lmc && (
                        <span className={`px-1 py-0.5 text-xs rounded ${themeClasses.badge.warning}`}>
                          LMC
                        </span>
                      )}
                      {!diveLog.squeeze && !diveLog.blackout && !diveLog.lmc && (
                        <span className={`px-1 py-0.5 text-xs rounded ${themeClasses.badge.success}`}>
                          Clean
                        </span>
                      )}
                    </div>
                    {diveLog.issue_depth && (
                      <p className={`text-sm ${themeClasses.text.secondary}`}>
                        ⚠️ Issue at {diveLog.issue_depth}m
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes Preview */}
                {diveLog.notes && (
                  <p className={`text-sm ${themeClasses.text.secondary} line-clamp-2`}>
                    📝 {diveLog.notes.length > 100 
                      ? `${diveLog.notes.slice(0, 100)}...` 
                      : diveLog.notes
                    }
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 ml-4">
                <Link
                  href={`/dive-logs/${diveLog.id}`}
                  className={`px-3 py-1 text-sm rounded transition-colors ${themeClasses.button.primary}`}
                >
                  👁️ View
                </Link>
                
                <Link
                  href={`/dive-logs/${diveLog.id}/edit`}
                  className={`px-3 py-1 text-sm rounded transition-colors ${themeClasses.button.secondary}`}
                >
                  ✏️ Edit
                </Link>
                
                <button
                  onClick={() => handleDelete(diveLog)}
                  disabled={deletingId === diveLog.id || isPending}
                  className={`px-3 py-1 text-sm rounded transition-colors disabled:opacity-50 ${themeClasses.button.danger}`}
                >
                  {deletingId === diveLog.id ? '⏳' : '🗑️'} Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading overlay during transitions */}
      {isPending && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-4 rounded-lg ${themeClasses.container}`}>
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className={themeClasses.text.primary}>Refreshing...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
