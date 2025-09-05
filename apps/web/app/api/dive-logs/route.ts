import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database, TablesInsert, TablesUpdate } from '@/types/supabase'

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

// GET /api/dive-logs - Fetch all dive logs for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { data: diveLogs, error } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching dive logs:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch dive logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: diveLogs })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/dive-logs - Create a new dive log
export async function POST(request: NextRequest) {
  try {
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
    
    // Prepare the dive log data according to the database schema
    const diveLogData: TablesInsert<'dive_logs'> = {
      user_id: user.id,
      date: body.date,
      location: body.location || null,
      reached_depth: Number(body.depth) || null,
      total_dive_time: Number(body.duration) || null,
      notes: body.notes || null,
    }

    const { data, error } = await supabase
      .from('dive_logs')
      .insert([diveLogData])
      .select()
      .single()

    if (error) {
      console.error('Error creating dive log:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create dive log' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/dive-logs - Update an existing dive log
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    const supabase = await getSupabaseServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Dive log ID is required' },
        { status: 400 }
      )
    }
    
    // Prepare the update data according to the database schema
    const updates: TablesUpdate<'dive_logs'> = {
      date: updateData.date,
      location: updateData.location || null,
      reached_depth: Number(updateData.depth) || null,
      total_dive_time: Number(updateData.duration) || null,
      notes: updateData.notes || null,
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

// DELETE /api/dive-logs - Delete a dive log
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const supabase = await getSupabaseServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Dive log ID is required' },
        { status: 400 }
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
