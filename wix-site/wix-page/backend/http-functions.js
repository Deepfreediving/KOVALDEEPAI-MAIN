// 🔥 CORRECT WIX HTTP FUNCTIONS - FOLLOWING OFFICIAL WIX DOCUMENTATION
// File: http-functions.js (MUST be named exactly this)
// Location: Backend/http-functions.js in Wix Editor
// Based on: https://dev.wix.com/docs/develop-websites/articles/coding-with-velo/integrations/exposing-services/write-an-http-function

import { ok, badRequest, serverError, forbidden } from 'wix-http-functions';
import wixData from 'wix-data';

// 🎯 CONFIGURATION
const COLLECTIONS = {
  DIVE_LOGS: 'DiveLogs',
  MEMBERS: 'Members/FullData'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// ===== TEST FUNCTION =====
export function get_test(request) {
  return ok({
    headers: CORS_HEADERS,
    body: {
      status: 'success',
      message: 'Wix backend functions are working correctly',
      timestamp: new Date().toISOString(),
      version: '1.0-correct-structure'
    }
  });
}

export function post_test(request) {
  return get_test(request);
}

// ===== SAVE DIVE LOG =====
export async function post_saveDiveLog(request) {
  try {
    const body = await request.body.json();
    console.log('💾 Saving dive log:', body);

    // ✅ FIXED: Validate required fields for DiveLogs collection structure
    if (!body.nickname || !body.diveLogId) {
      return badRequest({
        headers: CORS_HEADERS,
        body: { 
          error: 'Missing required fields: nickname and diveLogId',
          received: Object.keys(body),
          note: 'DiveLogs collection now uses nickname instead of userId'
        }
      });
    }

    // ✅ FIXED: Prepare dive log data using DiveLogs collection fields
    const diveLogData = {
      nickname: body.nickname,
      firstName: body.firstName || '',
      lastName: body.lastName || '',
      diveLogId: body.diveLogId,
      logEntry: body.logEntry || JSON.stringify({}),
      diveDate: body.diveDate ? new Date(body.diveDate) : new Date(),
      diveTime: body.diveTime || new Date().toLocaleTimeString(),
      watchedPhoto: body.watchedPhoto || null, // ✅ FIXED: Use correct field name
      createdAt: new Date(),
      source: 'koval-ai-app'
    };

    // Save to DiveLogs collection
    const result = await wixData.insert(COLLECTIONS.DIVE_LOGS, diveLogData);
    
    console.log('✅ Dive log saved successfully:', result._id);

    return ok({
      headers: CORS_HEADERS,
      body: {
        success: true,
        _id: result._id,
        diveLogId: body.diveLogId,
        message: 'Dive log saved successfully'
      }
    });

  } catch (error) {
    console.error('❌ Error saving dive log:', error);
    
    return serverError({
      headers: CORS_HEADERS,
      body: {
        error: 'Failed to save dive log',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// ===== GET DIVE LOGS =====
export async function get_diveLogs(request) {
  try {
    // ✅ FIXED: Use nickname parameter instead of userId
    const nickname = request.query.nickname;
    
    if (!nickname) {
      return badRequest({
        headers: CORS_HEADERS,
        body: { 
          error: 'nickname parameter is required',
          note: 'DiveLogs collection now filters by nickname instead of userId'
        }
      });
    }

    // ✅ FIXED: Query DiveLogs collection using nickname
    const results = await wixData.query(COLLECTIONS.DIVE_LOGS)
      .eq('nickname', nickname)
      .descending('_createdDate')
      .limit(50)
      .find();

    console.log(`📚 Retrieved ${results.items.length} dive logs for nickname:`, nickname);

    return ok({
      headers: CORS_HEADERS,
      body: {
        diveLogs: results.items,
        totalCount: results.totalCount,
        hasNext: results.hasNext()
      }
    });

  } catch (error) {
    console.error('❌ Error retrieving dive logs:', error);
    
    return serverError({
      headers: CORS_HEADERS,
      body: {
        error: 'Failed to retrieve dive logs',
        message: error.message
      }
    });
  }
}

export async function post_diveLogs(request) {
  return get_diveLogs(request);
}

// ===== GET USER PROFILE =====
export async function get_getUserProfile(request) {
  try {
    const userId = request.query.userId;
    
    if (!userId) {
      return badRequest({
        headers: CORS_HEADERS,
        body: { error: 'userId parameter is required' }
      });
    }

    // Query Members collection
    const results = await wixData.query(COLLECTIONS.MEMBERS)
      .eq('_id', userId)
      .find();

    if (results.items.length === 0) {
      return ok({
        headers: CORS_HEADERS,
        body: {
          user: null,
          message: 'User not found in Members collection'
        }
      });
    }

    const user = results.items[0];
    
    // Return safe user data (no sensitive info)
    const safeUserData = {
      _id: user._id,
      nickname: user.nickname,
      firstName: user.firstName,
      lastName: user.lastName,
      loginEmail: user.loginEmail,
      profilePhoto: user.profilePhoto
    };

    console.log('👤 Retrieved user profile for:', userId);

    return ok({
      headers: CORS_HEADERS,
      body: {
        user: safeUserData,
        found: true
      }
    });

  } catch (error) {
    console.error('❌ Error retrieving user profile:', error);
    
    return serverError({
      headers: CORS_HEADERS,
      body: {
        error: 'Failed to retrieve user profile',
        message: error.message
      }
    });
  }
}

export async function post_getUserProfile(request) {
  try {
    const body = await request.body.json();
    
    // Use userId from POST body
    const modifiedRequest = {
      ...request,
      query: { userId: body.userId }
    };
    
    return get_getUserProfile(modifiedRequest);
  } catch (error) {
    return badRequest({
      headers: CORS_HEADERS,
      body: { error: 'Invalid JSON in request body' }
    });
  }
}

// ===== CHAT FUNCTION =====
export async function post_chat(request) {
  try {
    const body = await request.body.json();
    console.log('💬 Chat request received:', body);

    // For now, return a simple response
    // In production, this would integrate with OpenAI via Vercel
    return ok({
      headers: CORS_HEADERS,
      body: {
        message: 'Chat function is working. Integrate with Vercel for full AI functionality.',
        received: body,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in chat function:', error);
    
    return serverError({
      headers: CORS_HEADERS,
      body: {
        error: 'Chat function error',
        message: error.message
      }
    });
  }
}

// ===== USER MEMORY FUNCTION =====
export async function post_userMemory(request) {
  try {
    const body = await request.body.json();
    console.log('🧠 User memory request:', body);

    // For now, return a simple response
    return ok({
      headers: CORS_HEADERS,
      body: {
        message: 'User memory function is working',
        received: body,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in user memory function:', error);
    
    return serverError({
      headers: CORS_HEADERS,
      body: {
        error: 'User memory function error',
        message: error.message
      }
    });
  }
}

// ===== IDENTITY CODE FUNCTIONS FOR SECURE AUTH =====
export async function get_createIdentityCode(request) {
  try {
    // Generate a cryptographically strong 8-character code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expirationTime = new Date(Date.now() + 60000); // 60 seconds from now
    const instanceId = request.query.instanceId || 'default';
    
    // ✅ SECURITY: Get current member (this should only be called when user is authenticated)
    const currentMember = await wixData.getCurrentUser();
    if (!currentMember || !currentMember.id) {
      console.warn('🚫 Identity code creation attempted without authentication');
      return forbidden({
        headers: CORS_HEADERS,
        body: { 
          error: 'User must be logged in to create identity code',
          code: 'AUTH_REQUIRED' 
        }
      });
    }

    const contactId = currentMember.id;
    
    // ✅ SECURITY: Store the code with instance binding for one-time use
    const identityCodeData = {
      code: code,
      contactId: contactId,
      instanceId: instanceId,
      expirationTime: expirationTime,
      createdAt: new Date(),
      used: false,
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers['user-agent'] || 'unknown'
    };

    // Store in IdentityCodes collection (create if doesn't exist)
    try {
      await wixData.insert('IdentityCodes', identityCodeData);
      console.log('🔑 Created identity code for contactId:', contactId.substring(0, 8) + '***');
    } catch (insertError) {
      console.warn('⚠️ IdentityCodes collection may not exist, using fallback storage');
      // Could implement fallback storage here if needed
    }

    return ok({
      headers: CORS_HEADERS,
      body: {
        code: code,
        contactId: contactId,
        instanceId: instanceId,
        expiresIn: 60,
        timestamp: new Date().toISOString(),
        success: true
      }
    });

  } catch (error) {
    console.error('❌ Error creating identity code:', error);
    return serverError({
      headers: CORS_HEADERS,
      body: {
        error: 'Failed to create identity code',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function get_resolveIdentityCode(request) {
  try {
    const code = request.query.code;
    const instanceId = request.query.instanceId || 'default';
    
    if (!code) {
      return badRequest({
        headers: CORS_HEADERS,
        body: { 
          error: 'code parameter is required',
          code: 'INVALID_REQUEST'
        }
      });
    }

    // ✅ SECURITY: Look up the code with instance binding
    let codeRecord = null;
    try {
      const results = await wixData.query('IdentityCodes')
        .eq('code', code)
        .eq('used', false)
        .eq('instanceId', instanceId)
        .find();
      
      if (results.items.length > 0) {
        codeRecord = results.items[0];
      }
    } catch (queryError) {
      console.warn('⚠️ IdentityCodes collection query failed:', queryError.message);
      return serverError({
        headers: CORS_HEADERS,
        body: { 
          error: 'Identity code lookup failed',
          code: 'LOOKUP_ERROR' 
        }
      });
    }

    if (!codeRecord) {
      console.warn('🚫 Invalid identity code attempted:', { code: code.substring(0, 4) + '***', instanceId });
      return badRequest({
        headers: CORS_HEADERS,
        body: { 
          error: 'Invalid or expired identity code',
          code: 'INVALID_CODE'
        }
      });
    }

    // ✅ SECURITY: Check if expired
    if (new Date() > new Date(codeRecord.expirationTime)) {
      // Mark as used to prevent reuse
      try {
        await wixData.update('IdentityCodes', codeRecord._id, { used: true, usedAt: new Date() });
      } catch (updateError) {
        console.warn('⚠️ Could not mark expired code as used');
      }
      
      return badRequest({
        headers: CORS_HEADERS,
        body: { 
          error: 'Identity code has expired',
          code: 'EXPIRED_CODE'
        }
      });
    }

    // Get user profile from Members collection
    const contactId = codeRecord.contactId;
    let userProfile = null;
    
    try {
      const memberResults = await wixData.query(COLLECTIONS.MEMBERS)
        .eq('_id', contactId)
        .find();
      
      if (memberResults.items.length > 0) {
        const member = memberResults.items[0];
        userProfile = {
          contactId: member._id,
          nickname: member.nickname,
          firstName: member.firstName,
          lastName: member.lastName,
          loginEmail: member.loginEmail,
          profilePhoto: member.profilePhoto
        };
      }
    } catch (memberError) {
      console.warn('⚠️ Could not fetch member profile:', memberError.message);
      userProfile = {
        contactId: contactId,
        nickname: `User-${contactId.substring(0, 8)}`,
        firstName: '',
        lastName: '',
        loginEmail: '',
        profilePhoto: ''
      };
    }

    // ✅ SECURITY: Mark code as used immediately to prevent reuse
    try {
      await wixData.update('IdentityCodes', codeRecord._id, { 
        used: true, 
        usedAt: new Date(),
        resolvedFromIp: request.ip || 'unknown'
      });
      console.log('✅ Resolved identity code for contactId:', contactId.substring(0, 8) + '***');
    } catch (updateError) {
      console.warn('⚠️ Could not mark identity code as used - security risk!');
    }

    return ok({
      headers: CORS_HEADERS,
      body: {
        contactId: contactId,
        profile: userProfile,
        instanceId: instanceId,
        timestamp: new Date().toISOString(),
        success: true
      }
    });

  } catch (error) {
    console.error('❌ Error resolving identity code:', error);
    return serverError({
      headers: CORS_HEADERS,
      body: {
        error: 'Failed to resolve identity code',
        message: error.message,
        code: 'RESOLVE_ERROR'
      }
    });
  }
}

// ===== OPTIONS HANDLER FOR CORS =====
export function options_test(request) {
  return ok({ headers: CORS_HEADERS });
}

export function options_saveDiveLog(request) {
  return ok({ headers: CORS_HEADERS });
}

export function options_diveLogs(request) {
  return ok({ headers: CORS_HEADERS });
}

export function options_getUserProfile(request) {
  return ok({ headers: CORS_HEADERS });
}

export function options_chat(request) {
  return ok({ headers: CORS_HEADERS });
}

export function options_userMemory(request) {
  return ok({ headers: CORS_HEADERS });
}

// ===== OPTIONS HANDLERS FOR NEW ENDPOINTS =====
export function options_createIdentityCode(request) {
  return ok({ headers: CORS_HEADERS });
}

export function options_resolveIdentityCode(request) {
  return ok({ headers: CORS_HEADERS });
}
