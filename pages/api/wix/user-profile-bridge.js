// Enhanced Wix User Profile Bridge API - Integrates with consolidated master files
// pages/api/wix/user-profile-bridge.js

import handleCors from '@/utils/handleCors';

export default async function handler(req, res) {
  // Handle CORS
  if (handleCors(req, res)) return;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { userId, includeStats = false, includePreferences = false } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'userId required',
        profile: null,
        success: false 
      });
    }

    console.log(`👤 Loading user profile for userId=${userId}`);

    // ✅ OPTION 1: Try consolidated Wix user profile endpoint (original name)
    try {
      const wixMasterResponse = await fetch('https://www.deepfreediving.com/_functions/http-getUserProfile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Source': 'nextjs-bridge',
          'X-User-Agent': 'KovalDeepAI-Widget'
        },
        body: JSON.stringify({
          action: 'getUserProfile',
          userId,
          includeStats,
          includePreferences,
          version: 'v4.0'
        })
      });

      if (wixMasterResponse.ok) {
        const wixData = await wixMasterResponse.json();
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Wix master user profile loaded in ${processingTime}ms`);
        
        return res.status(200).json({
          profile: wixData.profile || wixData.data || {},
          success: true,
          source: 'wix-master-backend',
          metadata: {
            processingTime,
            hasStats: includeStats,
            hasPreferences: includePreferences
          }
        });
      } else {
        console.warn(`⚠️ Wix master user profile endpoint returned ${wixMasterResponse.status}`);
      }
    } catch (wixMasterError) {
      console.warn('⚠️ Wix master user profile unavailable:', wixMasterError.message);
    }

    // ✅ OPTION 2: Try legacy Wix user profile endpoint
    try {
      const wixLegacyResponse = await fetch(`https://www.deepfreediving.com/_functions/getUserProfile?userId=${encodeURIComponent(userId)}`);
      
      if (wixLegacyResponse.ok) {
        const wixData = await wixLegacyResponse.json();
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Wix legacy user profile loaded in ${processingTime}ms`);
        
        return res.status(200).json({
          profile: wixData.profile || wixData.data || {},
          success: true,
          source: 'wix-legacy-backend',
          metadata: { processingTime }
        });
      }
    } catch (wixLegacyError) {
      console.warn('⚠️ Wix legacy user profile failed:', wixLegacyError.message);
    }

    // ✅ OPTION 3: Try Wix data query API (for member profiles)
    try {
      const queryResponse = await fetch(`${req.headers.origin}/api/wix/query-wix-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: 'memberProfiles',
          filter: { userId: { $eq: userId } },
          limit: 1
        })
      });

      if (queryResponse.ok) {
        const queryData = await queryResponse.json();
        const processingTime = Date.now() - startTime;
        
        const profile = queryData.items?.[0]?.data || {};
        
        console.log(`✅ Wix query API user profile loaded in ${processingTime}ms`);
        
        return res.status(200).json({
          profile,
          success: true,
          source: 'wix-query-api',
          metadata: { processingTime }
        });
      }
    } catch (queryError) {
      console.warn('⚠️ Wix query API failed:', queryError.message);
    }

    // ✅ OPTION 4: Try user memory for profile data
    try {
      const memoryResponse = await fetch(`${req.headers.origin}/api/wix/query-wix-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: 'userMemory',
          filter: { userId: { $eq: userId } },
          limit: 1
        })
      });

      if (memoryResponse.ok) {
        const memoryData = await memoryResponse.json();
        const processingTime = Date.now() - startTime;
        
        const profile = memoryData.items?.[0]?.data?.profile || {};
        
        console.log(`✅ User memory profile loaded in ${processingTime}ms`);
        
        return res.status(200).json({
          profile,
          success: true,
          source: 'user-memory',
          metadata: { processingTime }
        });
      }
    } catch (memoryError) {
      console.warn('⚠️ User memory API failed:', memoryError.message);
    }

    // ✅ OPTION 5: Default profile fallback
    const processingTime = Date.now() - startTime;
    console.log(`📝 Creating default profile for userId=${userId}`);
    
    const defaultProfile = {
      userId,
      level: 'beginner',
      pb: 0,
      isInstructor: false,
      createdAt: new Date().toISOString(),
      preferences: {
        units: 'metric',
        language: 'en'
      }
    };
    
    return res.status(200).json({
      profile: defaultProfile,
      success: true,
      source: 'default-profile',
      message: 'Created default profile. Complete your profile for personalized coaching!',
      metadata: {
        processingTime,
        isDefault: true,
        sourcesChecked: ['wix-master', 'wix-legacy', 'wix-query', 'user-memory']
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ User profile bridge error:', error);
    
    return res.status(500).json({ 
      error: 'Could not load user profile. Please try again.',
      profile: null,
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
    timeout: 15000
  }
};
