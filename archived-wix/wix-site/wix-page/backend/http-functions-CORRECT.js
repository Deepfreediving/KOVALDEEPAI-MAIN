// 🔥 CORRECT WIX HTTP FUNCTIONS - Based on Official Documentation
// File: backend/http-functions.js
// All HTTP functions must be in this single file per Wix requirements

import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';

// ===== CONFIGURATION =====
const COLLECTIONS = {
  DIVE_LOGS: 'DiveLogs',
  MEMBERS: 'Members/FullData'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// ===== UTILITY FUNCTIONS =====
function validateDiveLogData(data) {
  if (!data.userId) {
    throw new Error('userId is required');
  }
  if (!data.diveLogId) {
    throw new Error('diveLogId is required');
  }
  return true;
}

function createSuccessResponse(data) {
  return ok({
    headers: CORS_HEADERS,
    body: {
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    }
  });
}

function createErrorResponse(error) {
  return serverError({
    headers: CORS_HEADERS,
    body: {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  });
}

// ===== TEST FUNCTION =====
export function get_test(request) {
  console.log('🧪 Test function called via GET');
  return createSuccessResponse({
    message: 'Wix backend test successful',
    method: 'GET'
  });
}

export function post_test(request) {
  console.log('🧪 Test function called via POST');
  return createSuccessResponse({
    message: 'Wix backend test successful',
    method: 'POST'
  });
}

// ===== DIVE LOG FUNCTIONS =====
export async function post_saveDiveLog(request) {
  try {
    console.log('💾 saveDiveLog function called');
    
    const data = await request.body.json();
    console.log('📝 Received data:', data);
    
    // Validate input
    validateDiveLogData(data);
    
    // Prepare dive log for Wix collection
    const diveLogToSave = {
      userId: data.userId,
      diveLogId: data.diveLogId,
      logEntry: data.logEntry || JSON.stringify({}),
      diveDate: data.diveDate ? new Date(data.diveDate) : new Date(),
      diveTime: data.diveTime || new Date().toLocaleTimeString(),
      watchedPhoto: data.watchedPhoto || null
    };
    
    console.log('🏊 Saving to DiveLogs collection:', diveLogToSave);
    
    // Save to Wix collection
    const result = await wixData.insert(COLLECTIONS.DIVE_LOGS, diveLogToSave);
    
    console.log('✅ Dive log saved successfully:', result._id);
    
    return createSuccessResponse({
      wixId: result._id,
      diveLogId: result.diveLogId,
      message: 'Dive log saved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error saving dive log:', error);
    return createErrorResponse(error);
  }
}

export async function get_diveLogs(request) {
  try {
    console.log('📚 getDiveLogs function called');
    
    const userId = request.query.userId;
    if (!userId) {
      throw new Error('userId parameter is required');
    }
    
    console.log('🔍 Fetching dive logs for user:', userId);
    
    // Query dive logs from Wix collection
    const results = await wixData.query(COLLECTIONS.DIVE_LOGS)
      .eq('userId', userId)
      .descending('diveDate')
      .limit(50)
      .find();
    
    console.log('📄 Found dive logs:', results.items.length);
    
    return createSuccessResponse({
      diveLogs: results.items,
      totalCount: results.totalCount,
      userId: userId
    });
    
  } catch (error) {
    console.error('❌ Error fetching dive logs:', error);
    return createErrorResponse(error);
  }
}

export async function post_diveLogs(request) {
  return get_diveLogs(request);
}

// ===== USER PROFILE FUNCTIONS =====
export async function get_getUserProfile(request) {
  try {
    console.log('👤 getUserProfile function called');
    
    const userId = request.query.userId;
    if (!userId) {
      throw new Error('userId parameter is required');
    }
    
    console.log('🔍 Fetching user profile for:', userId);
    
    // Query user from Members collection
    const results = await wixData.query(COLLECTIONS.MEMBERS)
      .eq('_id', userId)
      .find();
    
    if (results.items.length === 0) {
      throw new Error('User not found');
    }
    
    const user = results.items[0];
    console.log('👤 Found user profile');
    
    return createSuccessResponse({
      userId: user._id,
      email: user.loginEmail,
      nickname: user.nickname,
      firstName: user.firstName,
      lastName: user.lastName
    });
    
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    return createErrorResponse(error);
  }
}

export async function post_getUserProfile(request) {
  try {
    const data = await request.body.json();
    request.query = { userId: data.userId };
    return get_getUserProfile(request);
  } catch (error) {
    return createErrorResponse(error);
  }
}

// ===== CHAT FUNCTION =====
export async function post_chat(request) {
  try {
    console.log('💬 Chat function called');
    
    const data = await request.body.json();
    console.log('📝 Chat data received:', data);
    
    // For now, return a simple response
    // In the future, this could integrate with OpenAI or other chat services
    return createSuccessResponse({
      message: 'Chat message received',
      userMessage: data.message,
      response: 'This is a test response from Wix backend'
    });
    
  } catch (error) {
    console.error('❌ Error in chat function:', error);
    return createErrorResponse(error);
  }
}

// ===== USER MEMORY FUNCTION =====
export async function post_userMemory(request) {
  try {
    console.log('🧠 User memory function called');
    
    const data = await request.body.json();
    console.log('📝 Memory data received:', data);
    
    // For now, return a simple response
    // In the future, this could store/retrieve user memory data
    return createSuccessResponse({
      message: 'User memory processed',
      userId: data.userId,
      action: data.action || 'unknown'
    });
    
  } catch (error) {
    console.error('❌ Error in user memory function:', error);
    return createErrorResponse(error);
  }
}

// ===== OPTIONS HANDLER FOR CORS =====
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

export function options_test(request) {
  return ok({ headers: CORS_HEADERS });
}

console.log('🔥 Wix HTTP Functions initialized successfully');
