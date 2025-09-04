const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUserProfile() {
  console.log('🔍 Creating user profile for Daniel...');
  
  const userId = '7d34b050-af19-4f34-bbe6-5dfd375ad6c0';
  const email = 'daniel@deepfreediving.com';
  
  try {
    // First, check if user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('❌ Auth user not found:', authError);
      return;
    }
    
    console.log('✅ Auth user found:', authUser.user.email);
    
    // Check if profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existingProfile) {
      console.log('✅ User profile already exists:', existingProfile);
      return;
    }
    
    // Create user profile
    const { data: newProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        email: email,
        full_name: 'Daniel Koval',
        nickname: 'Daniel',
        subscription_status: 'trial',
        subscription_plan: 'basic',
        dive_logs_limit: 100 // Give Daniel more dive logs
      })
      .select()
      .single();
    
    if (profileError) {
      console.error('❌ Failed to create profile:', profileError);
      return;
    }
    
    console.log('✅ User profile created successfully:', newProfile);
    
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
  }
}

createUserProfile();
