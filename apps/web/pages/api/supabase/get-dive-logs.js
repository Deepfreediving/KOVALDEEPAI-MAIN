// Supabase-powered get dive logs API endpoint - ADMIN ONLY
import { getAdminSupabaseClient } from '@/lib/supabaseServerClient'
import handleCors from "@/utils/handleCors";

// Use admin client for elevated access
const supabase = getAdminSupabaseClient();

export default async function handler(req, res) {
  try {
    // ✅ Handle CORS
    if (handleCors(req, res)) return;

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ ADMIN ONLY: Use fixed admin user ID
    const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Fixed admin UUID

    console.log(`🔍 Loading dive logs for admin user: ${ADMIN_USER_ID}`);

    // Get dive logs from Supabase
    const { data: diveLogs, error } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', ADMIN_USER_ID)
      .order('date', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: error.message })
    }

    // Transform to expected format
    const transformedLogs = (diveLogs || []).map(log => ({
      id: log.id,
      timestamp: new Date(log.date).getTime(),
      date: log.date,
      discipline: log.discipline,
      reachedDepth: log.reached_depth,
      location: log.location,
      notes: log.notes,
      targetDepth: log.target_depth,
      totalTime: log.total_dive_time,
      mouthfillDepth: log.mouthfill_depth,
      issueDepth: log.issue_depth,
      squeeze: log.squeeze,
      exit: log.exit,
      attemptType: log.attempt_type,
      issueComment: log.issue_comment,
      surfaceProtocol: log.surface_protocol,
      createdAt: log.created_at,
      updatedAt: log.updated_at
    }))

    console.log(`✅ Found ${transformedLogs.length} dive logs for admin user: ${ADMIN_USER_ID}`)

    res.status(200).json({ 
      logs: transformedLogs 
    });

  } catch (error) {
    console.error("❌ Error loading dive logs:", error);
    res.status(500).json({ 
      error: "Failed to load dive logs" 
    });
  }
}
