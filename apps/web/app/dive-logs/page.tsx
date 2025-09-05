import { Suspense } from 'react'
import { Metadata } from 'next'
import DiveLogsList from '@/app/components/DiveLogsList'
import { getAdminClient } from '@/lib/supabase'

// Force dynamic rendering to prevent SSG issues
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dive Logs | Koval Deep AI',
  description: 'Track and analyze your freediving performance with detailed dive logs.',
  openGraph: {
    title: 'Dive Logs | Koval Deep AI',
    description: 'Track and analyze your freediving performance with detailed dive logs.',
    type: 'website',
  },
}

// This is a server component that fetches data
async function DiveLogsData() {
  const supabase = getAdminClient()
  
  // Fetch dive logs on the server
  const { data: diveLogs, error } = await supabase
    .from('dive_logs')
    .select('*')
    .order('date', { ascending: false })
    .limit(50)
  
  if (error) {
    throw new Error(`Failed to load dive logs: ${error.message}`)
  }

  // Pass the promise to the client component for streaming
  const diveLogsPromise = Promise.resolve(diveLogs || [])
  
  return <DiveLogsList diveLogsPromise={diveLogsPromise} />
}

// Loading component
function DiveLogsLoading() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-40 bg-gray-300 rounded animate-pulse"></div>
        <div className="h-10 w-32 bg-blue-300 rounded animate-pulse"></div>
      </div>

      {/* Card Skeletons */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-24 bg-gray-300 rounded animate-pulse"></div>
                <div className="h-5 w-12 bg-green-300 rounded animate-pulse"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-5 w-16 bg-gray-300 rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
              
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div className="flex flex-col gap-2 ml-4">
              <div className="h-8 w-16 bg-blue-300 rounded animate-pulse"></div>
              <div className="h-8 w-16 bg-gray-300 rounded animate-pulse"></div>
              <div className="h-8 w-16 bg-red-300 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DiveLogsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🤿 Dive Logs
          </h1>
          <p className="text-gray-600">
            Track your freediving progress and analyze your performance over time.
          </p>
        </div>

        {/* Dive Logs Content with Suspense Boundary */}
        <Suspense fallback={<DiveLogsLoading />}>
          <DiveLogsData />
        </Suspense>
      </div>
    </div>
  )
}
