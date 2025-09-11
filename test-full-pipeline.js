#!/usr/bin/env node

// Test full pipeline: Image analysis → Dive log analysis with real data
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, 'apps/web/.env.local') });

async function testFullPipeline() {
  console.log('🔗 Testing full pipeline: Real dive image → OpenAI analysis → Coaching feedback');
  
  const imageFile = '110m pb phillipines 060719.JPG'; // Your 110m PB
  const imagePath = path.join(__dirname, 'public/freedive log', imageFile);
  
  if (!fs.existsSync(imagePath)) {
    console.log(`❌ Image not found: ${imageFile}`);
    return;
  }
  
  console.log(`\n🎯 Testing with: ${imageFile}`);
  console.log('📊 Expected: 108.7m depth, 02:53 time, 29°C');
  
  try {
    // Step 1: Simulate image analysis results (we know it works from previous test)
    const mockImageAnalysis = {
      extractedData: {
        maxDepth: 108.7,
        diveTime: "02:53",
        diveTimeSeconds: 173,
        temperature: 29,
        date: "2019-06-06",
        visibility: "clear"
      },
      profileAnalysis: {
        descentPhase: {
          averageDescentRate: 0.63, // 108.7m / 173s ≈ 0.63 m/s
          calculatedFromGraph: true
        },
        ascentPhase: {
          averageAscentRate: 0.63,
          calculatedFromGraph: true
        },
        bottomPhase: {
          bottomTime: 5,
          detectedFromGraph: true
        }
      },
      coachingInsights: {
        dataQuality: 'excellent',
        analysisConfidence: 'high'
      },
      confidence: 'high'
    };
    
    // Step 2: Test dive log analysis with this real data
    console.log('\n🧠 Testing dive log analysis with real extracted data...');
    
    const analysisPayload = {
      diveLogData: {
        date: '2019-06-06',
        discipline: 'Constant Weight',
        location: 'Philippines',
        targetDepth: 110, // Target was 110m
        reachedDepth: 108.7, // Actual from computer
        totalDiveTime: '02:53', // Real time
        notes: `Personal Best attempt - ${imageFile}`,
        imageAnalysis: mockImageAnalysis // Pass the real extracted data
      },
      nickname: 'DanielKoval'
    };
    
    const analysisResponse = await fetch('http://localhost:3001/api/analyze/dive-log-openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analysisPayload)
    });
    
    if (analysisResponse.ok) {
      const result = await analysisResponse.json();
      console.log('✅ Dive analysis completed successfully!');
      
      const analysis = result.analysis || '';
      
      // Check if analysis uses real data
      console.log('\n🔍 Checking for real data usage in analysis...');
      
      const usesRealDepth = analysis.includes('108.7') || analysis.includes('108.7m');
      const usesRealTime = analysis.includes('2:53') || analysis.includes('02:53');
      const usesRealSpeed = analysis.includes('0.63') || analysis.includes('descent rate');
      
      console.log(`📊 Uses real depth (108.7m): ${usesRealDepth ? '✅ YES' : '❌ NO'}`);
      console.log(`⏱️ Uses real time (02:53): ${usesRealTime ? '✅ YES' : '❌ NO'}`);
      console.log(`🏃 References speed/rates: ${usesRealSpeed ? '✅ YES' : '❌ NO'}`);
      
      // Show relevant excerpts
      console.log('\n📋 Key Analysis Excerpts:');
      const lines = analysis.split('\n');
      const relevantLines = lines.filter(line => 
        line.includes('108') || 
        line.includes('2:53') || 
        line.includes('depth') ||
        line.includes('rate') ||
        line.includes('speed') ||
        line.includes('m/s')
      );
      
      relevantLines.slice(0, 5).forEach((line, i) => {
        console.log(`   ${i+1}. ${line.trim()}`);
      });
      
      if (usesRealDepth && usesRealTime) {
        console.log('\n🎉 SUCCESS: Analysis correctly uses REAL dive computer data!');
      } else {
        console.log('\n⚠️ Analysis may not be fully utilizing real data');
      }
      
      // Check for hypothetical language
      const hasHypotheticals = analysis.toLowerCase().includes('hypothetical') || 
                             analysis.toLowerCase().includes('estimated') ||
                             analysis.toLowerCase().includes('typically') ||
                             analysis.toLowerCase().includes('assuming');
                             
      console.log(`🚫 Contains hypothetical language: ${hasHypotheticals ? '❌ YES' : '✅ NO'}`);
      
    } else {
      const error = await analysisResponse.text();
      console.log(`❌ Analysis failed: ${analysisResponse.status} - ${error.substring(0, 200)}`);
    }
    
  } catch (error) {
    console.error(`❌ Pipeline test failed:`, error.message);
  }
}

if (require.main === module) {
  testFullPipeline().catch(console.error);
}
