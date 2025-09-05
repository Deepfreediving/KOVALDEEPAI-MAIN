import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KovalAI - Deep Freediving AI Assistant',
    short_name: 'KovalAI',
    description: 'Advanced AI-powered freediving training assistant and dive log management system.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1e40af',
    theme_color: '#0ea5e9',
    orientation: 'portrait',
    categories: ['sports', 'health', 'productivity'],
    lang: 'en',
    icons: [
      {
        src: '/icon.png',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
