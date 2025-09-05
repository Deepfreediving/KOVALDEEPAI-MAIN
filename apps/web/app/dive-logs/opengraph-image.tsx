import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

// Dynamic OG image for dive logs
export default function DiveLogsOGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #0ea5e9 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          position: 'relative',
        }}
      >
        {/* Wave pattern background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              marginBottom: 20,
              opacity: 0.9,
            }}
          >
            📊 Dive Logs
          </div>
          
          <div
            style={{
              fontSize: 64,
              fontWeight: 'bold',
              marginBottom: 20,
              background: 'linear-gradient(90deg, #ffffff 0%, #bfdbfe 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            KovalAI
          </div>
          
          <div
            style={{
              fontSize: 28,
              opacity: 0.9,
              maxWidth: 700,
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            Track Your Freediving Progress with AI Analytics
          </div>
          
          <div
            style={{
              display: 'flex',
              marginTop: 40,
              gap: 30,
              fontSize: 18,
              opacity: 0.8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              🏊‍♂️ Session Tracking
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              📈 Progress Analysis
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              🛡️ Safety Insights
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
