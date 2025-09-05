import { Metadata } from 'next'
import DiveLogForm from '@/app/components/DiveLogForm'

// Force dynamic rendering to prevent SSG issues
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'New Dive Log | Koval Deep AI',
  description: 'Create a new freediving log entry to track your performance.',
}

export default function NewDiveLogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🤿 New Dive Log
          </h1>
          <p className="text-gray-600">
            Record your freediving session details to track your progress.
          </p>
        </div>

        {/* Form */}
        <DiveLogForm />
      </div>
    </div>
  )
}
