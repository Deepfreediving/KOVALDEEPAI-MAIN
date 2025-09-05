const { createClient } = require('@supabase/supabase-js');

async function createTestUser() {
    console.log('🤿 Creating Test User for Dive Computer Testing...');
    console.log('================================================\n');
    
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
    
    const testEmail = `test-diver-${Date.now()}@example.com`;
    
    try {
        // Create a test user
        const { data: user, error } = await supabase.auth.admin.createUser({
            email: testEmail,
            password: 'testpassword123',
            email_confirm: true
        });
        
        if (error) {
            console.error('❌ Error creating user:', error);
            return;
        }
        
        console.log('✅ Test user created successfully!');
        console.log('📧 Email:', testEmail);
        console.log('🆔 User ID:', user.user.id);
        console.log('🔐 Password: testpassword123');
        
        console.log('\n🧪 Test the upload API with this user ID:');
        console.log(`curl -X POST http://localhost:3002/api/dive/upload-image \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{`);
        console.log(`    "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",`);
        console.log(`    "userId": "${user.user.id}",`);
        console.log(`    "filename": "test-dive.png"`);
        console.log(`  }'`);
        
        console.log('\n🌐 Or use this user ID in the browser test page:');
        console.log(`http://localhost:3002/test-upload.html`);
        console.log(`User ID to use: ${user.user.id}`);
        
        return user.user.id;
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

createTestUser().catch(console.error);
