// Enhanced Wix User Profile Bridge API - Fixed to use Members/FullData collection
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

    // Use canonical base URL instead of req.headers.origin
    const BASE_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://kovaldeepai-main.vercel.app';

    // ✅ OPTION 1: Try Wix Members/FullData collection first (correct collection)
    try {
      const membersResponse = await fetch(`${BASE_URL}/api/wix/query-wix-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: 'Members/FullData',
          filter: { _id: { $eq: userId } },
          limit: 1
        })
      });

      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        const processingTime = Date.now() - startTime;
        
        if (membersData.items && membersData.items.length > 0) {
          const memberProfile = membersData.items[0];
          
          console.log(`✅ Members/FullData profile loaded in ${processingTime}ms`);
          
          return res.status(200).json({
            profile: {
              userId: memberProfile._id,
              displayName: memberProfile.profile?.nickname || memberProfile.profile?.firstName || 'User',
              nickname: memberProfile.profile?.nickname || memberProfile.profile?.firstName || 'User',
              firstName: memberProfile.profile?.firstName || '',
              lastName: memberProfile.profile?.lastName || '',
              loginEmail: memberProfile.loginEmail || '',
              profilePhoto: memberProfile.profile?.profilePhoto || '',
              phone: memberProfile.profile?.phone || '',
              bio: memberProfile.profile?.bio || '',
              location: memberProfile.profile?.location || '',
              loggedIn: true,
              isGuest: false,
              source: 'members-full-data'
            },
            success: true,
            source: 'members-full-data',
            metadata: {
              processingTime,
              hasStats: includeStats,
              hasPreferences: includePreferences
            }
          });
        }
      }
    } catch (membersError) {
      console.warn('⚠️ Members/FullData query failed:', membersError.message);
    }

    // ✅ OPTION 2: Try regular Members collection
    try {
      const membersResponse = await fetch(`${BASE_URL}/api/wix/query-wix-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: 'Members',
          filter: { _id: { $eq: userId } },
          limit: 1
        })
      });

      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        const processingTime = Date.now() - startTime;
        
        if (membersData.items && membersData.items.length > 0) {
          const memberProfile = membersData.items[0];
          
          console.log(`✅ Members collection profile loaded in ${processingTime}ms`);
          
          return res.status(200).json({
            profile: {
              userId: memberProfile._id,
              displayName: memberProfile.profile?.nickname || memberProfile.profile?.firstName || 'User',
              nickname: memberProfile.profile?.nickname || memberProfile.profile?.firstName || 'User',
              firstName: memberProfile.profile?.firstName || '',
              lastName: memberProfile.profile?.lastName || '',
              loginEmail: memberProfile.loginEmail || '',
              profilePhoto: memberProfile.profile?.profilePhoto || '',
              phone: memberProfile.profile?.phone || '',
              bio: memberProfile.profile?.bio || '',
              location: memberProfile.profile?.location || '',
              loggedIn: true,
              isGuest: false,
              source: 'members-collection'
            },
            success: true,
            source: 'members-collection',
            metadata: {
              processingTime
            }
          });
        }
      }
    } catch (membersError) {
      console.warn('⚠️ Members collection query failed:', membersError.message);
    }

    // ✅ OPTION 3: Try DiveLogs collection for profile data
    try {
      const queryResponse = await fetch(`${BASE_URL}/api/wix/query-wix-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: 'DiveLogs',
          filter: { 
            userId: { $eq: userId },
            dataType: { $eq: 'user_profile' }
          },
          sort: [{ fieldName: '_createdDate', order: 'desc' }],
          limit: 1
        })
      });

      if (queryResponse.ok) {
        const queryData = await queryResponse.json();
        const processingTime = Date.now() - startTime;
        
        if (queryData.items && queryData.items.length > 0) {
          const profileItem = queryData.items[0];
          try {
            // Parse the compressed logEntry structure for profile data
            const parsedLogEntry = JSON.parse(profileItem.logEntry || '{}');
            const profile = parsedLogEntry.profile || {};
            
            console.log(`✅ DiveLogs collection profile loaded in ${processingTime}ms`);
            
            return res.status(200).json({
              profile: {
                ...profile,
                userId: userId,
                loggedIn: true,
                isGuest: false,
                source: 'divelogs-profile'
              },
              success: true,
              source: 'divelogs-profile',
              metadata: { 
                processingTime,
                hasStats: includeStats,
                hasPreferences: includePreferences
              }
            });
          } catch (parseError) {
            console.warn('⚠️ Could not parse profile from DiveLogs:', parseError);
          }
        }
      }
    } catch (queryError) {
      console.warn('⚠️ DiveLogs profile query failed:', queryError.message);
    }

    // ✅ OPTION 4: Try Wix backend functions as fallback
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
        
        console.log(`✅ Wix backend profile loaded in ${processingTime}ms`);
        
        return res.status(200).json({
          profile: {
            ...wixData.profile || wixData.data || {},
            userId: userId,
            loggedIn: true,
            isGuest: false,
            source: 'wix-backend'
          },
          success: true,
          source: 'wix-backend',
          metadata: {
            processingTime,
            hasStats: includeStats,
            hasPreferences: includePreferences
          }
        });
      }
    } catch (wixMasterError) {
      console.warn('⚠️ Wix backend profile unavailable:', wixMasterError.message);
    }

    // ✅ OPTION 5: Default profile fallback
    const processingTime = Date.now() - startTime;
    console.log(`📝 Creating default profile for userId=${userId}`);
    
    const defaultProfile = {
      userId,
      displayName: 'User',
      nickname: 'User',
      firstName: '',
      lastName: '',
      loginEmail: '',
      profilePhoto: '',
      phone: '',
      bio: '',
      location: '',
      loggedIn: true,
      isGuest: false,
      level: 'beginner',
      pb: 0,
      isInstructor: false,
      createdAt: new Date().toISOString(),
      preferences: {
        units: 'metric',
        language: 'en'
      },
      source: 'default-profile'
    };
    
    return res.status(200).json({
      profile: defaultProfile,
      success: true,
      source: 'default-profile',
      message: 'Created default profile. Complete your profile for personalized coaching!',
      metadata: {
        processingTime,
        isDefault: true,
        sourcesChecked: ['members-full-data', 'members-collection', 'divelogs-profile', 'wix-backend']
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
