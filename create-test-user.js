const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestUser() {
  const testUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@kovaldeepai.com',
    first_name: 'Test',
    last_name: 'User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert([testUser])
      .select();

    if (error) {
      console.error('Error creating test user:', error);
      return false;
    }

    console.log('Test user created/updated successfully:', data);
    return true;
  } catch (err) {
    console.error('Failed to create test user:', err);
    return false;
  }
}

async function main() {
  console.log('Creating test user...');
  const success = await createTestUser();
  
  if (success) {
    console.log('✅ Test user setup complete');
  } else {
    console.log('❌ Test user setup failed');
    process.exit(1);
  }
}

main();
