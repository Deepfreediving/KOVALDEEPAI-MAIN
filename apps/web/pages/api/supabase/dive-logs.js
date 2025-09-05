// Simple dive logs retrieval API
import { getAdminClient } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log(`🌐 Loading dive logs for user: ${userId}`);

    const supabase = getAdminClient();
    
    if (!supabase) {
      console.error('❌ Failed to initialize Supabase admin client');
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: 'Could not initialize Supabase client'
      });
    }

    // Try to get dive logs from the dive_logs table
    const { data: diveLogs, error } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching dive logs:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch dive logs',
        details: error.message 
      });
    }

    console.log(`✅ Found ${diveLogs?.length || 0} dive logs for user ${userId}`);

    return res.status(200).json({
      success: true,
      diveLogs: diveLogs || [],
      count: diveLogs?.length || 0,
      message: `Retrieved ${diveLogs?.length || 0} dive logs`
    });

  } catch (error) {
    console.error('❌ Dive logs API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
