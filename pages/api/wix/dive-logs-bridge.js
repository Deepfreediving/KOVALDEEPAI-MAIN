// Enhanced Wix Dive Logs Bridge API - Integrates with consolidated master files
// pages/api/wix/dive-logs-bridge.js

import handleCors from '@/utils/handleCors';

export default async function handler(req, res) {
  // Handle CORS
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { userId, limit = 50, includeAnalysis = false } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'userId required',
        diveLogs: [],
        success: false 
      });
    }

    console.log(`🏊‍♂️ Loading dive logs for userId=${userId}, limit=${limit}`);

    // ✅ OPTION 1: Try consolidated Wix dive logs endpoint (original name)
    try {
      const wixMasterResponse = await fetch('https://www.deepfreediving.com/_functions/http-diveLogs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Source': 'nextjs-bridge',
          'X-User-Agent': 'KovalDeepAI-Widget'
        },
        body: JSON.stringify({
          action: 'getDiveLogs',
          userId,
          limit,
          includeAnalysis,
          version: 'v4.0'
        })
      });

      if (wixMasterResponse.ok) {
        const wixData = await wixMasterResponse.json();
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Wix master dive logs loaded: ${wixData.data?.length || 0} logs in ${processingTime}ms`);
        
        return res.status(200).json({
          diveLogs: wixData.data || wixData.diveLogs || [],
          success: true,
          source: 'wix-master-backend',
          metadata: {
            count: wixData.data?.length || 0,
            processingTime,
            hasAnalysis: includeAnalysis
          }
        });
      } else {
        console.warn(`⚠️ Wix master dive logs endpoint returned ${wixMasterResponse.status}`);
      }
    } catch (wixMasterError) {
      console.warn('⚠️ Wix master dive logs unavailable:', wixMasterError.message);
    }

    // ✅ OPTION 2: Try legacy Wix dive logs endpoint
    try {
      const wixLegacyResponse = await fetch(`https://www.deepfreediving.com/_functions/diveLogs?userId=${encodeURIComponent(userId)}&limit=${limit}`);
      
      if (wixLegacyResponse.ok) {
        const wixData = await wixLegacyResponse.json();
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Wix legacy dive logs loaded: ${wixData.data?.length || 0} logs in ${processingTime}ms`);
        
        return res.status(200).json({
          diveLogs: wixData.data || [],
          success: true,
          source: 'wix-legacy-backend',
          metadata: {
            count: wixData.data?.length || 0,
            processingTime
          }
        });
      }
    } catch (wixLegacyError) {
      console.warn('⚠️ Wix legacy dive logs also failed:', wixLegacyError.message);
    }

    // ✅ OPTION 3: Try Wix data query API (for userMemory collection)
    try {
      const queryResponse = await fetch(`${req.headers.origin}/api/wix/query-wix-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: 'userMemory',
          filter: { userId: { $eq: userId } },
          limit: Math.min(limit, 100)
        })
      });

      if (queryResponse.ok) {
        const queryData = await queryResponse.json();
        const processingTime = Date.now() - startTime;
        
        // Extract dive logs from userMemory items
        const diveLogs = [];
        if (queryData.items) {
          queryData.items.forEach(item => {
            if (item.data?.diveLogs && Array.isArray(item.data.diveLogs)) {
              diveLogs.push(...item.data.diveLogs);
            }
          });
        }
        
        console.log(`✅ Wix query API dive logs loaded: ${diveLogs.length} logs in ${processingTime}ms`);
        
        return res.status(200).json({
          diveLogs: diveLogs.slice(0, limit),
          success: true,
          source: 'wix-query-api',
          metadata: {
            count: diveLogs.length,
            processingTime
          }
        });
      }
    } catch (queryError) {
      console.warn('⚠️ Wix query API failed:', queryError.message);
    }

    // ✅ OPTION 4: Try local Next.js dive logs API
    try {
      const nextjsResponse = await fetch(`${req.headers.origin}/api/analyze/get-dive-logs?userId=${encodeURIComponent(userId)}`);
      
      if (nextjsResponse.ok) {
        const nextjsData = await nextjsResponse.json();
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Next.js dive logs loaded: ${nextjsData.logs?.length || 0} logs in ${processingTime}ms`);
        
        return res.status(200).json({
          diveLogs: (nextjsData.logs || []).slice(0, limit),
          success: true,
          source: 'nextjs-local',
          metadata: {
            count: nextjsData.logs?.length || 0,
            processingTime
          }
        });
      }
    } catch (nextjsError) {
      console.warn('⚠️ Next.js dive logs API failed:', nextjsError.message);
    }

    // ✅ OPTION 5: Empty fallback with helpful message
    const processingTime = Date.now() - startTime;
    console.log(`📝 No dive logs found for userId=${userId} after checking all sources`);
    
    return res.status(200).json({
      diveLogs: [],
      success: true,
      source: 'empty-fallback',
      message: 'No dive logs found. Start logging your dives to get personalized coaching!',
      metadata: {
        count: 0,
        processingTime,
        sourcesChecked: ['wix-master', 'wix-legacy', 'wix-query', 'nextjs-local']
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Dive logs bridge error:', error);
    
    return res.status(500).json({ 
      error: 'Could not load dive logs. Please try again.',
      diveLogs: [],
      success: false,
      metadata: {
        processingTime,
        errorType: error.name || 'UnknownError'
      }
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    responseLimit: false,
    timeout: 20000
  }
};