import Link from 'next/link'

export default function DiveLogNotFound() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
          <div className="flex justify-center mb-4">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.02-5.7-2.563M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dive Log Not Found
          </h1>
          
          <p className="text-gray-600 mb-6">
            The dive log you're looking for doesn't exist or has been removed.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dive-logs"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              ← Back to dive logs
            </Link>
            
            <Link
              href="/dive-logs/new"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
            >
              ➕ Create new dive log
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
