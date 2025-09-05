import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminClient } from '@/lib/supabase'
import { DiveLog } from '@/types/supabase'

interface DiveLogPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: DiveLogPageProps): Promise<Metadata> {
  const { id } = await params
  
  // Fetch dive log data for metadata
  const supabase = getAdminClient()
  const { data: diveLog, error } = await supabase
    .from('dive_logs')
    .select('*')
    .eq('id', id)
    .single()

  // Type assertion to help TypeScript understand the shape
  const typedDiveLog = (diveLog && !error) ? diveLog as DiveLog : null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const title = typedDiveLog 
    ? `${typedDiveLog.discipline || 'Freedive'} - ${formatDate(typedDiveLog.date)} | Koval Deep AI`
    : `Dive Log ${id} | Koval Deep AI`
    
  const description = typedDiveLog 
    ? `Freediving session: ${typedDiveLog.reached_depth ? `${typedDiveLog.reached_depth}m depth` : 'Depth tracking'}, ${typedDiveLog.location || 'Location tracking'}, Surface protocol: ${typedDiveLog.surface_protocol || 'Recorded'}. Advanced freediving analytics and AI-powered insights.`
    : 'View detailed information about this freediving session with advanced analytics and AI-powered insights.'
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: typedDiveLog?.created_at,
      modifiedTime: typedDiveLog?.updated_at,
      tags: [
        'freediving',
        'dive log',
        typedDiveLog?.discipline,
        typedDiveLog?.location,
        'performance tracking'
      ].filter(Boolean) as string[],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

async function DiveLogDetails({ id }: { id: string }) {
  const supabase = getAdminClient()
  
  const { data: diveLog, error } = await supabase
    .from('dive_logs')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error || !diveLog) {
    notFound()
  }

  // Type assertion to ensure proper typing
  const typedDiveLog: DiveLog = diveLog

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {typedDiveLog.discipline || 'Freedive'} - {formatDate(typedDiveLog.date)}
          </h1>
          <p className="text-gray-600">
            📍 {typedDiveLog.location || 'Unknown location'}
          </p>
        </div>
        
        <div className="flex gap-3">
          <Link
            href={`/dive-logs/${id}/edit`}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
          >
            ✏️ Edit
          </Link>
          <Link
            href="/dive-logs"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition-colors"
          >
            ← Back to Logs
          </Link>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Summary</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Depth Performance */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Depth Performance</h3>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">
                {typedDiveLog.reached_depth ? `${typedDiveLog.reached_depth}m` : 'N/A'}
              </p>
              {typedDiveLog.target_depth && (
                <p className="text-sm text-gray-600">
                  Target: {typedDiveLog.target_depth}m
                </p>
              )}
              {typedDiveLog.mouthfill_depth && (
                <p className="text-sm text-blue-600">
                  💨 Mouthfill: {typedDiveLog.mouthfill_depth}m
                </p>
              )}
            </div>
          </div>

          {/* Time Performance */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Time Performance</h3>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(typedDiveLog.total_dive_time)}
              </p>
              {typedDiveLog.bottom_time && (
                <p className="text-sm text-gray-600">
                  Bottom: {formatTime(typedDiveLog.bottom_time)}
                </p>
              )}
            </div>
          </div>

          {/* Surface Protocol */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Surface Protocol</h3>
            <div className="space-y-1">
              <span className={`inline-flex px-2 py-1 text-sm font-medium rounded ${
                typedDiveLog.surface_protocol === 'OK' ? 'bg-green-100 text-green-800' :
                typedDiveLog.surface_protocol === 'LMC' ? 'bg-yellow-100 text-yellow-800' :
                typedDiveLog.surface_protocol === 'BO' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {typedDiveLog.surface_protocol || 'Not recorded'}
              </span>
            </div>
          </div>

          {/* Safety Issues */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Safety</h3>
            <div className="space-y-1">
              {typedDiveLog.squeeze && (
                <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded mr-1">
                  Squeeze
                </span>
              )}
              {typedDiveLog.blackout && (
                <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded mr-1">
                  Blackout
                </span>
              )}
              {typedDiveLog.lmc && (
                <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded mr-1">
                  LMC
                </span>
              )}
              {!typedDiveLog.squeeze && !typedDiveLog.blackout && !typedDiveLog.lmc && (
                <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                  Clean dive
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dive Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Dive Details</h2>
          
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Date</dt>
              <dd className="text-sm text-gray-900">{formatDate(typedDiveLog.date)}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Discipline</dt>
              <dd className="text-sm text-gray-900">{typedDiveLog.discipline || 'Not specified'}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Location</dt>
              <dd className="text-sm text-gray-900">{typedDiveLog.location || 'Not specified'}</dd>
            </div>
            
            {typedDiveLog.water_temp && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Water Temperature</dt>
                <dd className="text-sm text-gray-900">{typedDiveLog.water_temp}°C</dd>
              </div>
            )}
            
            {typedDiveLog.visibility_meters && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Visibility</dt>
                <dd className="text-sm text-gray-900">{typedDiveLog.visibility_meters}m</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Issues & Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Issues & Notes</h2>
          
          <div className="space-y-4">
            {typedDiveLog.issue_depth && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Issue Details</h3>
                <p className="text-sm text-gray-900">
                  Issue occurred at {typedDiveLog.issue_depth}m
                </p>
                {typedDiveLog.issue_comment && (
                  <p className="text-sm text-gray-600 mt-1">{typedDiveLog.issue_comment}</p>
                )}
              </div>
            )}
            
            {typedDiveLog.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{typedDiveLog.notes}</p>
              </div>
            )}
            
            {!typedDiveLog.issue_depth && !typedDiveLog.notes && (
              <p className="text-sm text-gray-500 italic">No additional notes recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function DiveLogPage({ params }: DiveLogPageProps) {
  const { id } = await params

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div>Loading...</div>}>
        <DiveLogDetails id={id} />
      </Suspense>
    </div>
  )
}
