import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/app/api/_lib/requireUser';

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireUser(request);

    const { data: logs, error } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch dive logs' }, { status: 500 });
    }

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Dive logs GET error:', error);
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireUser(request);
    const body = await request.json();

    // Transform request body to match database schema
    const diveLogData = {
      user_id: user.id,
      date: body.date || new Date().toISOString(),
      location: body.location || null,
      discipline: body.discipline || body.disciplineType || null,
      depth: body.reachedDepth ? Number(body.reachedDepth) : null,
      duration: body.totalDiveTime ? Number(body.totalDiveTime) : null,
      notes: body.notes || null,
      watch_photo: body.watch_photo || null,
      analysis: body.analysis || null,
    };

    const { data: log, error } = await supabase
      .from('dive_logs')
      .insert(diveLogData)
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to create dive log' }, { status: 500 });
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Dive logs POST error:', error);
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, supabase } = await requireUser(request);
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    // Transform update data to match database schema
    const diveLogUpdate = {
      date: updateData.date,
      location: updateData.location,
      discipline: updateData.discipline || updateData.disciplineType,
      depth: updateData.reachedDepth ? Number(updateData.reachedDepth) : updateData.depth,
      duration: updateData.totalDiveTime ? Number(updateData.totalDiveTime) : updateData.duration,
      notes: updateData.notes,
      watch_photo: updateData.watch_photo,
      analysis: updateData.analysis,
    };

    // Remove undefined values
    Object.keys(diveLogUpdate).forEach(key => {
      if (diveLogUpdate[key] === undefined) {
        delete diveLogUpdate[key];
      }
    });

    const { data: log, error } = await supabase
      .from('dive_logs')
      .update(diveLogUpdate)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only update their own logs
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to update dive log' }, { status: 500 });
    }

    if (!log) {
      return NextResponse.json({ error: 'Dive log not found' }, { status: 404 });
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Dive logs PUT error:', error);
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase } = await requireUser(request);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('dive_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user can only delete their own logs

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to delete dive log' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dive logs DELETE error:', error);
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
