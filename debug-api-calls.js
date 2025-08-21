// Debug script to test the exact API call that the app is making
const { createClient } = require('@supabase/supabase-js')

async function testAPICall() {
  console.log('🔍 Testing the exact API call the app makes...')
  
  // Test different user identifiers
  const testCases = [
    'daniel_koval',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Admin user ID
    'Daniel Koval'
  ]
  
  for (const userId of testCases) {
    console.log(`\n🧪 Testing with userId: "${userId}"`)
    
    try {
      // Simulate the fetch call that the app makes
      const response = await fetch(`http://localhost:3001/api/supabase/dive-logs?userId=${encodeURIComponent(userId)}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Found ${data.diveLogs?.length || 0} dive logs`)
        if (data.diveLogs && data.diveLogs.length > 0) {
          data.diveLogs.slice(0, 2).forEach((log, i) => {
            console.log(`   ${i+1}. ${log.date} - ${log.discipline} at ${log.location}`)
          })
        }
      } else {
        console.log(`❌ API error: ${response.status} ${response.statusText}`)
      }
    } catch (err) {
      console.log(`❌ Request failed: ${err.message}`)
    }
  }
  
  console.log('\n🏁 Test completed!')
}

testAPICall().catch(console.error)
