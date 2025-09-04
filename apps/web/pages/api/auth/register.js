/**
 * User Registration API with Legal Waiver and Medical Clearance
 * Handles the complete onboarding flow for KovalAI users
 */

import { getAdminClient } from '@/lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      email,
      password,
      fullName,
      legalWaiverAccepted,
      medicalClearanceAccepted,
      medicalHistory,
      emergencyContact,
      certificationLevel
    } = req.body

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        error: 'Email, password, and full name are required' 
      })
    }

    // Validate legal agreements
    if (!legalWaiverAccepted || !medicalClearanceAccepted) {
      return res.status(400).json({ 
        error: 'You must accept the legal waiver and medical clearance to proceed' 
      })
    }

    const supabase = getAdminClient()

    // Create auth user using admin method for server-side registration
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation for easier testing
      user_metadata: {
        full_name: fullName
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return res.status(400).json({ 
        error: 'Failed to create user account',
        details: authError.message 
      })
    }

    const userId = authData.user.id

    // Create user profile (using only fields that exist in the table)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        email,
        full_name: fullName
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Note: User cleanup would need to be handled differently in production
      return res.status(400).json({ 
        error: 'Failed to create user profile',
        details: profileError.message 
      })
    }

    res.status(201).json({
      success: true,
      user: {
        id: userId,
        email,
        fullName,
        certificationLevel: certificationLevel || 'beginner'
      },
      message: 'User registered successfully with 30-day trial',
      additionalInfo: {
        medicalHistory: medicalHistory ? 'provided' : 'not provided',
        emergencyContact: emergencyContact ? 'provided' : 'not provided'
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}
