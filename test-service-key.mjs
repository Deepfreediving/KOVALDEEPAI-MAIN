// Test Supabase service key validity
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zhlacqhzhwvkmyxsxevv.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobGFjcWh6aHd2a215eHN4ZXZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ3Nzg1OCwiZXhwIjoyMDcxMDUzODU4fQ.t0-3lFTKHcZDlvODWdZ8qb4oMTi5WFgIa8KkDgF9nGE'

const supabase = createClient(supabaseUrl, serviceKey)

async function testServiceKey() {
  try {
    console.log('🔑 Testing service key...')
    
    // Try a simple query to test the key
    const { data, error } = await supabase
      .from('dive_logs')
      .select('count(*)')
      .limit(1)
    
    if (error) {
      console.error('❌ Service key test failed:', error.message)
    } else {
      console.log('✅ Service key works! Count:', data)
    }
  } catch (err) {
    console.error('❌ Test error:', err.message)
  }
}

testServiceKey()
