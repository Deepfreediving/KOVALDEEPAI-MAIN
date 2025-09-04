#!/usr/bin/env node

/**
 * Script to populate test dive log data
 * This will create a test user and some sample dive logs
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://zhlacqhzhwvkmyxsxevv.supabase.co'
const supabaseServiceKey = 'sb_secret_KuuNk3GZPLQdvm5Hszn25A_FR-M-7LQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  console.log('Creating test user...')
  
  const { data: user, error } = await supabase.auth.admin.createUser({
    email: 'test@kovaldeepai.com',
    password: 'testpassword123',
    email_confirm: true
  })
  
  if (error) {
    console.log('User might already exist, trying to get existing user...')
    // Try to get existing users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.error('Error listing users:', listError)
      return null
    }
    
    const existingUser = users.users.find(u => u.email === 'test@kovaldeepai.com')
    if (existingUser) {
      console.log('Using existing user:', existingUser.id)
      return existingUser.id
    }
    
    console.error('Error creating user:', error)
    return null
  }
  
  console.log('Created user:', user.user.id)
  return user.user.id
}

async function createTestDiveLogs(userId) {
  console.log('Creating test dive logs for user:', userId)
  
  const testDiveLogs = [
    {
      user_id: userId,
      date: '2025-09-01',
      discipline: 'CNF',
      location: 'Blue Hole, Bahamas',
      target_depth: 40,
      reached_depth: 38,
      total_dive_time: 180,
      bottom_time: 15,
      descent_time: 82,
      ascent_time: 83,
      attempt_number: 1,
      attempt_type: 'training',
      squeeze: false,
      blackout: false,
      lmc: false,
      surface_protocol: 'OK',
      water_temp: 24,
      feeling_rating: 8,
      notes: 'Great dive! Felt relaxed and controlled throughout.',
      coach_notes: 'Excellent form, consistent pace'
    },
    {
      user_id: userId,
      date: '2025-09-02',
      discipline: 'CWT',
      location: 'Dean\'s Blue Hole',
      target_depth: 50,
      reached_depth: 45,
      total_dive_time: 210,
      bottom_time: 20,
      descent_time: 95,
      ascent_time: 95,
      attempt_number: 1,
      attempt_type: 'official',
      squeeze: false,
      blackout: false,
      lmc: false,
      surface_protocol: 'OK',
      water_temp: 23,
      feeling_rating: 7,
      notes: 'Turned early due to slight equalization issues at 45m.',
      coach_notes: 'Work on equalization technique'
    },
    {
      user_id: userId,
      date: '2025-09-03',
      discipline: 'FIM',
      location: 'Competition Pool',
      target_depth: 35,
      reached_depth: 35,
      total_dive_time: 150,
      bottom_time: 10,
      descent_time: 70,
      ascent_time: 70,
      attempt_number: 2,
      attempt_type: 'competition',
      squeeze: false,
      blackout: false,
      lmc: false,
      surface_protocol: 'OK',
      water_temp: 25,
      feeling_rating: 9,
      notes: 'Perfect dive! Hit target depth exactly.',
      coach_notes: 'Competition ready performance'
    }
  ]
  
  for (const diveLog of testDiveLogs) {
    const { data, error } = await supabase
      .from('dive_logs')
      .insert(diveLog)
      .select()
    
    if (error) {
      console.error('Error creating dive log:', error)
    } else {
      console.log('Created dive log:', data[0].id, '-', diveLog.discipline, '@', diveLog.reached_depth + 'm')
    }
  }
}

async function main() {
  try {
    console.log('🏊 Populating KovalDeepAI test data...\n')
    
    const userId = await createTestUser()
    if (!userId) {
      console.error('Failed to create/get test user')
      process.exit(1)
    }
    
    await createTestDiveLogs(userId)
    
    console.log('\n✅ Test data populated successfully!')
    console.log('📊 Check your Supabase dashboard to see the dive logs')
    console.log('🌐 Visit your app to see the data in action')
    
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
