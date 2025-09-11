// Simple test endpoint to check environment variables and dependencies
import { getAdminClient } from '@/lib/supabase';

export default async function handler(req, res) {
  try {
    console.log('🔍 Testing environment variables...');
    
    // Check env vars
    const envCheck = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    };
    
    console.log('Environment check:', envCheck);
    
    // Test Supabase client
    const supabase = getAdminClient();
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }
    
    // Test simple query
    const { data, error } = await supabase
      .from('dive_log_image')
      .select('count')
      .limit(1);
      
    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }
    
    res.status(200).json({
      success: true,
      envCheck,
      supabaseTest: 'CONNECTED',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
