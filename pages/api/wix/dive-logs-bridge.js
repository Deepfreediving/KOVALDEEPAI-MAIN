// NEW FILE - does not overwrite anything  
// pages/api/wix/dive-logs-bridge.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // ✅ OPTION 1: Try your existing query-wix-data.js
    try {
      const queryResponse = await fetch(`${req.headers.origin}/api/wix/query-wix-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: 'userMemory', // Your dive logs collection
          filter: { userId: { $eq: userId } },
          limit: 50
        })
      });

      if (queryResponse.ok) {
        const queryData = await queryResponse.json();
        return res.status(200).json({
          diveLogs: queryData.items || [],
          success: true,
          source: 'wix-query-api'
        });
      }
    } catch (queryError) {
      console.warn('⚠️ Wix query failed, trying direct backend...');
    }

    // ✅ OPTION 2: Try your Wix backend directly
    try {
      const wixResponse = await fetch(`https://www.deepfreediving.com/_functions/diveLogs?userId=${encodeURIComponent(userId)}`);
      
      if (wixResponse.ok) {
        const wixData = await wixResponse.json();
        return res.status(200).json({
          diveLogs: wixData.data || [],
          success: true,
          source: 'wix-backend'
        });
      }
    } catch (wixError) {
      console.warn('⚠️ Wix backend also failed');
    }

    // ✅ OPTION 3: Empty fallback
    return res.status(200).json({
      diveLogs: [],
      success: true,
      source: 'empty-fallback'
    });

  } catch (error) {
    console.error('❌ Dive logs bridge error:', error);
    return res.status(500).json({ 
      error: 'Could not load dive logs',
      diveLogs: [],
      success: false
    });
  }
}