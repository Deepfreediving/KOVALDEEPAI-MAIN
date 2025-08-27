// Test image upload API and verify database integration
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testImageUploadIntegration = async () => {
  console.log('🧪 Testing complete image upload integration...\n');

  // 1. Check current state of dive_log_image table
  console.log('📊 Step 1: Checking current database state...');
  const { data: beforeImages, error: beforeError } = await supabase
    .from('dive_log_image')
    .select('id, user_id, path_original, ai_summary, ai_analysis, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (beforeError) {
    console.error('❌ Error checking database:', beforeError.message);
  } else {
    console.log(`✅ Found ${beforeImages?.length || 0} existing images in database`);
    if (beforeImages?.length > 0) {
      console.log('📋 Most recent images:');
      beforeImages.forEach((img, i) => {
        console.log(`  ${i+1}. ID: ${img.id}, User: ${img.user_id}, Path: ${img.path_original}`);
      });
    }
  }

  console.log('\n📤 Step 2: Testing image upload API...');

  // Create a simple test image
  const testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const timestamp = Date.now();
  
  const testPayload = {
    imageData: 'data:image/png;base64,' + testBase64,
    userId: 'user_2bBa8qKDKm2pNvVZgXpYpj8M4nJ',
    filename: `test-integration-${timestamp}.png`
  };

  try {
    const response = await fetch('https://koval-deep-ai-main.vercel.app/api/openai/upload-dive-image-base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    console.log(`📋 API Response (${response.status}):`, JSON.stringify(result, null, 2));

    if (result.imageId) {
      console.log('✅ API returned image ID:', result.imageId);
      
      // 3. Verify the image was actually saved
      console.log('\n🔍 Step 3: Verifying database save...');
      
      const { data: savedImage, error: fetchError } = await supabase
        .from('dive_log_image')
        .select('*')
        .eq('id', result.imageId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching saved image:', fetchError.message);
      } else {
        console.log('✅ Image successfully saved to database!');
        console.log('📋 Saved image details:', {
          id: savedImage.id,
          user_id: savedImage.user_id,
          path_original: savedImage.path_original,
          mime_type: savedImage.mime_type,
          bytes: savedImage.bytes,
          ai_summary_length: savedImage.ai_summary?.length || 0,
          ai_analysis: savedImage.ai_analysis,
          created_at: savedImage.created_at
        });
      }

    } else {
      console.log('❌ No image ID returned from API');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  // 4. Check final state
  console.log('\n📊 Step 4: Checking final database state...');
  const { data: afterImages, error: afterError } = await supabase
    .from('dive_log_image')
    .select('id, user_id, path_original, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!afterError) {
    console.log(`✅ Total images now in database: ${afterImages?.length || 0}`);
    console.log('📋 Most recent images:');
    afterImages?.forEach((img, i) => {
      console.log(`  ${i+1}. ID: ${img.id.substring(0, 8)}..., Path: ${img.path_original}`);
    });
  }
};

testImageUploadIntegration();
