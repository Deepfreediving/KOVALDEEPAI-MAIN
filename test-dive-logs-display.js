// Test script to verify dive logs are being fetched and displayed correctly
const { createClient } = require('@supabase/supabase-js')

// Use the same configuration as the app
const SUPABASE_URL = 'https://zhlacqhzhwvkmyxsxevv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobGFjcWh6aHd2a215eHN4ZXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Nzc4NTgsImV4cCI6MjA3MTA1Mzg1OH0.ILuLKFK4DgS6qVPp1o6VA_o1I_h7PIXO0XnTv4UtOQ4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testDiveLogs() {
  console.log('🧪 Testing dive logs functionality...')
  console.log('📍 Supabase URL:', SUPABASE_URL)
  
  // Test 1: Check if we can connect to Supabase
  try {
    console.log('\n1️⃣ Testing Supabase connection...')
    const { data, error } = await supabase.from('dive_logs').select('count').limit(1)
    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
      return
    }
    console.log('✅ Supabase connection successful')
  } catch (err) {
    console.error('❌ Connection error:', err.message)
    return
  }

  // Test 2: Check dive logs for the admin user
  try {
    console.log('\n2️⃣ Fetching dive logs for admin user...')
    const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    
    const { data: diveLogs, error } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', ADMIN_USER_ID)
      .order('date', { ascending: false })

    if (error) {
      console.error('❌ Failed to fetch dive logs:', error.message)
      return
    }

    console.log(`✅ Found ${diveLogs?.length || 0} dive logs for admin user`)
    
    if (diveLogs && diveLogs.length > 0) {
      console.log('\n📊 Sample dive log data:')
      diveLogs.slice(0, 3).forEach((log, index) => {
        console.log(`${index + 1}. ${log.date} - ${log.discipline} at ${log.location}`)
        console.log(`   Target: ${log.target_depth}m, Reached: ${log.reached_depth}m`)
        console.log(`   ID: ${log.id}`)
      })
    }

  } catch (err) {
    console.error('❌ Error fetching dive logs:', err.message)
  }

  // Test 3: Test the updated API logic with admin pattern detection
  try {
    console.log('\n3️⃣ Testing admin pattern detection logic...')
    const crypto = require('crypto')
    
    // Test different user identifiers that should map to admin
    const testUsers = ['daniel_koval', 'Daniel Koval', 'daniel@deepfreediving.com']
    const ADMIN_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    const adminPatterns = ['daniel_koval', 'Daniel Koval', 'daniel@deepfreediving.com', 'danielkoval@example.com']
    
    for (const user_identifier of testUsers) {
      console.log(`\n🔍 Testing user: "${user_identifier}"`)
      
      let final_user_id;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_identifier)
      
      if (isUUID) {
        final_user_id = user_identifier
      } else if (adminPatterns.includes(user_identifier)) {
        // Use admin ID for known admin patterns
        final_user_id = ADMIN_USER_ID
        console.log(`🔑 Admin pattern detected: "${user_identifier}" → using admin UUID: ${ADMIN_USER_ID}`)
      } else {
        // Create a deterministic UUID from the user identifier  
        const hash = crypto.createHash('md5').update(user_identifier).digest('hex')
        final_user_id = [
          hash.substr(0, 8),
          hash.substr(8, 4), 
          hash.substr(12, 4),
          hash.substr(16, 4),
          hash.substr(20, 12)
        ].join('-')
      }
      
      console.log(`🆔 Generated UUID: ${final_user_id}`)
      
      // Test with Supabase
      const { data: userLogs, error } = await supabase
        .from('dive_logs')
        .select('*')
        .eq('user_id', final_user_id)
        .order('date', { ascending: false })

      if (error) {
        console.error('❌ Failed to fetch logs:', error.message)
        continue
      }

      console.log(`✅ Found ${userLogs?.length || 0} dive logs`)
      
      if (userLogs && userLogs.length > 0) {
        console.log('📊 Sample logs:')
        userLogs.slice(0, 2).forEach((log, index) => {
          console.log(`   ${index + 1}. ${log.date} - ${log.discipline} at ${log.location}`)
        })
      }
    }

  } catch (err) {
    console.error('❌ Error testing admin patterns:', err.message)
  }

  console.log('\n🏁 Test completed!')
}

// Run the test
testDiveLogs().catch(console.error)
