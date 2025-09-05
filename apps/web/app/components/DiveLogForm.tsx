'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { useFormState } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createDiveLog, updateDiveLog, deleteDiveLog } from '@/app/actions/dive-logs'
import { DiveLog } from '@/types/supabase'

interface DiveLogFormProps {
  initialData?: Partial<DiveLog>
  onSuccess?: (diveLog: DiveLog) => void
  onCancel?: () => void
  darkMode?: boolean
}

type FormState = {
  success: boolean
  error?: string
  diveLog?: DiveLog
}

export default function DiveLogForm({ 
  initialData, 
  onSuccess, 
  onCancel,
  darkMode = false 
}: DiveLogFormProps) {
  const router = useRouter()
  const [isEditMode] = useState(!!initialData?.id)
  const [isPending, startTransition] = useTransition()
  
  // Optimistic updates for better UX
  const [optimisticLogs, addOptimisticLog] = useOptimistic<DiveLog[], DiveLog>(
    [],
    (state, newLog) => [newLog, ...state]
  )

  // Form state with useFormState for progressive enhancement
  const [state, formAction] = useFormState(
    async (prevState: FormState, formData: FormData): Promise<FormState> => {
      try {
        // Validate required fields
        const date = formData.get('date') as string
        const discipline = formData.get('discipline') as string
        
        if (!date || !discipline) {
          return {
            success: false,
            error: 'Date and discipline are required'
          }
        }

        let result
        if (isEditMode && initialData?.id) {
          result = await updateDiveLog(initialData.id, formData)
        } else {
          result = await createDiveLog(formData)
        }

        if (result.success && result.diveLog) {
          onSuccess?.(result.diveLog)
          return {
            success: true,
            diveLog: result.diveLog
          }
        } else {
          return {
            success: false,
            error: result.error || 'Failed to save dive log'
          }
        }
      } catch (error) {
        console.error('Form action error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'An error occurred'
        }
      }
    },
    { success: false }
  )

  // Delete handler with optimistic update
  const handleDelete = async () => {
    if (!initialData?.id) return
    
    if (!confirm('Are you sure you want to delete this dive log?')) return

    try {
      const result = await deleteDiveLog(initialData.id)
      if (result.success) {
        router.push('/dive-logs')
      } else {
        alert(result.error || 'Failed to delete dive log')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete dive log')
    }
  }

  const themeClasses = {
    container: darkMode 
      ? "bg-gray-800 border-gray-600 text-white" 
      : "bg-white border-gray-200 text-gray-900",
    input: darkMode
      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500",
    button: darkMode
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : "bg-blue-500 hover:bg-blue-600 text-white",
    dangerButton: darkMode
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-red-500 hover:bg-red-600 text-white",
    cancelButton: darkMode
      ? "bg-gray-600 hover:bg-gray-700 text-gray-300"
      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
  }

  return (
    <div className={`max-w-2xl mx-auto p-6 rounded-lg border ${themeClasses.container}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {isEditMode ? '✏️ Edit Dive Log' : '🤿 New Dive Log'}
        </h2>
        {isEditMode && (
          <button
            onClick={handleDelete}
            className={`px-3 py-1 text-sm rounded ${themeClasses.dangerButton}`}
            type="button"
          >
            🗑️ Delete
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {state.error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {state.error}
        </div>
      )}
      
      {state.success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          Dive log {isEditMode ? 'updated' : 'created'} successfully!
        </div>
      )}

      <form action={formAction} className="space-y-6">
        {/* Hidden ID field for edits */}
        {initialData?.id && (
          <input type="hidden" name="id" value={initialData.id} />
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-2">
              Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              defaultValue={initialData?.date || new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
              required
            />
          </div>

          <div>
            <label htmlFor="discipline" className="block text-sm font-medium mb-2">
              Discipline *
            </label>
            <select
              id="discipline"
              name="discipline"
              defaultValue={initialData?.discipline || ''}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
              required
            >
              <option value="">Select discipline</option>
              <option value="CNF">Constant Weight No Fins (CNF)</option>
              <option value="CWT">Constant Weight (CWT)</option>
              <option value="FIM">Free Immersion (FIM)</option>
              <option value="CWTB">Constant Weight Bi-Fins (CWTB)</option>
              <option value="VWT">Variable Weight (VWT)</option>
              <option value="NLT">No Limits (NLT)</option>
              <option value="STA">Static Apnea (STA)</option>
              <option value="DNF">Dynamic No Fins (DNF)</option>
              <option value="DYN">Dynamic With Fins (DYN)</option>
              <option value="DYNB">Dynamic Bi-Fins (DYNB)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium mb-2">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            defaultValue={initialData?.location || ''}
            placeholder="e.g., Blue Hole, Dean's Blue Hole"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
          />
        </div>

        {/* Depth Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="target_depth" className="block text-sm font-medium mb-2">
              Target Depth (m)
            </label>
            <input
              type="number"
              id="target_depth"
              name="target_depth"
              defaultValue={initialData?.target_depth || ''}
              min="0"
              step="0.1"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
            />
          </div>

          <div>
            <label htmlFor="reached_depth" className="block text-sm font-medium mb-2">
              Reached Depth (m)
            </label>
            <input
              type="number"
              id="reached_depth"
              name="reached_depth"
              defaultValue={initialData?.reached_depth || ''}
              min="0"
              step="0.1"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
            />
          </div>

          <div>
            <label htmlFor="mouthfill_depth" className="block text-sm font-medium mb-2">
              Mouthfill Depth (m)
            </label>
            <input
              type="number"
              id="mouthfill_depth"
              name="mouthfill_depth"
              defaultValue={initialData?.mouthfill_depth || ''}
              min="0"
              step="0.1"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
            />
          </div>
        </div>

        {/* Time Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="total_dive_time" className="block text-sm font-medium mb-2">
              Total Dive Time (seconds)
            </label>
            <input
              type="number"
              id="total_dive_time"
              name="total_dive_time"
              defaultValue={initialData?.total_dive_time || ''}
              min="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
            />
          </div>

          <div>
            <label htmlFor="bottom_time" className="block text-sm font-medium mb-2">
              Bottom Time (seconds)
            </label>
            <input
              type="number"
              id="bottom_time"
              name="bottom_time"
              defaultValue={initialData?.bottom_time || ''}
              min="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
            />
          </div>
        </div>

        {/* Safety & Issues */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Safety & Performance</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="issue_depth" className="block text-sm font-medium mb-2">
                Issue Depth (m)
              </label>
              <input
                type="number"
                id="issue_depth"
                name="issue_depth"
                defaultValue={initialData?.issue_depth || ''}
                min="0"
                step="0.1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
              />
            </div>

            <div>
              <label htmlFor="surface_protocol" className="block text-sm font-medium mb-2">
                Surface Protocol
              </label>
              <select
                id="surface_protocol"
                name="surface_protocol"
                defaultValue={initialData?.surface_protocol || ''}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
              >
                <option value="">Select protocol</option>
                <option value="OK">OK - Clean performance</option>
                <option value="LMC">LMC - Loss of Motor Control</option>
                <option value="BO">BO - Blackout</option>
                <option value="DQ">DQ - Disqualified</option>
                <option value="DNF">DNF - Did Not Finish</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="squeeze"
                defaultChecked={initialData?.squeeze || false}
                className="mr-2"
              />
              Squeeze experienced
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                name="blackout"
                defaultChecked={initialData?.blackout || false}
                className="mr-2"
              />
              Blackout occurred
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                name="lmc"
                defaultChecked={initialData?.lmc || false}
                className="mr-2"
              />
              LMC occurred
            </label>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-2">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            defaultValue={initialData?.notes || ''}
            rows={4}
            placeholder="Any additional notes about the dive..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isPending}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 ${themeClasses.button}`}
          >
            {isPending ? (
              <>⏳ {isEditMode ? 'Updating...' : 'Saving...'}</>
            ) : (
              <>💾 {isEditMode ? 'Update Dive Log' : 'Save Dive Log'}</>
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${themeClasses.cancelButton}`}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
