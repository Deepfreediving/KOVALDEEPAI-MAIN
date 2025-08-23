// Supabase save dive log API endpoint - ADMIN ONLY
import { getServerSupabaseClient } from '@/lib/supabaseServerClient'

// Use singleton client to prevent multiple instances
const supabase = getServerSupabaseClient();

export default async function handler(req, res) {
  // Generate UUID helper function
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  try {
    const { method } = req

    if (method === 'POST') {
      console.log('📝 Save dive log request:', req.body)
      
      // ✅ Handle both formats: direct dive log data or wrapped in diveLogData
      let diveLogData = req.body.diveLogData || req.body;
      
      // ✅ ADMIN ONLY: Use fixed admin user ID
      const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Fixed admin UUID
      
      console.log(`💾 Saving dive log for admin user: ${ADMIN_USER_ID}`)
      console.log('📝 Dive log data received:', diveLogData)

      if (!diveLogData) {
        return res.status(400).json({ error: 'Dive log data is required' })
      }

      // Helper function to convert values
      const toNum = (v) => v === '' || v == null ? null : Number(v)
      const toBool = (v) => Boolean(v)
      const toStr = (v) => v === '' || v == null ? null : String(v)

      // ✅ COMPLETE FIELD MAPPING - MATCHES EXACT DIVE_LOGS SCHEMA
      const supabaseDiveLog = {
        id: generateUUID(), // Always generate new UUID for inserts
        user_id: ADMIN_USER_ID,
        
        // Basic dive information
        date: diveLogData.date,
        discipline: diveLogData.discipline,
        location: toStr(diveLogData.location),
        
        // Depth measurements - CRITICAL FOR COACHING
        target_depth: toNum(diveLogData.targetDepth || diveLogData.target_depth),
        reached_depth: toNum(diveLogData.reachedDepth || diveLogData.reached_depth),
        mouthfill_depth: toNum(diveLogData.mouthfillDepth || diveLogData.mouthfill_depth), // ⚠️ ESSENTIAL
        issue_depth: toNum(diveLogData.issueDepth || diveLogData.issue_depth), // ⚠️ CRITICAL FOR SAFETY
        
        // Time measurements
        total_dive_time: toStr(diveLogData.totalDiveTime || diveLogData.total_dive_time),
        
        // Safety and issues - ESSENTIAL FOR COACHING
        squeeze: toBool(diveLogData.squeeze), // ⚠️ CRITICAL SAFETY INDICATOR
        issue_comment: toStr(diveLogData.issueComment || diveLogData.issue_comment), // ⚠️ DETAILED PROBLEM DESCRIPTION
        
        // Performance data
        exit: toStr(diveLogData.exit), // Clean/messy exit for performance analysis
        attempt_type: toStr(diveLogData.attemptType || diveLogData.attempt_type), // Training/competition/fun
        surface_protocol: toStr(diveLogData.surfaceProtocol || diveLogData.surface_protocol), // Recovery analysis
        
        // Training notes - ESSENTIAL FOR COACHING PROGRESSION
        notes: toStr(diveLogData.notes), // Detailed coaching observations
        
        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        
        // Store additional coaching metadata in JSONB field
        metadata: {
          disciplineType: diveLogData.disciplineType,
          durationOrDistance: diveLogData.durationOrDistance,
          bottomTime: diveLogData.bottomTime, // Store here since no column exists
          earSqueeze: toBool(diveLogData.earSqueeze), // Store here since no column exists
          lungSqueeze: toBool(diveLogData.lungSqueeze), // Store here since no column exists
          narcosisLevel: diveLogData.narcosisLevel,
          recoveryQuality: diveLogData.recoveryQuality,
          gear: diveLogData.gear || {},
          imagePreview: diveLogData.imagePreview,
          diveComputerFileName: diveLogData.diveComputerFileName
        }
      }
      console.log('💾 Inserting dive log into Supabase:', supabaseDiveLog)

      // Insert new record (simplified - always insert for now)
      const { data: savedLog, error } = await supabase
        .from('dive_logs')
        .insert([supabaseDiveLog])
        .select()
        .single()

      if (error) {
        console.error('❌ Supabase insert error:', error)
        return res.status(500).json({ 
          error: 'Failed to save dive log to database',
          details: error.message 
        })
      }

      console.log('✅ Dive log saved successfully to Supabase:', savedLog.id)
      return res.status(200).json({ 
        success: true, 
        diveLog: savedLog,
        message: 'Dive log saved successfully'
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
