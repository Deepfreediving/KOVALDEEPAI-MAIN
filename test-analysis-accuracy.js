#!/usr/bin/env node

// Test dive log analysis with real vs hypothetical image data
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'apps/web/.env.local') });

async function testDiveLogAnalysis() {
  console.log('🧪 Testing dive log analysis with real vs hypothetical data...');
  
  // Test 1: No image data (should not generate hypothetical metrics)
  console.log('\n📋 Test 1: Analysis without image data');
  const testPayload1 = {
    diveLogData: {
      date: '2024-01-15',
      discipline: 'Constant Weight',
      location: 'Blue Hole',
      targetDepth: 50,
      reachedDepth: 48,
      totalDiveTime: '2:15',
      notes: 'Good dive, felt strong'
    },
    nickname: 'TestDiver'
  };
  
  await testAnalysis(testPayload1, 'No Image Data');
  
  // Test 2: With mock real image data
  console.log('\n📋 Test 2: Analysis with real extracted data');
  const testPayload2 = {
    diveLogData: {
      date: '2024-01-15',
      discipline: 'Constant Weight',
      location: 'Blue Hole',
      targetDepth: 50,
      reachedDepth: 48,
      totalDiveTime: '2:15',
      notes: 'Good dive, felt strong',
      imageAnalysis: {
        extractedData: {
          maxDepth: 48.2,
          diveTime: '2:18',
          diveTimeSeconds: 138,
          temperature: 24,
          visibility: 'clear'
        },
        profileAnalysis: {
          descentPhase: {
            averageDescentRate: 0.85,
            calculatedFromGraph: true
          },
          ascentPhase: {
            averageAscentRate: 0.72,
            calculatedFromGraph: true
          },
          bottomPhase: {
            bottomTime: 3,
            detectedFromGraph: true
          }
        },
        coachingInsights: {
          dataQuality: 'excellent',
          analysisConfidence: 'high'
        }
      }
    },
    nickname: 'TestDiver'
  };
  
  await testAnalysis(testPayload2, 'With Real Extracted Data');
}

async function testAnalysis(payload, testName) {
  try {
    console.log(`\n🚀 Running: ${testName}`);
    
    const response = await fetch('http://localhost:3001/api/analyze/dive-log-openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Analysis completed');
      
      // Look for specific patterns in the analysis
      const analysis = result.analysis || '';
      
      // Check if it mentions real data vs hypothetical
      if (analysis.includes('based on the dive computer data') || analysis.includes('extracted data') || analysis.includes('actual')) {
        console.log('🎯 GOOD: Analysis references real/actual data');
      } else if (analysis.includes('typically') || analysis.includes('estimated') || analysis.includes('approximately')) {
        console.log('⚠️ WARNING: Analysis may be using hypothetical values');
      }
      
      // Show key excerpts
      const lines = analysis.split('\n');
      const relevantLines = lines.filter(line => 
        line.includes('descent') || 
        line.includes('ascent') || 
        line.includes('speed') || 
        line.includes('rate') ||
        line.includes('m/s') ||
        line.includes('seconds')
      );
      
      console.log('📊 Relevant analysis excerpts:');
      relevantLines.slice(0, 3).forEach(line => {
        console.log(`   ${line.trim()}`);
      });
      
    } else {
      const error = await response.text();
      console.log(`❌ Analysis failed: ${response.status} - ${error}`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

if (require.main === module) {
  testDiveLogAnalysis().catch(console.error);
}
