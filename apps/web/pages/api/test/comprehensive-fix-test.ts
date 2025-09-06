// Comprehensive test for dive log, image analysis, and journal save fixes
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`
    const testUserId = 'test-user-development-only'
    
    console.log('🧪 Starting comprehensive endpoint tests...')

    // Test 1: Journal/Chat Save
    console.log('💬 Testing journal/chat save...')
    const chatResponse = await fetch(`${baseUrl}/api/supabase/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId
      },
      body: JSON.stringify({
        message: 'Test message for journal save',
        userId: testUserId,
        threadId: `test-thread-${Date.now()}`,
        userProfile: {
          full_name: 'Test User',
          certification_level: 'Advanced'
        }
      })
    })

    const chatResult = await chatResponse.text()
    console.log('💬 Chat response status:', chatResponse.status)

    // Test 2: Dive Log Save
    console.log('📊 Testing dive log save...')
    const diveLogData = {
      user_id: testUserId,
      date: new Date().toISOString().split('T')[0],
      discipline: 'CNF',
      location: 'Test Pool',
      targetDepth: 30,
      reachedDepth: 28,
      totalDiveTime: '2:15',
      squeeze: false,
      notes: 'Test dive log entry',
      attemptType: 'training'
    }

    const diveLogResponse = await fetch(`${baseUrl}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId
      },
      body: JSON.stringify({ diveLogData })
    })

    const diveLogResult = await diveLogResponse.text()
    console.log('📊 Dive log response status:', diveLogResponse.status)

    // Test 3: Basic functionality check
    console.log('🔍 Testing basic endpoints...')
    const debugResponse = await fetch(`${baseUrl}/api/debug/index`, {
      method: 'GET',
      headers: {
        'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || ''
      }
    })

    const debugResult = await debugResponse.text()
    console.log('🔍 Debug response status:', debugResponse.status)

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      testResults: {
        chatSave: {
          status: chatResponse.status,
          success: chatResponse.status === 200,
          preview: chatResult.substring(0, 200) + '...'
        },
        diveLogSave: {
          status: diveLogResponse.status,
          success: diveLogResponse.status === 200,
          preview: diveLogResult.substring(0, 200) + '...'
        },
        basicEndpoints: {
          status: debugResponse.status,
          success: debugResponse.status === 200,
          preview: debugResult.substring(0, 200) + '...'
        }
      },
      testUserId,
      summary: {
        allTestsPassed: chatResponse.status === 200 && diveLogResponse.status === 200 && debugResponse.status === 200,
        issues: [
          ...(chatResponse.status !== 200 ? ['Chat/Journal save failed'] : []),
          ...(diveLogResponse.status !== 200 ? ['Dive log save failed'] : []),
          ...(debugResponse.status !== 200 ? ['Basic endpoints failed'] : [])
        ]
      }
    })

  } catch (error) {
    console.error('❌ Comprehensive test error:', error)
    return res.status(500).json({ 
      error: 'Comprehensive test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
}
