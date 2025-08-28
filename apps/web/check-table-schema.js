#!/usr/bin/env node

// Check the actual schema of dive_log_image table
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTableSchema() {
  console.log('🔍 Checking dive_log_image table schema...\n');

  try {
    // Try to get the actual table structure by attempting a select with limit 0
    const { error } = await supabase
      .from('dive_log_image')
      .select('*')
      .limit(0);

    if (error) {
      console.log('❌ Error accessing table:', error.message);
      return;
    }

    console.log('✅ Table exists and is accessible');
    
    // Try a minimal insert to see what columns are required/available
    console.log('\n🧪 Testing minimal record insertion...');
    
    const minimalRecord = {
      user_id: 'test-user-id',
      bucket: 'test-bucket',
      path: 'test-path.jpg'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('dive_log_image')
      .insert(minimalRecord)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Minimal insert failed:', insertError.message);
      
      // Try with even fewer fields
      console.log('\n🧪 Testing with absolute minimum fields...');
      const ultraMinimal = {
        user_id: 'test-user-id'
      };

      const { data: ultraData, error: ultraError } = await supabase
        .from('dive_log_image')
        .insert(ultraMinimal)
        .select()
        .single();

      if (ultraError) {
        console.log('❌ Ultra minimal insert failed:', ultraError.message);
        console.log('\n📋 This tells us about required columns and their constraints.');
      } else {
        console.log('✅ Ultra minimal insert succeeded');
        console.log('Available columns:', Object.keys(ultraData));
        
        // Clean up
        await supabase
          .from('dive_log_image')
          .delete()
          .eq('id', ultraData.id);
      }
    } else {
      console.log('✅ Minimal insert succeeded');
      console.log('Available columns:', Object.keys(insertData));
      
      // Clean up
      await supabase
        .from('dive_log_image')
        .delete()
        .eq('id', insertData.id);
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }
}

async function testExpectedColumns() {
  console.log('\n🧪 Testing expected column structure...\n');

  const expectedColumns = [
    'id',
    'user_id', 
    'dive_log_id',
    'bucket',
    'path',
    'original_filename',
    'file_size',
    'mime_type',
    'ai_analysis',
    'extracted_metrics',
    'created_at',
    'updated_at'
  ];

  for (const column of expectedColumns) {
    try {
      const { error } = await supabase
        .from('dive_log_image')
        .select(column)
        .limit(0);

      if (error) {
        if (error.message.includes(`${column}`)) {
          console.log(`❌ Column '${column}' - MISSING`);
        } else {
          console.log(`❓ Column '${column}' - Unknown error: ${error.message}`);
        }
      } else {
        console.log(`✅ Column '${column}' - EXISTS`);
      }
    } catch (err) {
      console.log(`❌ Column '${column}' - ERROR: ${err.message}`);
    }
  }
}

checkTableSchema()
  .then(() => testExpectedColumns())
  .catch(console.error);
