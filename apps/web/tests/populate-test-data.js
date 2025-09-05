/**
 * 🚀 QUICK MANUAL DATA POPULATION SCRIPT
 * 
 * Creates test users and dive logs directly in the database
 * Bypasses auth system for testing purposes
 */

const fetch = require('node-fetch')

const BASE_URL = 'https://zhlacqhzhwvkmyxsxevv.supabase.co/rest/v1'
const SERVICE_KEY = 'sb_secret_KuuNk3GZPLQdvm5Hszn25A_FR-M-7LQ'

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
}

async function populateTestData() {
  console.log('🌊 Creating test data for KovalAI...')
  
  try {
    // Step 1: Create test user directly in auth.users (manual UUID)
    const testUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    
    // Step 2: Create user profile
    console.log('👤 Creating user profile...')
    const userProfileResponse = await fetch(`${BASE_URL}/user_profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: testUserId,
        email: 'alex@kovalai.com',
        full_name: 'Alex TestDiver',
        certification_level: 'L2',
        subscription_status: 'active',
        subscription_plan: 'premium',
        emergency_contact: 'Emergency: Jane Doe - (555) 123-4567',
        medical_cleared: true,
        legal_waiver_accepted: true,
        legal_waiver_date: new Date().toISOString(),
        medical_clearance_accepted: true,
        medical_clearance_date: new Date().toISOString()
      })
    })
    
    if (!userProfileResponse.ok) {
      const error = await userProfileResponse.text()
      console.log('⚠️  User profile already exists or error:', error)
    } else {
      console.log('✅ User profile created')
    }
    
    // Step 3: Create dive logs
    console.log('🤿 Creating dive logs...')
    const diveLogs = [
      {
        user_id: testUserId,
        date: '2025-09-03',
        location: 'Blue Hole, Dahab',
        discipline: 'CNF',
        target_depth: 30,
        reached_depth: 28,
        bottom_time: 15,
        total_dive_time: 120,
        surface_protocol: 'OK',
        notes: 'Perfect dive! Excellent equalization and calm throughout.',
        squeeze: false,
        blackout: false,
        feeling_rating: 9,
        attempt_number: 1,
        attempt_type: 'training'
      },
      {
        user_id: testUserId,
        date: '2025-09-02',
        location: 'Training Pool',
        discipline: 'CWT',
        target_depth: 20,
        reached_depth: 20,
        bottom_time: 10,
        total_dive_time: 90,
        surface_protocol: 'OK',
        notes: 'Pool session focusing on technique refinement.',
        squeeze: false,
        blackout: false,
        feeling_rating: 7,
        attempt_number: 2,
        attempt_type: 'training'
      },
      {
        user_id: testUserId,
        date: '2025-09-01',
        location: 'Home Training',
        discipline: 'STA',
        target_depth: 0,
        reached_depth: 0,
        bottom_time: 180, // 3 minutes static
        total_dive_time: 180,
        surface_protocol: 'OK',
        notes: 'New personal best in static apnea! Very relaxed.',
        squeeze: false,
        blackout: false,
        feeling_rating: 10,
        attempt_number: 1,
        attempt_type: 'training'
      },
      {
        user_id: testUserId,
        date: '2025-08-31',
        location: 'Ocean Training',
        discipline: 'FIM',
        target_depth: 35,
        reached_depth: 32,
        bottom_time: 18,
        total_dive_time: 140,
        surface_protocol: 'OK',
        notes: 'Free immersion dive with monofin. Great depth reached.',
        squeeze: false,
        blackout: false,
        feeling_rating: 8,
        attempt_number: 1,
        attempt_type: 'training'
      },
      {
        user_id: testUserId,
        date: '2025-08-30',
        location: 'Competition Pool',
        discipline: 'DYN',
        target_depth: 0,
        reached_depth: 0,
        bottom_time: 120, // 2 minutes dynamic
        total_dive_time: 120,
        surface_protocol: 'OK',
        notes: 'Dynamic apnea competition prep. Good distance covered.',
        squeeze: false,
        blackout: false,
        feeling_rating: 8,
        distance_m: 75,
        attempt_number: 3,
        attempt_type: 'competition'
      }
    ]
    
    let createdCount = 0
    for (const diveLog of diveLogs) {
      const response = await fetch(`${BASE_URL}/dive_logs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(diveLog)
      })
      
      if (response.ok) {
        createdCount++
        console.log(`✅ Created: ${diveLog.discipline} at ${diveLog.location}`)
      } else {
        const error = await response.text()
        console.log(`❌ Failed: ${diveLog.discipline} - ${error}`)
      }
    }
    
    console.log(`\n🎯 Created ${createdCount} dive logs successfully!`)
    
    // Step 4: Test the API
    console.log('\n📊 Testing API...')
    const apiResponse = await fetch('http://localhost:3000/api/supabase/dive-logs')
    if (apiResponse.ok) {
      const data = await apiResponse.json()
      console.log(`✅ API working! Found ${data.stats.totalLogs} dive logs`)
      console.log('📋 Recent dives:')
      data.diveLogs.slice(0, 3).forEach(dive => {
        console.log(`   ${dive.date}: ${dive.discipline} - ${dive.reached_depth || 0}m`)
      })
    } else {
      console.log('❌ API test failed')
    }
    
    console.log('\n🎉 Test data population complete!')
    console.log('🚀 KovalAI is ready for testing!')
    
  } catch (error) {
    console.error('❌ Error populating test data:', error)
  }
}

populateTestData()
