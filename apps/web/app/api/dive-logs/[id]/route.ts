import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database, TablesUpdate } from '@/types/supabase'

// Helper function to get the server-side Supabase client for API routes
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
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/dive-logs/[id] - Get a specific dive log
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await getSupabaseServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { data: diveLog, error } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching dive log:', error)
      return NextResponse.json(
        { success: false, error: 'Dive log not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: diveLog })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/dive-logs/[id] - Update a specific dive log
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const supabase = await getSupabaseServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Prepare the update data according to the database schema
    const updates: TablesUpdate<'dive_logs'> = {
      date: body.date,
      location: body.location || null,
      reached_depth: Number(body.depth) || null,
      total_dive_time: Number(body.duration) || null,
      notes: body.notes || null,
    }

    const { data, error } = await supabase
      .from('dive_logs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the record
      .select()
      .single()

    if (error) {
      console.error('Error updating dive log:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update dive log' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Dive log not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/dive-logs/[id] - Delete a specific dive log
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await getSupabaseServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from('dive_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the record

    if (error) {
      console.error('Error deleting dive log:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete dive log' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Dive log deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
