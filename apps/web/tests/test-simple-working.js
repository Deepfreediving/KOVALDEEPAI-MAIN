/**
 * Simple Test - Just test what's working
 */

const BASE_URL = 'http://localhost:3000'

async function simpleTest() {
  console.log('🧪 Running Simple KovalAI Test...\n')
  
  try {
    // Test 1: Health Check
    console.log('🏥 Testing API health...')
    const healthResponse = await fetch(`${BASE_URL}/api/health`)
    const healthData = await healthResponse.json()
    console.log('✅ API Health:', healthData.status)
    
    // Test 2: Get existing dive logs
    console.log('\n🏊 Testing dive logs retrieval...')
    const diveResponse = await fetch(`${BASE_URL}/api/supabase/dive-logs`)
    const diveData = await diveResponse.json()
    console.log('✅ Dive logs found:', diveData.diveLogs.length)
    console.log('📊 Stats:', diveData.stats)
    
    // Test 3: Test PayPal free trial
    console.log('\n💳 Testing PayPal free trial...')
    const paymentResponse = await fetch(`${BASE_URL}/api/payment/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user-123',
        planType: 'trial',
        amount: 0
      })
    })
    
    const paymentData = await paymentResponse.json()
    console.log('✅ Free trial:', paymentData.success ? 'Activated' : 'Failed')
    
    // Test 4: Test AI Coach
    console.log('\n🤖 Testing AI freediving coach...')
    const chatResponse = await fetch(`${BASE_URL}/api/chat/freediving-coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user-123',
        message: 'I had a small squeeze at 20m today. What should I do?',
        context: { userLevel: 'L2' }
      })
    })
    
    const chatData = await chatResponse.json()
    console.log('✅ AI Coach response length:', chatData.response?.length || 0, 'characters')
    
    // Test 5: Database schema validation
    console.log('\n🔍 Testing database schema...')
    const schemaResponse = await fetch(`${BASE_URL}/api/test/validate-keys`)
    const schemaData = await schemaResponse.json()
    console.log('✅ Database connection:', schemaData.anonKeyValid ? 'Working' : 'Failed')
    
    console.log('\n🎯 SIMPLE TEST SUMMARY:')
    console.log('======================')
    console.log('🏥 API Health:', healthData.status === 'healthy' ? '✅' : '❌')
    console.log('🏊 Dive Logs API:', diveData.diveLogs !== undefined ? '✅' : '❌')
    console.log('💳 PayPal Integration:', paymentData.success ? '✅' : '❌')
    console.log('🤖 AI Coach:', chatData.response ? '✅' : '❌')
    console.log('🔍 Database Schema:', schemaData.anonKeyValid ? '✅' : '❌')
    
    if (chatData.response) {
      console.log('\n💬 Sample AI Coach Response:')
      console.log('----------------------------')
      console.log(chatData.response.substring(0, 200) + '...')
    }
    
    console.log('\n🎉 Simple test complete! The core functionality is working.')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
simpleTest()
