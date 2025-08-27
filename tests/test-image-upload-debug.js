const fs = require('fs');
const path = require('path');

// Test base64 upload with real monitoring
console.log('🧪 Testing base64 image upload with enhanced debugging...');

const testImagePath = path.join(__dirname, 'apps/web/public', 'test-dive-profile.jpg');
if (!fs.existsSync(testImagePath)) {
  console.log('❌ Test image not found at:', testImagePath);
  process.exit(1);
}

const imageBuffer = fs.readFileSync(testImagePath);
const base64Data = 'data:image/jpeg;base64,' + imageBuffer.toString('base64');

const testData = {
  imageData: base64Data,
  userId: 'c3d9f7c0-7e8a-4f5e-9b2a-8c1d4e6f7a9b', // admin UUID
  filename: 'test-dive-computer.jpg'
};

console.log('📝 Test data prepared, calling API...');

fetch('http://localhost:3000/api/openai/upload-dive-image-base64', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log('✅ API Response:', JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error('❌ API Error:', error);
});
