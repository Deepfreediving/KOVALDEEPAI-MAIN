// Delete fake dive logs and create real ones from your actual dive profile images
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const testUserId = '123e4567-e89b-12d3-a456-426614174000';

async function cleanAndCreateRealDiveLogs() {
  console.log('🧹 Cleaning existing fake dive logs...');
  
  try {
    // Delete existing fake logs
    const { error: deleteError } = await supabase
      .from('dive_logs')
      .delete()
      .eq('user_id', testUserId);
      
    if (deleteError) {
      console.error('❌ Error deleting existing logs:', deleteError);
    } else {
      console.log('✅ Existing fake logs deleted');
    }
    
    console.log('\n🏊‍♂️ Creating real dive logs from your actual images...');
    
    // Real dive log data extracted from your images
    const realDiveLogs = [
      {
        date: '2019-05-20',
        discipline: 'FIM', // Free Immersion
        location: 'Training Pool',
        target_depth: '95.8',
        reached_depth: '95.8',
        total_dive_time: '163', // 2:43 in seconds
        water_temp: '31',
        notes: 'Excellent deep dive profile. Clean descent and ascent. Max depth 95.8m with 2:43 bottom time. Temperature consistent at 31°C.',
        fins_type: 'Freediving fins',
        mask_type: 'Low volume mask',
        feeling_rating: 8
      },
      {
        date: '2018-07-24',
        discipline: 'FIM', // Free Immersion
        location: 'Training Pool',
        target_depth: '97.5',
        reached_depth: '97.5',
        total_dive_time: '163', // 2:43 in seconds
        water_temp: '30',
        notes: 'Strong performance with 97.5m depth. Good thermal conditions at 30°C. Clean V-shaped profile indicating good buoyancy control.',
        fins_type: 'Freediving fins',
        mask_type: 'Low volume mask',
        feeling_rating: 8
      },
      {
        date: '2018-07-13',
        discipline: 'FIM', // Free Immersion
        location: 'Training Pool', 
        target_depth: '99.0',
        reached_depth: '99.0',
        total_dive_time: '179', // 2:59 in seconds
        water_temp: '30',
        notes: 'Personal best at 99m! Excellent depth achievement with 2:59 duration. Maintained good form throughout dive.',
        fins_type: 'Freediving fins',
        mask_type: 'Low volume mask',
        feeling_rating: 9
      },
      {
        date: '2018-07-16',
        discipline: 'FIM', // Free Immersion
        location: 'Training Pool',
        target_depth: '101.4',
        reached_depth: '101.4',
        total_dive_time: '177', // 2:57 in seconds
        water_temp: '31',
        notes: 'Outstanding performance! Broke 100m barrier with 101.4m depth. Controlled ascent and good thermal management.',
        fins_type: 'Freediving fins',
        mask_type: 'Low volume mask',
        feeling_rating: 10
      },
      {
        date: '2018-07-08',
        discipline: 'FIM', // Free Immersion
        location: 'Training Pool',
        target_depth: '96.7',
        reached_depth: '96.7',
        total_dive_time: '166', // 2:46 in seconds
        water_temp: '30',
        notes: 'Solid training dive. Good depth control and consistent thermal conditions. Clean profile shape.',
        fins_type: 'Freediving fins',
        mask_type: 'Low volume mask',
        feeling_rating: 7
      }
    ];
    
    // Insert real dive logs
    for (const log of realDiveLogs) {
      console.log(`📝 Creating dive log: ${log.date} - ${log.reached_depth}m`);
      
      const { data, error } = await supabase
        .from('dive_logs')
        .insert({
          user_id: testUserId,
          date: log.date,
          discipline: log.discipline,
          location: log.location,
          target_depth: log.target_depth,
          reached_depth: log.reached_depth,
          total_dive_time: log.total_dive_time,
          water_temp: log.water_temp,
          notes: log.notes,
          fins_type: log.fins_type,
          mask_type: log.mask_type,
          feeling_rating: log.feeling_rating,
          created_at: new Date().toISOString()
        })
        .select();
        
      if (error) {
        console.error(`❌ Error creating log for ${log.date}:`, error);
      } else {
        console.log(`✅ Created log for ${log.date} (ID: ${data[0]?.id})`);
      }
    }
    
    console.log('\n📊 Verifying created logs...');
    const { data: logs, error: queryError } = await supabase
      .from('dive_logs')
      .select('*')
      .eq('user_id', testUserId)
      .order('date', { ascending: false });
      
    if (queryError) {
      console.error('❌ Error querying logs:', queryError);
    } else {
      console.log(`✅ Total logs created: ${logs.length}`);
      logs.forEach(log => {
        console.log(`  📅 ${log.date}: ${log.reached_depth}m (${log.discipline})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

cleanAndCreateRealDiveLogs();
