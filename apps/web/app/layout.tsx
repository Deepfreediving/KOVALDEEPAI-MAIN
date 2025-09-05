import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Koval Deep AI - Freediving Training Assistant',
  description: 'Advanced AI-powered freediving training and safety assistant with dive log management, training plans, and real-time guidance.',
  keywords: ['freediving', 'AI', 'training', 'safety', 'dive logs', 'apnea'],
  authors: [{ name: 'Koval Deep AI' }],
  creator: 'Koval Deep AI',
  publisher: 'Koval Deep AI',
  openGraph: {
    title: 'Koval Deep AI - Freediving Training Assistant',
    description: 'Advanced AI-powered freediving training and safety assistant',
    type: 'website',
    locale: 'en_US',
    siteName: 'Koval Deep AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Koval Deep AI - Freediving Training Assistant',
    description: 'Advanced AI-powered freediving training and safety assistant',
  },
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
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-blue-600">
                    🤿 Koval Deep AI
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  <a
                    href="/dive-logs"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dive Logs
                  </a>
                  <a
                    href="/chat"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    AI Coach
                  </a>
                  <a
                    href="/dashboard"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </a>
                </div>
              </div>
            </div>
          </nav>
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
