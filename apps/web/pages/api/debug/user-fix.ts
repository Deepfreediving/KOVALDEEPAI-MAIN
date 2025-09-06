// Debug endpoint to fix user authentication issues
import { getAdminClient } from '@/lib/supabase'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getAdminClient()
    
    if (!supabase) {
      return res.status(500).json({ error: 'Failed to initialize Supabase client' })
    }

    // Check existing users in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Auth users error:', authError)
    }

    console.log('Existing auth users:', authUsers?.users?.length || 0)

    // Check for test user
    const TEST_EMAIL = 'daniel@kovaldeepai.com'
    const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    
    let testUser = authUsers?.users?.find(u => u.email === TEST_EMAIL || u.id === TEST_USER_ID)
    
    if (!testUser && req.method === 'POST') {
      // Create test user
      console.log('Creating test user...')
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: TEST_EMAIL,
        password: 'TempPass123!',
        email_confirm: true,
        user_metadata: {
          full_name: 'Daniel Koval',
          role: 'admin'
        }
      })

      if (createError) {
        console.error('Create user error:', createError)
        return res.status(500).json({ 
          error: 'Failed to create test user',
          details: createError.message 
        })
      }

      testUser = newUser.user
      console.log('Test user created:', testUser?.id)

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: testUser?.id,
          full_name: 'Daniel Koval',
          email: TEST_EMAIL,
          certification_level: 'Instructor',
          years_experience: 15,
          personal_best_depth: 80,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)

      if (profileError) {
        console.error('Profile creation error:', profileError)
      }
    }

    // Get user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')

    // Get dive logs count
    const { count: diveLogsCount } = await supabase
      .from('dive_logs')
      .select('*', { count: 'exact', head: true })

    // Get chat messages count  
    const { count: chatCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      authUsers: {
        count: authUsers?.users?.length || 0,
        testUserExists: !!testUser,
        testUserId: testUser?.id || null,
        testUserEmail: testUser?.email || null
      },
      userProfiles: {
        count: profiles?.length || 0,
        profiles: (profiles as any[])?.map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email
        })) || []
      },
      dataCount: {
        diveLogsCount: diveLogsCount || 0,
        chatCount: chatCount || 0
      },
      errors: {
        authError: authError?.message || null,
        profilesError: profilesError?.message || null
      }
    })

  } catch (error) {
    console.error('User fix debug error:', error)
    return res.status(500).json({ 
      error: 'Debug failed',
      details: error.message 
    })
  }
}
