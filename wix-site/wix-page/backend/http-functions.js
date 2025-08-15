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

    // Validate required fields
    if (!body.userId || !body.diveLogId) {
      return badRequest({
        headers: CORS_HEADERS,
        body: { 
          error: 'Missing required fields: userId and diveLogId',
          received: Object.keys(body)
        }
      });
    }

    // Prepare dive log data for Wix collection
    const diveLogData = {
      userId: body.userId,
      diveLogId: body.diveLogId,
      logEntry: body.logEntry || JSON.stringify({}),
      diveDate: body.diveDate ? new Date(body.diveDate) : new Date(),
      diveTime: body.diveTime || new Date().toLocaleTimeString(),
      watchPhoto: body.watchPhoto || null,
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
    const userId = request.query.userId;
    
    if (!userId) {
      return badRequest({
        headers: CORS_HEADERS,
        body: { error: 'userId parameter is required' }
      });
    }

    // Query DiveLogs collection
    const results = await wixData.query(COLLECTIONS.DIVE_LOGS)
      .eq('userId', userId)
      .descending('_createdDate')
      .limit(50)
      .find();

    console.log(`📚 Retrieved ${results.items.length} dive logs for user:`, userId);

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
