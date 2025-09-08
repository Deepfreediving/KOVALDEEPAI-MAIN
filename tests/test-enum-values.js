#!/usr/bin/env node

// Test with different enum values to find what's valid
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

// Test different enum values
const enumTests = [
  {
    name: 'surface_protocol',
    values: ['good', 'fair', 'poor', 'ok', 'clean', 'samba', 'lmc', 'bo']
  },
  {
    name: 'discipline', 
    values: ['CWT', 'CNF', 'FIM', 'CWTB', 'constant_weight', 'constant_no_fins', 'free_immersion']
  },
  {
    name: 'exit_protocol',
    values: ['clean', 'samba', 'lmc', 'bo', 'good', 'ok']
  }
];

async function testEnumValues() {
  console.log('🧪 Testing Database Enum Values');
  console.log('=' .repeat(50));
  
  for (const enumTest of enumTests) {
    console.log(`\n🔍 Testing ${enumTest.name}:`);
    
    for (const value of enumTest.values) {
      try {
        const testData = {
          id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          user_id: USER_ID,
          date: new Date().toISOString().split('T')[0],
          disciplineType: "depth",
          discipline: enumTest.name === 'discipline' ? value : "CWT",
          location: "Test Location",
          targetDepth: "50",
          reachedDepth: "48",
          totalDiveTime: "2:30",
          exit: enumTest.name === 'exit_protocol' ? value : "clean",
          surface_protocol: enumTest.name === 'surface_protocol' ? value : "good",
          notes: `Testing ${enumTest.name} = ${value}`
        };
        
        const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testData)
        });
        
        const result = await response.text();
        
        if (response.ok) {
          console.log(`  ✅ ${value} - SUCCESS`);
        } else {
          console.log(`  ❌ ${value} - FAILED: ${result.substring(0, 100)}...`);
        }
        
      } catch (error) {
        console.log(`  ❌ ${value} - ERROR: ${error.message}`);
      }
    }
  }
  
  console.log('\n🎯 Test completed! Check which values worked to identify valid enums.');
}

testEnumValues();
