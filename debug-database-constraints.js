#!/usr/bin/env node

// Show exactly what the database constraint errors are

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const USER_ID = '35b522f1-27d2-49de-ed2b-0d257d33ad7d';

async function debugDatabaseConstraints() {
  console.log('🔍 DEBUGGING DATABASE ENUM CONSTRAINTS');
  console.log('=' .repeat(50));
  console.log('\n❌ CURRENT PROBLEM: Database has enum constraints that prevent natural language input\n');
  
  // Test 1: Natural language (should fail)
  console.log('📝 TEST 1: Natural Language Input (Expected to FAIL)');
  const naturalTest = {
    id: `test-${Date.now()}`,
    user_id: USER_ID,
    date: new Date().toISOString().split('T')[0],
    discipline: "Constant Weight with bifins - technique focus",
    location: "Training pool",
    targetDepth: "50",
    reachedDepth: "48",
    surfaceProtocol: "Good recovery with slight breathing increase",
    exit: "Clean exit but rushed final approach",
    notes: "Focused on mouthfill technique"
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/supabase/save-dive-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(naturalTest)
    });
    
    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Result:', result);
    
    if (!response.ok) {
      console.log('\n🎯 ERROR ANALYSIS:');
      try {
        const errorData = JSON.parse(result);
        if (errorData.details?.includes('enum')) {
          console.log('✅ CONFIRMED: Database has enum constraints');
          console.log('Field causing error:', errorData.details);
          
          // Extract field name from error
          const enumMatch = errorData.details.match(/enum\s+(\w+):/);
          if (enumMatch) {
            console.log('Problematic field:', enumMatch[1]);
          }
        }
      } catch (e) {
        console.log('Could not parse error details');
      }
    }
    
  } catch (error) {
    console.log('Request failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🚨 CONCLUSION: Database schema needs to be updated to remove enum constraints');
  console.log('💡 SOLUTION: Run the SQL commands in fix-database-enums.sql on your Supabase database');
  console.log('🎯 RESULT: Users can then input natural language, OpenAI extracts structured data');
}

debugDatabaseConstraints();
