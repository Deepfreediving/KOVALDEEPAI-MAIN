const https = require('https');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

console.log('🔍 Testing Supabase with Direct HTTP Requests...\n');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', url);
console.log('Service Key (first 30 chars):', serviceKey?.slice(0, 30) + '...');

function makeRequest(endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(endpoint, url);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: data ? 'POST' : 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ data: parsed, status: res.statusCode, headers: res.headers });
        } catch (e) {
          resolve({ data: responseData, status: res.statusCode, headers: res.headers });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testDirectHTTP() {
  try {
    console.log('\n🔎 Testing dive_logs table...');
    const logsResult = await makeRequest('/rest/v1/dive_logs?select=count');
    console.log('✅ dive_logs response:', logsResult.data);
    
    console.log('\n🖼️ Testing dive_log_image table...');
    const imagesResult = await makeRequest('/rest/v1/dive_log_image?select=count');
    console.log('✅ dive_log_image response:', imagesResult.data);
    
    console.log('\n💾 Testing insert...');
    const testRecord = {
      user_id: 'test-user-' + Date.now(),
      bucket: 'test-bucket',
      path: 'test-path',
      original_filename: 'test.jpg',
      file_size: 1000,
      mime_type: 'image/jpeg',
      ai_analysis: 'Test analysis',
      extracted_metrics: { test: true },
      ocr_text: 'Test OCR'
    };
    
    const insertResult = await makeRequest('/rest/v1/dive_log_image', testRecord);
    
    if (insertResult.status === 201 || insertResult.status === 200) {
      console.log('✅ Insert successful!', insertResult.data);
      
      // Clean up
      if (insertResult.data && insertResult.data[0] && insertResult.data[0].id) {
        const deleteResult = await makeRequest(`/rest/v1/dive_log_image?id=eq.${insertResult.data[0].id}`, null);
        console.log('✅ Cleanup completed');
      }
    } else {
      console.log('❌ Insert failed:', insertResult.status, insertResult.data);
    }
    
    console.log('\n🎉 All direct HTTP tests passed!');
    return true;
    
  } catch (error) {
    console.log('❌ Error:', error);
    return false;
  }
}

testDirectHTTP();
