// Debug Supabase schema and find actual table names
import { getAdminClient } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getAdminClient();
    
    // Get all tables in the public schema
    const { data: tables, error } = await supabase.rpc('get_schema_tables');
    
    if (error) {
      // Fallback: try to query dive_logs to see what we can access
      const { data: diveLogs, error: diveError } = await supabase
        .from('dive_logs')
        .select('*')
        .limit(1);
        
      const { data: diveImages, error: imageError } = await supabase
        .from('dive_log_image')
        .select('*')
        .limit(1);

      return res.status(200).json({
        message: 'Schema query failed, showing accessible tables',
        accessible_tables: {
          dive_logs: !diveError,
          dive_log_image: !imageError
        },
        errors: {
          schema_error: error.message,
          dive_logs_error: diveError?.message,
          dive_images_error: imageError?.message
        }
      });
    }

    return res.status(200).json({
      success: true,
      tables: tables,
      message: 'Schema retrieved successfully'
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Failed to query schema',
      details: error.message
    });
  }
}
