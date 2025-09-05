import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

// Default OG image generation
export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
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
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          }}
        />
        
        {/* Main content */}
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
              fontSize: 80,
              fontWeight: 'bold',
              marginBottom: 20,
              background: 'linear-gradient(90deg, #ffffff 0%, #e0f2fe 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            KovalAI
          </div>
          
          <div
            style={{
              fontSize: 32,
              opacity: 0.9,
              maxWidth: 800,
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            Deep Freediving AI Assistant
          </div>
          
          <div
            style={{
              fontSize: 24,
              marginTop: 30,
              opacity: 0.8,
              padding: '10px 20px',
              borderRadius: 25,
              border: '2px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
            }}
          >
            Advanced Training & Safety Analytics
          </div>
        </div>
        
        {/* Bottom accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #06b6d4 0%, #3b82f6 50%, #1e3a8a 100%)',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
