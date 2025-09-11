#!/usr/bin/env node

// Test OpenAI Vision with actual dive computer images from Daniel's logs
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'apps/web/.env.local') });

async function testWithRealDiveLogs() {
  console.log('🤿 Testing OpenAI Vision with Daniel\'s actual dive computer images...');
  
  // Test with multiple real dive images
  const testImages = [
    '110m pb phillipines 060719.JPG', // 110m PB
    '102m fim asia cup phillippines 61119.JPG', // 102m FIM
    '95m cwt dbh 71118.JPG', // 95m CWT
    '91m phillipines 52419.JPG' // 91m dive
  ];
  
  for (const imageFile of testImages) {
    const imagePath = path.join(__dirname, 'public/freedive log', imageFile);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`⚠️ Image not found: ${imageFile}`);
      continue;
    }
    
    console.log(`\n🧪 Testing: ${imageFile}`);
    console.log('=' + '='.repeat(50));
    
    try {
      // Read image and convert to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      console.log(`📁 Image size: ${Math.round(imageBuffer.length / 1024)}KB`);
      
      // Test the image upload API
      const uploadResponse = await fetch('http://localhost:3001/api/dive/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageData: `data:image/jpeg;base64,${base64Image}`,
          userId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID for Daniel
          filename: imageFile,
          shortPrompt: false // Use full detailed prompt
        })
      });
      
      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        console.log('✅ Image analysis completed successfully!');
        
        // Show extracted data
        if (result.data.extractedData) {
          const extracted = result.data.extractedData;
          console.log('\n📊 EXTRACTED DATA:');
          console.log(`   Max Depth: ${extracted.maxDepth || 'N/A'}m`);
          console.log(`   Dive Time: ${extracted.diveTime || extracted.diveTimeSeconds + 's' || 'N/A'}`);
          console.log(`   Temperature: ${extracted.temperature || 'N/A'}°C`);
          console.log(`   Date: ${extracted.date || 'N/A'}`);
          console.log(`   Mode: ${extracted.diveMode || 'N/A'}`);
          console.log(`   Visibility: ${extracted.visibility || 'N/A'}`);
        }
        
        // Show profile analysis
        if (result.data.profileAnalysis) {
          const profile = result.data.profileAnalysis;
          console.log('\n📈 PROFILE ANALYSIS:');
          console.log(`   Graph Visible: ${profile.graphVisible ? 'Yes' : 'No'}`);
          
          if (profile.descentPhase?.averageDescentRate) {
            console.log(`   Descent Rate: ${profile.descentPhase.averageDescentRate} m/s`);
          }
          if (profile.ascentPhase?.averageAscentRate) {
            console.log(`   Ascent Rate: ${profile.ascentPhase.averageAscentRate} m/s`);
          }
          if (profile.bottomPhase?.bottomTime) {
            console.log(`   Bottom Time: ${profile.bottomPhase.bottomTime} seconds`);
          }
        }
        
        // Show coaching insights
        if (result.data.coachingInsights) {
          const insights = result.data.coachingInsights;
          console.log('\n🎯 COACHING INSIGHTS:');
          console.log(`   Data Quality: ${insights.dataQuality || 'N/A'}`);
          console.log(`   Confidence: ${insights.analysisConfidence || 'N/A'}`);
          console.log(`   Performance Rating: ${result.data.performanceRating || 'N/A'}/10`);
        }
        
        // Show legacy extractedText
        if (result.data.extractedText) {
          console.log('\n📄 LEGACY EXTRACTED TEXT:');
          console.log(result.data.extractedText.substring(0, 300) + '...');
        }
        
        console.log(`\n⚡ Processing Stats:`);
        console.log(`   Tokens Used: ${result.data.tokensUsed}`);
        console.log(`   Confidence: ${result.data.confidence}`);
        console.log(`   Processing Method: ${result.data.processingMethod}`);
        
        // Now test the dive log analysis with this extracted data
        console.log('\n🧠 Testing dive log analysis with extracted data...');
        
        const analysisPayload = {
          diveLogData: {
            date: '2024-01-15',
            discipline: 'Constant Weight',
            location: imageFile.includes('phillipines') ? 'Philippines' : 'Blue Hole',
            targetDepth: extracted.maxDepth || 100, // Use extracted depth as target
            reachedDepth: extracted.maxDepth || 100,
            totalDiveTime: extracted.diveTime || '3:00',
            notes: `Analysis of ${imageFile}`,
            imageAnalysis: result.data // Pass the full structured analysis
          },
          nickname: 'DanielKoval'
        };
        
        const analysisResponse = await fetch('http://localhost:3001/api/analyze/dive-log-openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analysisPayload)
        });
        
        if (analysisResponse.ok) {
          const analysisResult = await analysisResponse.json();
          console.log('✅ Dive analysis completed!');
          
          // Look for real data usage vs hypothetical
          const analysis = analysisResult.analysis || '';
          
          if (analysis.includes('descent rate') || analysis.includes('ascent rate')) {
            console.log('🎯 SUCCESS: Analysis includes speed/rate data');
            
            // Show relevant excerpts
            const lines = analysis.split('\n');
            const speedLines = lines.filter(line => 
              line.toLowerCase().includes('descent') || 
              line.toLowerCase().includes('ascent') || 
              line.toLowerCase().includes('m/s') ||
              line.toLowerCase().includes('rate')
            );
            
            console.log('\n📊 Speed/Rate Analysis:');
            speedLines.slice(0, 3).forEach(line => {
              console.log(`   ${line.trim()}`);
            });
          }
          
        } else {
          console.log(`❌ Analysis failed: ${analysisResponse.status}`);
        }
        
      } else {
        const error = await uploadResponse.text();
        console.log(`❌ Image upload failed: ${uploadResponse.status} - ${error.substring(0, 200)}`);
      }
      
    } catch (error) {
      console.error(`❌ Test failed for ${imageFile}:`, error.message);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

if (require.main === module) {
  testWithRealDiveLogs().catch(console.error);
}
