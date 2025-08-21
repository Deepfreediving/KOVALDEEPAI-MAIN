// Test and fix the remaining API issues
async function fixRemainingIssues() {
  console.log('🔧 FIXING REMAINING API ISSUES\n');
  
  // Test Chat API with proper authentication
  console.log('1️⃣ Testing Chat API with proper headers...');
  try {
    const response = await fetch('https://kovaldeepai-main.vercel.app/api/openai/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'KovalDeepAI-Test'
      },
      body: JSON.stringify({ 
        message: 'Hello, this is a test message',
        context: { test: true }
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Chat API working with proper format');
      console.log(`   💬 Response: ${data.response?.substring(0, 100)}...`);
    } else {
      console.log(`❌ Chat API still failing: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Chat API error: ${error.message}`);
  }

  // Test E.N.C.L.O.S.E. Audit with correct data format
  console.log('\n2️⃣ Testing E.N.C.L.O.S.E. Audit with corrected format...');
  try {
    const auditPayload = {
      userId: 'daniel_koval',
      diveLog: {
        id: 'test-dive-001',
        date: '2025-08-21',
        discipline: 'CWT',
        depth: 102,
        time: 225, // seconds
        location: 'Philippines',
        notes: 'Strong current, good dive overall',
        performance: {
          target_depth: 105,
          reached_depth: 102,
          dive_time: 225,
          surface_protocol: 'OK'
        }
      }
    };
    
    const response = await fetch('https://kovaldeepai-main.vercel.app/api/audit/dive-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditPayload)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ E.N.C.L.O.S.E. audit working');
      console.log(`   🎯 Overall score: ${data.overall_score}/100`);
      console.log(`   📝 Recommendations: ${data.recommendations?.length || 0}`);
      if (data.recommendations?.length > 0) {
        console.log(`   💡 Sample recommendation: ${data.recommendations[0].description?.substring(0, 100)}...`);
      }
    } else {
      console.log(`❌ Audit still failing: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Audit error: ${error.message}`);
  }

  // Test the actual image upload endpoint that was previously failing
  console.log('\n3️⃣ Testing Image Upload API (that was failing earlier)...');
  try {
    // Create a test image data
    const testImageBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
    
    const formData = new FormData();
    formData.append('image', new Blob([Buffer.from(testImageBase64, 'base64')], { type: 'image/jpeg' }));
    
    const response = await fetch('https://kovaldeepai-main.vercel.app/api/openai/upload-dive-image-simple', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Image upload API working');
      console.log(`   📸 Image processed: ${data.success ? 'Yes' : 'No'}`);
      console.log(`   📝 Text extracted: ${data.extractedText?.substring(0, 100) || 'None'}...`);
    } else {
      console.log(`❌ Image upload still failing: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Image upload error: ${error.message}`);
  }

  console.log('\n🎯 FINAL STATUS CHECK COMPLETE!');
}

fixRemainingIssues().catch(console.error);
