// Simplified Optimized Supabase dive logs API endpoint
import { getAdminSupabaseClient } from '@/lib/supabaseServerClient'

export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting dive logs optimized (simple) API call');
    
    // Initialize Supabase client
    const supabase = getAdminSupabaseClient();
    
    if (!supabase) {
      console.error('❌ Failed to initialize Supabase admin client');
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: 'Could not initialize Supabase client'
      });
    }

    console.log('✅ Supabase admin client initialized');
  
    // Validate request method
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Get and validate query parameters
    const { userId, limit = 50 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId parameter is required' });
    }

    // Sanitize limit parameter
    const sanitizedLimit = Math.min(parseInt(limit) || 50, 100);
    
    console.log(`🔍 Querying dive logs for user: ${userId}, limit: ${sanitizedLimit}`);

    // ✅ OPTIMIZED QUERY: Use the view we created to get dive logs with images in one query
    const { data: diveLogs, error } = await supabase
      .from('v_dive_logs_with_images')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(sanitizedLimit);

    if (error) {
      console.error('❌ Supabase query error:', error);
      return res.status(500).json({ 
        error: 'Database query failed',
        details: error.message 
      });
    }

    console.log(`✅ Successfully fetched ${(diveLogs || []).length} dive logs`);

    // Process the results - group by dive log to handle multiple images per log
    const processedDiveLogs = [];
    const diveLogMap = new Map();

    (diveLogs || []).forEach(log => {
      if (!diveLogMap.has(log.id)) {
        // Create new dive log entry
        const diveLog = {
          id: log.id,
          user_id: log.user_id,
          date: log.date,
          discipline: log.discipline,
          location: log.location,
          target_depth: log.target_depth,
          reached_depth: log.reached_depth,
          mouthfill_depth: log.mouthfill_depth,
          issue_depth: log.issue_depth,
          total_dive_time: log.total_dive_time,
          squeeze: log.squeeze,
          issue_comment: log.issue_comment,
          exit: log.exit,
          attempt_type: log.attempt_type,
          surface_protocol: log.surface_protocol,
          notes: log.notes,
          bottom_time_seconds: log.bottom_time_seconds,
          total_time_seconds: log.total_time_seconds,
          discipline_type: log.discipline_type,
          exit_status: log.exit_status,
          duration_seconds: log.duration_seconds,
          distance_m: log.distance_m,
          ear_squeeze: log.ear_squeeze,
          lung_squeeze: log.lung_squeeze,
          narcosis_level: log.narcosis_level,
          recovery_quality: log.recovery_quality,
          gear: log.gear,
          ai_analysis: log.ai_analysis,
          ai_summary: log.ai_summary,
          metadata: log.metadata,
          created_at: log.created_at,
          updated_at: log.updated_at,
          images: []
        };

        diveLogMap.set(log.id, diveLog);
        processedDiveLogs.push(diveLog);
      }

      // Add image if it exists
      if (log.image_id) {
        const diveLog = diveLogMap.get(log.id);
        diveLog.images.push({
          id: log.image_id,
          bucket: log.image_bucket,
          path: log.image_path,
          original_filename: log.original_filename,
          ai_analysis: log.image_analysis,
          extracted_metrics: log.extracted_metrics
        });
      }
    });

    const processingTime = Date.now() - startTime;
    
    console.log(`🎯 API Response: ${processedDiveLogs.length} dive logs, ${processingTime}ms`);

    // Return successful response
    return res.status(200).json({
      success: true,
      data: processedDiveLogs,
      metadata: {
        count: processedDiveLogs.length,
        processing_time_ms: processingTime,
        optimized: true,
        view_used: 'v_dive_logs_with_images',
        user_id: userId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Unexpected error in optimized dive logs API:', error);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      processing_time_ms: processingTime
    });
  }
}
