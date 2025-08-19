// Supabase save dive log API endpoint - ADMIN ONLY
import { createClient } from '@supabase/supabase-js'

// Use service key for admin operations (bypasses RLS)
// Temporarily using anon key since service role key is not configured
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

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
      
      const { diveLogData, adminUserId, nickname } = req.body
      
      // ✅ ADMIN ONLY: Use fixed admin user ID
      const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Fixed admin UUID
      
      console.log(`💾 Saving dive log for admin user: ${ADMIN_USER_ID}`)

      if (!diveLogData) {
        return res.status(400).json({ error: 'diveLogData is required' })
      }

      // Helper function to convert values
      const toNum = (v) => v === '' || v == null ? null : Number(v)

      // ✅ Map from DiveJournalDisplay format to Supabase schema (simplified)
      const supabaseDiveLog = {
        id: generateUUID(), // Always generate new UUID for inserts
        user_id: ADMIN_USER_ID,
        date: diveLogData.date,
        discipline: diveLogData.discipline,
        location: diveLogData.location,
        target_depth: toNum(diveLogData.targetDepth || diveLogData.target_depth),
        reached_depth: toNum(diveLogData.reachedDepth || diveLogData.reached_depth),
        total_dive_time: diveLogData.totalDiveTime || diveLogData.total_dive_time,
        notes: diveLogData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
