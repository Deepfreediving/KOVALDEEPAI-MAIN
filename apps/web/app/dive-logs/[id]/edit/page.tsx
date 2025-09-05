import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAdminClient } from '@/lib/supabase'
import DiveLogForm from '@/app/components/DiveLogForm'
import { DiveLog } from '@/types/supabase'

interface EditDiveLogPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditDiveLogPageProps): Promise<Metadata> {
  const { id } = await params
  
  return {
    title: `Edit Dive Log ${id} | Koval Deep AI`,
    description: 'Edit your freediving session details and performance data.',
  }
}

async function getDiveLog(id: string): Promise<DiveLog | null> {
  const supabase = getAdminClient()
  
  const { data: diveLog, error } = await supabase
    .from('dive_logs')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error || !diveLog) {
    return null
  }
  
  return diveLog
}

export default async function EditDiveLogPage({ params }: EditDiveLogPageProps) {
  const { id } = await params
  const diveLog = await getDiveLog(id)
  
  if (!diveLog) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Edit Dive Log
          </h1>
          <p className="text-gray-600">
            Update your freediving session details and performance data.
          </p>
        </div>

        <DiveLogForm initialData={diveLog} />
      </div>
    </div>
  )
}
