const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

async function testOCRDirectly() {
  console.log('🔍 Testing OCR directly on dive computer image...\n');

  const imagePath = path.join(process.cwd(), '../../public/freedive log', '061921 Vb training first dive to 100m cwt.JPG');
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ Image not found:', imagePath);
    return;
  }

  console.log('📸 Processing image:', imagePath);
  console.log('📊 File size:', fs.statSync(imagePath).size, 'bytes');

  try {
    console.log('🔍 Starting OCR with Tesseract.js...');
    
    const worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`📝 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    const { data: { text } } = await worker.recognize(imagePath);
    await worker.terminate();
    
    console.log('✅ OCR completed!');
    console.log('📝 Extracted text:');
    console.log('---');
    console.log(text);
    console.log('---');
    
    // Look for common dive computer metrics
    const depthMatches = text.match(/(\d+(?:\.\d+)?)\s*(?:m|meters?|ft|feet?)/gi) || [];
    const timeMatches = text.match(/(\d+):(\d+)/g) || [];
    const tempMatches = text.match(/(\d+(?:\.\d+)?)\s*(?:°?c|celsius)/gi) || [];
    
    console.log('\n📊 Potential metrics found:');
    console.log(`   Depths: ${depthMatches.join(', ') || 'none'}`);
    console.log(`   Times: ${timeMatches.join(', ') || 'none'}`);
    console.log(`   Temperatures: ${tempMatches.join(', ') || 'none'}`);

    // Look for specific dive computer terms
    const diveTerms = [
      'max', 'depth', 'time', 'temp', 'surface', 'dive', 'bottom',
      'ascent', 'descent', 'safety', 'stop', 'alarm', 'log'
    ];
    
    console.log('\n🤿 Dive-related terms found:');
    diveTerms.forEach(term => {
      const regex = new RegExp(term, 'gi');
      const matches = text.match(regex);
      if (matches) {
        console.log(`   ${term}: ${matches.length} occurrence(s)`);
      }
    });

  } catch (error) {
    console.error('❌ OCR test error:', error.message);
  }
}

testOCRDirectly();
