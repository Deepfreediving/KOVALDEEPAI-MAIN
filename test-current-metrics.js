// Test current metrics extraction to identify what's missing
const fs = require('fs');
const path = require('path');

const imagePath = '/Users/danielkoval/Documents/buildaiagent/KovalDeepAI-main/public/freedive log/112m NR dive VB2018 71818.JPG';

async function testCurrentMetricsExtraction() {
  try {
    console.log('🔍 Testing current metrics extraction with:', path.basename(imagePath));
    
    // Read and encode image
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Make API call to our image analysis endpoint
    const response = await fetch('http://localhost:3000/api/dive/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: base64Image,
        userId: 'test-user',
        filename: path.basename(imagePath)
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', error);
      return;
    }
    
    const result = await response.json();
    
    console.log('\n📊 CURRENT EXTRACTED METRICS:');
    console.log('=====================================');
    
    if (result.extractedMetrics) {
      console.log('Raw extracted metrics:', JSON.stringify(result.extractedMetrics, null, 2));
    }
    
    if (result.analysis) {
      console.log('\nRaw analysis object:', JSON.stringify(result.analysis, null, 2));
    }
    
    if (result.extractedText) {
      console.log('\nExtracted text summary:');
      console.log(result.extractedText);
    }
    
    // Check for missing vital metrics
    const extractedMetrics = result.extractedMetrics || {};
    const missingMetrics = [];
    
    const vitalMetrics = [
      'max_depth', 'dive_time_seconds', 'temperature', 'descent_time', 'ascent_time',
      'descent_rate', 'ascent_rate', 'hang_time', 'surface_interval', 'entry_time',
      'heart_rate', 'dive_mode', 'battery_status', 'decompression_stops',
      'safety_stop_time', 'nitrogen_loading', 'tissue_saturation',
      'workload_assessment', 'visibility', 'current_conditions'
    ];
    
    vitalMetrics.forEach(metric => {
      if (!extractedMetrics[metric] && extractedMetrics[metric] !== 0) {
        missingMetrics.push(metric);
      }
    });
    
    console.log('\n❌ MISSING VITAL FREEDIVING METRICS:');
    console.log('=====================================');
    missingMetrics.forEach(metric => console.log(`- ${metric}`));
    
    console.log('\n✅ SUCCESSFULLY EXTRACTED METRICS:');
    console.log('=====================================');
    Object.keys(extractedMetrics).forEach(metric => {
      console.log(`- ${metric}: ${extractedMetrics[metric]}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCurrentMetricsExtraction();
