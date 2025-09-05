'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerClient } from '@/lib/supabase'
import type { Database, TablesInsert, TablesUpdate } from '@/types/supabase'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Helper function to get the server-side Supabase client for server actions
async function getSupabaseServerClient() {
  const cookieStore = await cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Server Action for creating dive logs
export async function createDiveLog(formData: FormData) {
  const supabase = await getSupabaseServerClient()
  
  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Authentication required' }
  }
  
  // Prepare the dive log data according to the database schema
  const diveLogData: TablesInsert<'dive_logs'> = {
    user_id: user.id,
    date: formData.get('date') as string,
    location: formData.get('location') as string || null,
    reached_depth: Number(formData.get('depth')) || null,
    total_dive_time: Number(formData.get('duration')) || null,
    notes: formData.get('notes') as string || null,
  }

  try {
    const { error } = await supabase
      .from('dive_logs')
      .insert([diveLogData])

    if (error) throw error

    // Revalidate the dive logs page
    revalidatePath('/dive-logs')
    
    return { success: true }
  } catch (error) {
    console.error('Failed to create dive log:', error)
    return { success: false, error: 'Failed to create dive log' }
  }
}

// Server Action for updating dive logs
export async function updateDiveLog(id: string, formData: FormData) {
  const supabase = await getSupabaseServerClient()
  
  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Authentication required' }
  }
  
  // Prepare the update data according to the database schema
  const updates: TablesUpdate<'dive_logs'> = {
    date: formData.get('date') as string,
    location: formData.get('location') as string || null,
    reached_depth: Number(formData.get('depth')) || null,
    total_dive_time: Number(formData.get('duration')) || null,
    notes: formData.get('notes') as string || null,
  }

  try {
    const { error } = await supabase
      .from('dive_logs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the record

    if (error) throw error

    revalidatePath('/dive-logs')
    return { success: true }
  } catch (error) {
    console.error('Failed to update dive log:', error)
    return { success: false, error: 'Failed to update dive log' }
  }
}

// Server Action for deleting dive logs
export async function deleteDiveLog(id: string) {
  const supabase = await getSupabaseServerClient()

  // Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Authentication required' }
  }

  try {
    const { error } = await supabase
      .from('dive_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the record

    if (error) throw error

    revalidatePath('/dive-logs')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete dive log:', error)
    return { success: false, error: 'Failed to delete dive log' }
  }
}

// Server Action with redirect example (following Next.js docs best practices)
export async function createDiveLogAndRedirect(formData: FormData) {
  const result = await createDiveLog(formData)
  
  if (result.success) {
    // Revalidate cache before redirecting
    revalidatePath('/dive-logs')
    // Redirect after successful creation
    redirect('/dive-logs')
  }
  
  return result
}
