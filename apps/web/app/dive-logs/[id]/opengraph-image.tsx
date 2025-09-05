import { ImageResponse } from 'next/og'
import { getAdminClient } from '@/lib/supabase'
import { DiveLog } from '@/types/supabase'

export const runtime = 'edge'

export const alt = 'Dive Log Details'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

interface DiveLogOGProps {
  params: Promise<{ id: string }>
}

export default async function Image({ params }: DiveLogOGProps) {
  const { id } = await params
  
  // Fetch dive log data
  const supabase = getAdminClient()
  const { data: diveLog }: { data: DiveLog | null } = await supabase
    .from('dive_logs')
    .select('*')
    .eq('id', id)
    .single()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1e293b',
          backgroundImage: 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 50%, #0f172a 100%)',
          padding: '40px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '30px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              🏊‍♂️
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <h1
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: 0,
                }}
              >
                Koval Deep AI
              </h1>
              <p
                style={{
                  fontSize: '16px',
                  color: '#94a3b8',
                  margin: 0,
                }}
              >
                Freediving Analytics
              </p>
            </div>
          </div>
          
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#334155',
              padding: '10px 20px',
              borderRadius: '20px',
              color: '#94a3b8',
              fontSize: '14px',
            }}
          >
            📅 {diveLog ? formatDate(diveLog.date) : 'Dive Log'}
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '20px',
              margin: 0,
            }}
          >
            {diveLog?.discipline || 'Freedive'} Session
          </h2>
          
          <p
            style={{
              fontSize: '20px',
              color: '#94a3b8',
              marginBottom: '40px',
              margin: 0,
            }}
          >
            📍 {diveLog?.location || 'Dive Location'}
          </p>

          {/* Performance Stats */}
          <div
            style={{
              display: 'flex',
              gap: '40px',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Depth */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#334155',
                padding: '30px',
                borderRadius: '20px',
                minWidth: '160px',
              }}
            >
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: '#3b82f6',
                  marginBottom: '8px',
                }}
              >
                {diveLog?.reached_depth ? `${diveLog.reached_depth}m` : 'N/A'}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Max Depth
              </div>
            </div>

            {/* Time */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#334155',
                padding: '30px',
                borderRadius: '20px',
                minWidth: '160px',
              }}
            >
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: '#10b981',
                  marginBottom: '8px',
                }}
              >
                {formatTime(diveLog?.total_dive_time || null)}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Total Time
              </div>
            </div>

            {/* Protocol */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#334155',
                padding: '30px',
                borderRadius: '20px',
                minWidth: '160px',
              }}
            >
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: diveLog?.surface_protocol === 'OK' ? '#10b981' : 
                        diveLog?.surface_protocol === 'LMC' ? '#f59e0b' : 
                        diveLog?.surface_protocol === 'BO' ? '#ef4444' : '#94a3b8',
                  marginBottom: '8px',
                }}
              >
                {diveLog?.surface_protocol || 'N/A'}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Protocol
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid #334155',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              color: '#64748b',
            }}
          >
            Advanced freediving analytics and AI-powered insights
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
