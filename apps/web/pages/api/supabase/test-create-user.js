// Test user creation endpoint for development
import { getAdminClient } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const supabase = getAdminClient();
    
    // Create a test user using Supabase Admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: 'test123456',
      email_confirm: true,
      user_metadata: {
        test_user: true,
        created_for: 'api_testing'
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return res.status(500).json({ 
        error: 'Failed to create auth user', 
        details: authError.message 
      });
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authUser.user.id,
        email: email,
        first_name: 'Test',
        last_name: 'User',
        certification_level: 'L1',
        subscription_status: 'trial'
      })
      .select()
      .single();

    if (profileError) {
      console.warn('Profile creation warning:', profileError);
      // Continue even if profile creation fails
    }

    return res.status(200).json({
      success: true,
      user_id: authUser.user.id,
      email: authUser.user.email,
      profile_created: !profileError,
      message: 'Test user created successfully'
    });

  } catch (error) {
    console.error('Test user creation error:', error);
    return res.status(500).json({
      error: 'Failed to create test user',
      details: error.message
    });
  }
}
