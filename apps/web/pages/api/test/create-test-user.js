/**
 * Create Test User - Bypasses auth issues by creating user directly in database
 */

import { getAdminClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, fullName, certificationLevel } = req.body

    if (!email || !fullName) {
      return res.status(400).json({ 
        error: 'Email and full name are required' 
      })
    }

    const supabase = getAdminClient()
    const userId = uuidv4()

    // Create user profile directly (bypassing auth.users for testing)
    // Note: This creates a profile without a corresponding auth.users entry
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        email,
        full_name: fullName
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return res.status(400).json({ 
        error: 'Failed to create user profile',
        details: profileError.message 
      })
    }

    res.status(201).json({
      success: true,
      user: {
        id: profile?.id || userId,
        email,
        fullName,
        certificationLevel: certificationLevel || 'none'
      },
      message: 'Test user created successfully'
    })

  } catch (error) {
    console.error('Test user creation error:', error)
    res.status(500).json({ 
      error: 'Failed to create test user',
      details: error.message 
    })
  }
}
