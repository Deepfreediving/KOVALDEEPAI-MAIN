// Test Supabase connections and database access
import { getAdminClient } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const results = {
    tests: [],
    summary: { total: 0, passed: 0, failed: 0 }
  };

  const addTest = (name, status, message, details = null) => {
    results.tests.push({ name, status, message, details });
    results.summary.total++;
    if (status === 'PASS') results.summary.passed++;
    else results.summary.failed++;
  };

  try {
    console.log('🔗 Starting Supabase Connection Tests...');

    // Test 1: Admin Client Initialization
    try {
      const supabase = getAdminClient();
      addTest('Admin Client', 'PASS', 'Admin client created successfully');
    } catch (error) {
      addTest('Admin Client', 'FAIL', 'Failed to create admin client', error.message);
      return res.status(500).json(results);
    }

    const supabase = getAdminClient();

    // Test 2: Database Connection
    try {
      const { error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(1);

      if (error) throw error;
      addTest('Database Connection', 'PASS', 'Database connection successful');
    } catch (error) {
      addTest('Database Connection', 'FAIL', 'Database connection failed', error.message);
    }

    // Test 3: Storage Access
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      addTest('Storage Access', 'PASS', `Storage accessible, found ${buckets.length} buckets`);
    } catch (error) {
      addTest('Storage Access', 'FAIL', 'Storage access failed', error.message);
    }

    // Test 4: Required Tables
    const requiredTables = ['users', 'dive_logs', 'dive_log_image'];
    for (const tableName of requiredTables) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) throw error;
        addTest(`Table: ${tableName}`, 'PASS', `Table ${tableName} accessible`);
      } catch (error) {
        addTest(`Table: ${tableName}`, 'FAIL', `Table ${tableName} not accessible`, error.message);
      }
    }

    // Test 5: Environment Variables
    const envVars = [
      { name: 'SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
      { name: 'SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_KEY },
      { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY }
    ];

    envVars.forEach(({ name, value }) => {
      if (value && value.length > 10) {
        addTest(`Env: ${name}`, 'PASS', `${name} configured`);
      } else {
        addTest(`Env: ${name}`, 'FAIL', `${name} missing or invalid`);
      }
    });

    console.log('✅ Supabase tests completed');

    // Return results
    return res.status(200).json({
      success: results.summary.failed === 0,
      message: results.summary.failed === 0 ? 'All tests passed!' : `${results.summary.failed} tests failed`,
      ...results
    });

  } catch (error) {
    addTest('General Error', 'FAIL', 'Unexpected error during testing', error.message);
    console.error('❌ Supabase test error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Testing failed with unexpected error',
      ...results,
      error: error.message
    });
  }
}
