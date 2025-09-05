import { Metadata } from 'next'

// Default metadata for the application
export const defaultMetadata: Metadata = {
  title: {
    default: 'KovalAI - Deep Freediving AI Assistant',
    template: '%s | KovalAI',
  },
  description: 'Advanced AI-powered freediving training assistant and dive log management system.',
  keywords: [
    'freediving',
    'diving',
    'AI assistant',
    'dive logs',
    'training',
    'deep diving',
    'breath hold',
    'coaching',
    'safety',
    'performance tracking',
  ],
  authors: [{ name: 'KovalAI Team' }],
  creator: 'KovalAI',
  publisher: 'KovalAI',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://kovalai.vercel.app',
    siteName: 'KovalAI',
    title: 'KovalAI - Deep Freediving AI Assistant',
    description: 'Advanced AI-powered freediving training assistant and dive log management system.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'KovalAI - Deep Freediving AI Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KovalAI - Deep Freediving AI Assistant',
    description: 'Advanced AI-powered freediving training assistant and dive log management system.',
    images: ['/og-image.png'],
    creator: '@kovalai',
  },
  verification: {
    google: 'your-google-verification-code', // Replace with actual verification code
  },
  alternates: {
    canonical: 'https://kovalai.vercel.app',
  },
  category: 'Sports & Recreation',
}

// Page-specific metadata
export const diveLogsMetadata: Metadata = {
  title: 'Dive Logs - Track Your Freediving Progress',
  description: 'Manage and analyze your freediving sessions with AI-powered insights and safety recommendations.',
  keywords: [
    'dive logs',
    'freediving sessions',
    'progress tracking',
    'dive analysis',
    'safety recommendations',
  ],
  openGraph: {
    title: 'Dive Logs - Track Your Freediving Progress',
    description: 'Manage and analyze your freediving sessions with AI-powered insights and safety recommendations.',
    url: 'https://kovalai.vercel.app/dive-logs',
  },
}

export const dashboardMetadata: Metadata = {
  title: 'Dashboard - Your Freediving Command Center',
  description: 'Get personalized insights, track your progress, and receive AI-powered coaching recommendations.',
  keywords: [
    'freediving dashboard',
    'progress tracking',
    'AI coaching',
    'performance metrics',
    'training insights',
  ],
  openGraph: {
    title: 'Dashboard - Your Freediving Command Center',
    description: 'Get personalized insights, track your progress, and receive AI-powered coaching recommendations.',
    url: 'https://kovalai.vercel.app/dashboard',
  },
}

export const chatMetadata: Metadata = {
  title: 'AI Chat - Your Freediving Coach',
  description: 'Chat with our advanced AI assistant for personalized freediving advice, safety tips, and training guidance.',
  keywords: [
    'AI chat',
    'freediving coach',
    'training advice',
    'safety tips',
    'personalized guidance',
  ],
  openGraph: {
    title: 'AI Chat - Your Freediving Coach',
    description: 'Chat with our advanced AI assistant for personalized freediving advice, safety tips, and training guidance.',
    url: 'https://kovalai.vercel.app/chat',
  },
}
