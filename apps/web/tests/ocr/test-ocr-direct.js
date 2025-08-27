const fs = require('fs');
const path = require('path');

// Import the OCR utilities
const { extractTextFromImage } = require('./utils/extractTextFromImage.ts');

async function testOCRDirectly() {
  console.log('🔍 Testing OCR directly on dive computer image...\n');

  const imagePath = path.join(process.cwd(), 'public', 'freedive log', '061921 Vb training first dive to 100m cwt.JPG');
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ Image not found:', imagePath);
    return;
  }

  console.log('📸 Processing image:', imagePath);
  console.log('📊 File size:', fs.statSync(imagePath).size, 'bytes');

  try {
    const imageBuffer = fs.readFileSync(imagePath);
    console.log('✅ Image loaded successfully');

    console.log('🔍 Starting OCR extraction...');
    const ocrResult = await extractTextFromImage(imageBuffer);
    
    console.log('✅ OCR completed!');
    console.log('📝 Extracted text:');
    console.log('---');
    console.log(ocrResult);
    console.log('---');
    
    // Look for common dive computer metrics
    const metrics = {
      depth: /(\d+(?:\.\d+)?)\s*(?:m|meters?|ft|feet?)/gi.exec(ocrResult),
      time: /(\d+):(\d+)/g.exec(ocrResult),
      temp: /(\d+(?:\.\d+)?)\s*(?:°?c|celsius)/gi.exec(ocrResult)
    };
    
    console.log('\n📊 Potential metrics found:');
    Object.entries(metrics).forEach(([key, match]) => {
      if (match) {
        console.log(`   ${key}: ${match[0]}`);
      } else {
        console.log(`   ${key}: not found`);
      }
    });

  } catch (error) {
    console.error('❌ OCR test error:', error.message);
  }
}

testOCRDirectly();
