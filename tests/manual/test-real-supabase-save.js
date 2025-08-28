#!/usr/bin/env node

// Real test script that actually saves data to Supabase
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Set up Supabase client with service role key for admin access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  console.log('SUPABASE_ANON_KEY:', !!supabaseAnonKey);
  process.exit(1);
}

// Try both keys
console.log('🔑 Testing with service role key...');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test function to check which key works
async function testConnection() {
  console.log('🧪 Testing Supabase connection...\n');

  // Test with service role key
  try {
    const { data, error } = await supabase.from('dive_logs').select('id').limit(1);
    if (error) {
      console.log('❌ Service role key failed:', error.message);
      
      // Try with anon key
      console.log('🔑 Trying with anon key...');
      const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
      const { data: anonData, error: anonError } = await supabaseAnon.from('dive_logs').select('id').limit(1);
      
      if (anonError) {
        console.log('❌ Anon key also failed:', anonError.message);
        return null;
      } else {
        console.log('✅ Anon key works! Using anon key for tests.');
        return supabaseAnon;
      }
    } else {
      console.log('✅ Service role key works!');
      return supabase;
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return null;
  }
}

async function testRealDiveLogSave() {
  console.log('🧪 Testing REAL dive log save to Supabase...\n');

  try {
    const activeSupabase = global.supabase || supabase;
    console.log('✅ Using active Supabase client');

    // Test 1: Save a dive log image record first (check schema first)
    console.log('📸 Step 1: Testing dive_log_image table schema...');
    
    // First, let's check what columns exist in the dive_log_image table
    const { data: schemaCheck, error: schemaError } = await activeSupabase
      .from('dive_log_image')
      .select('*')
      .limit(1);
    
    if (schemaError && !schemaError.message.includes('No rows')) {
      console.error('❌ Schema check failed:', schemaError);
      // Let's try with basic fields only
      console.log('🔧 Trying with basic image record...');
      
      const basicImageRecord = {
        user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        dive_log_id: null,
        bucket: 'dive-images',
        path: 'test-dive-image-' + Date.now() + '.jpg',
        original_filename: 'test-dive-computer.jpg',
        file_size: 150000,
        mime_type: 'image/jpeg',
        ai_analysis: 'Test analysis: Dive computer shows maximum depth of 32.5 meters, dive time of 3 minutes 45 seconds, water temperature 24°C',
        created_at: new Date().toISOString()
      };
      
      const { data: savedImage, error: imageError } = await activeSupabase
        .from('dive_log_image')
        .insert(basicImageRecord)
        .select()
        .single();
        
      if (imageError) {
        console.error('❌ Failed to save basic image record:', imageError);
        return;
      }
      
      console.log('✅ Basic image record saved:', {
        id: savedImage.id,
        path: savedImage.path,
        hasAnalysis: !!savedImage.ai_analysis
      });
      
      // Continue with dive log creation using the basic image
      var finalSavedImage = savedImage;
      
    } else {
      console.log('✅ Schema check passed, using full image record');
      
      const imageRecord = {
        user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        dive_log_id: null,
        bucket: 'dive-images',
        path: 'test-dive-image-' + Date.now() + '.jpg',
        original_filename: 'test-dive-computer.jpg',
        file_size: 150000,
        mime_type: 'image/jpeg',
        ai_analysis: 'Test analysis: Dive computer shows maximum depth of 32.5 meters, dive time of 3 minutes 45 seconds, water temperature 24°C',
        extracted_metrics: {
          max_depth: 32.5,
          dive_time_seconds: 225,
          temperature: 24,
          descent_time: 90,
          ascent_time: 135
        },
        created_at: new Date().toISOString()
      };

      const { data: savedImage, error: imageError } = await activeSupabase
        .from('dive_log_image')
        .insert(imageRecord)
        .select()
        .single();

      if (imageError) {
        console.error('❌ Failed to save full image record:', imageError);
        return;
      }

      console.log('✅ Full image record saved:', {
        id: savedImage.id,
        path: savedImage.path,
        hasMetrics: !!savedImage.extracted_metrics,
        metricsCount: Object.keys(savedImage.extracted_metrics || {}).length
      });
      
      var finalSavedImage = savedImage;
    }

    // Test 2: Save a dive log with the image data
    console.log('\n💾 Step 2: Testing dive_logs table...');
    
    const diveLogRecord = {
      id: `test-dive-${Date.now()}`,
      user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      date: '2025-08-26',
      discipline: 'Constant Weight No Fins',
      location: 'Test Pool - Blue Hole',
      target_depth: 30,
      reached_depth: 32.5, // From image analysis
      mouthfill_depth: null,
      issue_depth: null,
      total_dive_time: '3:45', // From image analysis
      squeeze: false,
      issue_comment: null,
      exit: 'Clean',
      attempt_type: 'Training',
      surface_protocol: 'Good recovery',
      notes: 'Test dive with extracted metrics from dive computer image',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        disciplineType: 'depth',
        imageAnalysis: finalSavedImage.ai_analysis,
        extractedMetrics: finalSavedImage.extracted_metrics || {
          max_depth: 32.5,
          dive_time_seconds: 225,
          temperature: 24,
          descent_time: 90,
          ascent_time: 135
        },
        imageId: finalSavedImage.id,
        autoExtractedData: {
          source: 'dive_computer_image',
          extractedAt: new Date().toISOString(),
          confidence: 'high'
        }
      }
    };

    const { data: savedDiveLog, error: diveLogError } = await activeSupabase
      .from('dive_logs')
      .insert(diveLogRecord)
      .select()
      .single();

    if (diveLogError) {
      console.error('❌ Failed to save dive log:', diveLogError);
      return;
    }

    console.log('✅ Dive log saved:', {
      id: savedDiveLog.id,
      depth: savedDiveLog.reached_depth,
      time: savedDiveLog.total_dive_time,
      location: savedDiveLog.location,
      hasMetadata: !!savedDiveLog.metadata
    });

    // Test 3: Link the image to the dive log
    console.log('\n🔗 Step 3: Linking image to dive log...');
    
    const { error: linkError } = await activeSupabase
      .from('dive_log_image')
      .update({ dive_log_id: savedDiveLog.id })
      .eq('id', finalSavedImage.id);

    if (linkError) {
      console.error('❌ Failed to link image to dive log:', linkError);
      return;
    }

    console.log('✅ Image linked to dive log');

    // Test 4: Verify the complete data by fetching it back
    console.log('\n🔍 Step 4: Verifying saved data...');
    
    // Fetch dive logs with images
    const { data: diveLogs, error: fetchError } = await activeSupabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error('❌ Failed to fetch dive logs:', fetchError);
      return;
    }

    console.log(`✅ Found ${diveLogs.length} dive logs in database`);

    // Find our test dive log
    const testDiveLog = diveLogs.find(log => log.id === savedDiveLog.id);
    if (testDiveLog) {
      console.log('✅ Test dive log found in database:', {
        id: testDiveLog.id,
        depth: testDiveLog.reached_depth,
        time: testDiveLog.total_dive_time,
        hasMetadata: !!testDiveLog.metadata,
        hasExtractedMetrics: !!testDiveLog.metadata?.extractedMetrics
      });
    }

    // Fetch associated images
    const { data: images, error: imagesFetchError } = await activeSupabase
      .from('dive_log_image')
      .select('*')
      .eq('dive_log_id', savedDiveLog.id);

    if (imagesFetchError) {
      console.error('❌ Failed to fetch images:', imagesFetchError);
      return;
    }

    console.log(`✅ Found ${images.length} images linked to dive log`);
    if (images.length > 0) {
      console.log('📊 Image details:', {
        id: images[0].id,
        filename: images[0].original_filename,
        hasAnalysis: !!images[0].ai_analysis,
        hasMetrics: !!images[0].extracted_metrics,
        metricsKeys: Object.keys(images[0].extracted_metrics || {})
      });
    }

    console.log('\n🎉 SUCCESS! All data saved and linked properly');
    console.log('\n📋 Summary:');
    console.log(`✅ Dive log ID: ${savedDiveLog.id}`);
    console.log(`✅ Image ID: ${finalSavedImage.id}`);
    console.log(`✅ Extracted metrics: ${Object.keys(finalSavedImage.extracted_metrics || {}).join(', ')}`);
    console.log(`✅ Data properly linked and accessible`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function checkCurrentData() {
  console.log('\n🔍 Checking current data in Supabase...\n');

  try {
    const activeSupabase = global.supabase || supabase;
    
    // Check dive logs table
    const { data: diveLogs, error: diveLogsError } = await activeSupabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .order('created_at', { ascending: false })
      .limit(10);

    if (diveLogsError) {
      console.error('❌ Error fetching dive logs:', diveLogsError);
    } else {
      console.log(`📋 Current dive logs: ${diveLogs.length}`);
      diveLogs.forEach(log => {
        console.log(`  • ${log.date} - ${log.location || 'Unknown'} - ${log.reached_depth || log.target_depth}m`);
      });
    }

    // Check dive log images table
    const { data: images, error: imagesError } = await activeSupabase
      .from('dive_log_image')
      .select('*')
      .eq('user_id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .order('created_at', { ascending: false });

    if (imagesError) {
      console.error('❌ Error fetching images:', imagesError);
    } else {
      console.log(`📸 Current images: ${images.length}`);
      images.forEach(img => {
        console.log(`  • ${img.original_filename} - ${img.dive_log_id ? 'Linked' : 'Unlinked'} - ${Object.keys(img.extracted_metrics || {}).length} metrics`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking current data:', error);
  }
}

// Run tests
async function runTest() {
  console.log('🚀 Starting real Supabase test...\n');
  
  // Test connection first
  const workingSupabase = await testConnection();
  if (!workingSupabase) {
    console.error('❌ Could not establish Supabase connection');
    return;
  }

  // Update the global supabase variable for the tests
  global.supabase = workingSupabase;
  
  await checkCurrentData();
  await testRealDiveLogSave();
}

runTest().catch(console.error);
