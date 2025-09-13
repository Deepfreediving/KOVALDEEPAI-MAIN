const fs = require('fs');
require('dotenv').config();

async function testVision112m() {
  try {
    console.log('🧪 Testing OpenAI Vision with 112m dive image...');
    
    // Load the exact image you uploaded
    const imagePath = './public/freedive log/Deepest dive on new mooring BO on surface and squeeze from bottom turn 121320 112m.JPG';
    
    if (!fs.existsSync(imagePath)) {
      console.error('❌ Image not found at:', imagePath);
      return;
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    console.log('📸 Image loaded:', Math.round(imageBuffer.length / 1024), 'KB');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: `Extract the dive computer data from this freediving computer display. 
            
CRITICAL: Only extract data that is clearly visible in the image. Do not estimate or make up any values.

Return in this exact format:
- Depth: [visible depth value]
- Time: [visible time value] 
- Temperature: [visible temperature value]
- Date: [visible date value]

If any value is not clearly visible, write "Not visible" for that field.`
          }, {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }]
        }],
        max_tokens: 500
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ OpenAI API Error:', data.error);
    } else {
      console.log('✅ OpenAI Vision Response:');
      console.log(data.choices[0].message.content);
      console.log('\n🔍 Expected data from image:');
      console.log('- Depth: 112.0m');
      console.log('- Time: 0:03\'12'); 
      console.log('- Temperature: 31°C');
      console.log('- Date: 12/13/2020');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testVision112m();
