// 🔥 WIX-APP-FRONTEND.JS - OPTIMIZED FOR @deepfreediving/kovaldeepai-app
// Single perfect version for freediving community
// Version: 4.x - Dynamic versioning for 4.0 release compatibility
// Date: August 10, 2025

import wixUsers from 'wix-users';
import { fetch } from 'wix-fetch';

// ✅ Import backend functions directly (Wix App best practice) - with safety
let backend = null;
try {
  // Try multiple import methods for maximum compatibility
  if (typeof require !== 'undefined') {
    backend = require('backend');
    console.log('✅ Backend loaded via require()');
  }
} catch (backendError) {
  console.warn('⚠️ Backend module not available via require, using direct imports...');
  
  // Fallback: Use direct imports
  try {
    backend = {
      chat: backendChat,
      wixConnection: backendWixConnection,
      getUserProfile: backendGetUserProfile,
      diveLogs: backendDiveLogs,
      userMemory: backendUserMemory,
      test: backendTest
    };
    console.log('✅ Backend loaded via direct imports');
  } catch (importError) {
    console.warn('⚠️ All backend imports failed, using HTTP fallback only');
  }
}

// ✅ Direct backend imports - uncommented for testing
import { chat as backendChat } from 'backend/chat.jsw';
import { wixConnection as backendWixConnection } from 'backend/wixConnection.jsw';
import { getUserProfile as backendGetUserProfile } from 'backend/memberProfile.jsw';
import { diveLogs as backendDiveLogs } from 'backend/diveLogs.jsw';
import { saveUserMemory as backendUserMemory } from 'backend/userMemory.jsw';
import { test as backendTest } from 'backend/test.jsw';

// 🛡️ GLOBAL ERROR HANDLER - Wix Safe Version
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event && event.error) {
      console.error('🚨 Global error caught:', event.error);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event && event.reason) {
      console.error('🚨 Unhandled promise rejection:', event.reason);
    }
  });
}

// 🎯 MASTER CONFIGURATION - Single Perfect Version with Wix IDE Compatibility
const FRONTEND_CONFIG = {
  MODE: 'master',               // Single master mode
  
  // ✅ Prioritize reliable Next.js/OpenAI API over Wix backend
  USE_DIRECT_BACKEND: true,     // Still try direct imports, but as fallback
  
  BACKEND_ENDPOINTS: {
    // Primary endpoints (most reliable)
    nextjs: {
      chat: "https://kovaldeepai-main.vercel.app/api/openai/chat",
      pinecone: "https://kovaldeepai-main.vercel.app/api/pinecone"
    },
    // Secondary endpoints (fallback only)
    wix: {
      chat: "/_functions/chat",
      userMemory: "/_functions/userMemory", 
      diveLogs: "/_functions/diveLogs",
      userProfile: "/_functions/getUserProfile",
      testConnection: "/_functions/wixConnection"
    }
  },
  
  PERFORMANCE: {
    REQUEST_LIMITS: { read: 80, write: 20 },
    BATCH_DELAY: 100,         // ms
    CACHE_TTL: 300000,        // 5 minutes
    REQUEST_TIMEOUT: 15000,   // 15 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  },
  
  UI: {
    WIDGET_IDS: ['#koval-ai', '#KovalAIFrame', '#kovalAIFrame', '#KovalAiWidget', '#kovalAIWidget'],
    ANIMATION_DURATION: 300,
    AUTO_SCROLL: true,
    TYPING_INDICATOR: true
  }
};

// 🔥 CURRENT MODE DETECTION
const currentMode = FRONTEND_CONFIG.MODE; // Always master level

// 🔥 MASTER: REQUEST RATE LIMITER - AVOID WDE0014 ERRORS
class WixRequestLimiter {
  constructor() {
    this.requestCounts = { read: 0, write: 0 };
    this.resetTime = Date.now() + 60000; // Reset every minute
    this.maxRequests = FRONTEND_CONFIG.PERFORMANCE.REQUEST_LIMITS;
  }

  canMakeRequest(type = 'read') {
    this.checkReset();
    return this.requestCounts[type] < this.maxRequests[type];
  }

  recordRequest(type = 'read') {
    this.checkReset();
    this.requestCounts[type]++;
    console.log(`📊 Request count: ${type} ${this.requestCounts[type]}/${this.maxRequests[type]}`);
  }

  checkReset() {
    if (Date.now() > this.resetTime) {
      this.requestCounts = { read: 0, write: 0 };
      this.resetTime = Date.now() + 60000;
      console.log("🔄 Request limiter reset");
    }
  }

  waitTime(type = 'read') {
    this.checkReset();
    if (this.canMakeRequest(type)) return 0;
    return this.resetTime - Date.now();
  }
}

// 🔥 MASTER: INTELLIGENT CACHING SYSTEM
class WixDataCache {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultTTL = FRONTEND_CONFIG.PERFORMANCE.CACHE_TTL;
    this.enabled = true; // Always enabled in master mode
  }

  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + ttl);
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    if (Date.now() > this.cacheExpiry.get(key)) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      enabled: this.enabled,
      ttl: this.defaultTTL
    };
  }
}

// 🔥 MASTER: BATCH REQUEST MANAGER
class WixBatchManager {
  constructor() {
    this.pendingRequests = [];
    this.batchTimeout = null;
    this.batchDelay = FRONTEND_CONFIG.PERFORMANCE.BATCH_DELAY;
    this.enabled = true; // Always enabled in master mode
  }

  addRequest(requestData) {
    if (!this.enabled) {
      return this.makeActualRequest(requestData);
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.push({ ...requestData, resolve, reject });
      
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      
      this.batchTimeout = setTimeout(() => {
        this.processBatch();
      }, this.batchDelay);
    });
  }

  async processBatch() {
    const requests = [...this.pendingRequests];
    this.pendingRequests = [];
    this.batchTimeout = null;

    // Process requests in parallel
    const promises = requests.map(req => this.makeActualRequest(req));
    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      const request = requests[index];
      if (result.status === 'fulfilled') {
        request.resolve(result.value);
      } else {
        request.reject(result.reason);
      }
    });
  }

  async makeActualRequest(requestData) {
    // Implement actual request logic here
    return this.processRequest(requestData);
  }

  async processRequest(requestData) {
    const { url, options } = requestData;
    const response = await fetch(url, options);
    return response.json();
  }
}

// 🔥 PERFORMANCE METRICS (Always Enabled)
class PerformanceTracker {
  constructor() {
    this.metrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      totalDuration: 0,
      cacheHits: 0,
      rateLimitHits: 0,
      slowRequests: 0,
      byEndpoint: {}
    };
    this.enabled = true; // Always enabled in master mode
  }

  trackRequest(endpoint, duration, success = true, cached = false) {

    this.metrics.requests++;
    this.metrics.totalDuration += duration;

    if (success) {
      this.metrics.responses++;
    } else {
      this.metrics.errors++;
    }

    if (cached) {
      this.metrics.cacheHits++;
    }

    if (duration > 3000) {
      this.metrics.slowRequests++;
    }

    // Track by endpoint
    if (!this.metrics.byEndpoint[endpoint]) {
      this.metrics.byEndpoint[endpoint] = {
        requests: 0,
        duration: 0,
        errors: 0
      };
    }

    this.metrics.byEndpoint[endpoint].requests++;
    this.metrics.byEndpoint[endpoint].duration += duration;
    if (!success) {
      this.metrics.byEndpoint[endpoint].errors++;
    }
  }

  getStats() {
    return {
      ...this.metrics,
      averageDuration: this.metrics.requests > 0 ? this.metrics.totalDuration / this.metrics.requests : 0,
      successRate: this.metrics.requests > 0 ? (this.metrics.responses / this.metrics.requests) * 100 : 0
    };
  }

  reset() {
    this.metrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      totalDuration: 0,
      cacheHits: 0,
      rateLimitHits: 0,
      slowRequests: 0,
      byEndpoint: {}
    };
  }
}

// 🔥 INITIALIZE COMPONENTS
const requestLimiter = new WixRequestLimiter();
const dataCache = new WixDataCache();
const batchManager = new WixBatchManager();
const performanceTracker = new PerformanceTracker();

// 🔥 ENDPOINT STATUS TRACKING
const ENDPOINT_STATUS = {
  wix: {
    chat: null,
    userMemory: null,
    diveLogs: null,
    userProfile: null,
    testConnection: null
  },
  nextjs: {
    chat: null,
    pinecone: null
  },
  rateLimitHits: 0,
  timeoutCount: 0,
  lastMasterCheck: null
};

// 🔥 WIX ERROR CODES MAPPING
const WIX_ERROR_CODES = {
  'WDE0014': 'Requests per minute quota exceeded',
  'WDE0028': 'Operation time limit exceeded',
  'WDE0009': 'Single-item request payload too large (512 KB limit)',
  'WDE0109': 'Bulk operation payload too large (4 MB limit)',
  'WDE0001': 'Invalid collection ID',
  'WDE0002': 'Item not found',
  'WDE0003': 'Permission denied'
};

// 🔥 UTILITY FUNCTIONS
function logDebug(message, data = null) {
  console.log(message, data || '');
}

function logError(message, error = null) {
  console.error(message, error || '');
  if (error) {
    performanceTracker.trackRequest('error', 0, false);
  }
}

// 🔥 ENHANCED HTTP REQUEST FUNCTION WITH WIX BACKEND SUPPORT
async function makeRequest(url, options = {}, endpoint = 'unknown') {
  const startTime = Date.now();
  
  // Check cache first (master mode)
  const cacheKey = `${url}_${JSON.stringify(options)}`;
  const cached = dataCache.get(cacheKey);
  if (cached) {
    performanceTracker.trackRequest(endpoint, Date.now() - startTime, true, true);
    logDebug(`💾 Cache hit for ${endpoint}`);
    return cached;
  }

  // Check rate limits (master mode)
  const requestType = options.method === 'POST' || options.method === 'PUT' ? 'write' : 'read';
  if (!requestLimiter.canMakeRequest(requestType)) {
    const waitTime = requestLimiter.waitTime(requestType);
    logDebug(`⏱️ Rate limit hit, waiting ${waitTime}ms`);
    ENDPOINT_STATUS.rateLimitHits++;
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  requestLimiter.recordRequest(requestType);

  try {
    // Try backend for internal function calls first (if available)
    if (url.startsWith('/_functions/') && backend && typeof backend === 'object') {
      const functionName = url.replace('/_functions/', '');
      logDebug(`🔄 Trying backend for ${functionName}`);
      
      // Check if the function exists on the backend object
      if (typeof backend[functionName] === 'function') {
        try {
          let result;
          let requestData = {};
          
          // Parse request data safely
          if (options.body) {
            try {
              requestData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
            } catch (parseError) {
              requestData = options.body;
            }
          }
          
          if (options.method === 'POST' || !options.method) {
            result = await backend[functionName](requestData);
          } else if (options.method === 'GET') {
            result = await backend[functionName]();
          }
          
          const duration = Date.now() - startTime;
          performanceTracker.trackRequest(endpoint, duration, true);
          logDebug(`✅ backend request to ${endpoint} successful (${duration}ms)`);
          
          // Cache successful responses
          if (options.method === 'GET') {
            dataCache.set(cacheKey, result);
          }
          
          return result;
        } catch (backendError) {
          logDebug(`⚠️ backend function ${functionName} failed:`, backendError);
          logDebug(`⚠️ Falling back to HTTP fetch...`);
        }
      } else {
        logDebug(`⚠️ backend function ${functionName} not found, trying fetch...`);
      }
    }
    
    // Fallback to regular fetch
    // Only add custom headers for internal Wix functions, not external APIs
    const isExternalAPI = endpoint.includes('vercel.app') || endpoint.includes('openai.com') || endpoint.includes('pinecone.io');
    
    const requestOptions = {
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wix-App-ID': '@deepfreediving/kovaldeepai-app',
        'X-App-Version': '4.x',
        ...(isExternalAPI ? {} : { 'X-API-Version': currentMode }),
        ...options.headers
      },
      body: options.body || null,
      ...options
    };

    logDebug(`🚀 Making ${requestOptions.method} request to ${endpoint}`);

    const response = await fetch(url, requestOptions);
    const data = await response.json();

    const duration = Date.now() - startTime;
    
    if (response.ok) {
      // Cache successful responses (master mode)
      if (requestOptions.method === 'GET') {
        dataCache.set(cacheKey, data);
      }
      
      performanceTracker.trackRequest(endpoint, duration, true);
      logDebug(`✅ Request to ${endpoint} successful (${duration}ms)`);
      
      return data;
    } else {
      performanceTracker.trackRequest(endpoint, duration, false);
      throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    performanceTracker.trackRequest(endpoint, duration, false);
    logError(`❌ Request to ${endpoint} failed:`, error);
    
    // Handle specific Wix errors
    if (error.message.includes('WDE')) {
      const errorCode = error.message.match(/WDE\d+/)?.[0];
      if (errorCode && WIX_ERROR_CODES[errorCode]) {
        logError(`Wix Error ${errorCode}: ${WIX_ERROR_CODES[errorCode]}`);
      }
    }
    
    throw error;
  }
}

// 🔥 API FUNCTIONS WITH VERSION SUPPORT

async function sendChatMessage(message, userId, sessionId = null) {
  const requestData = {
    userMessage: message,
    userId: userId
  };
  
  if (sessionId) {
    requestData.sessionId = sessionId;
  }

  // Master mode: Add context and preferences
  requestData.context = {
    timestamp: new Date().toISOString(),
    mode: currentMode,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Wix-App'
  };

  // 🚀 PRIMARY: Use Next.js/OpenAI API (most reliable)
  try {
    logDebug('� Using primary Next.js/OpenAI API...');
    
    // ✅ Convert userMessage to message for Next.js API
    const nextjsRequestData = {
      message: requestData.userMessage,  // ✅ Convert to 'message' for Next.js API
      userId: requestData.userId,
      profile: {},
      embedMode: false
    };
    
    if (requestData.sessionId) {
      nextjsRequestData.sessionId = requestData.sessionId;
    }
    
    const result = await makeRequest(
      FRONTEND_CONFIG.BACKEND_ENDPOINTS.nextjs.chat,
      { body: JSON.stringify(nextjsRequestData), method: 'POST' },
      'nextjs-chat'
    );
    
    ENDPOINT_STATUS.nextjs.chat = 'active';
    logDebug('✅ Primary Next.js/OpenAI API successful');
    return result;
    
  } catch (primaryError) {
    logDebug('⚠️ Primary Next.js API failed, trying Wix backend...', primaryError.message);
    ENDPOINT_STATUS.nextjs.chat = 'error';
    
    // 🔄 FALLBACK: Try Wix backend (secondary)
    try {
      // Try direct backend function call first
      if (FRONTEND_CONFIG.USE_DIRECT_BACKEND && backend && typeof backend.chat === 'function') {
        logDebug('🔄 Trying direct Wix backend call...');
        const result = await backend.chat(requestData);
        ENDPOINT_STATUS.wix.chat = 'active';
        logDebug('✅ Wix direct backend call successful');
        return result;
      }
      
      // Try HTTP endpoint
      logDebug('🔄 Trying Wix HTTP endpoint...');
      const result = await makeRequest(
        FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.chat,
        { body: JSON.stringify(requestData), method: 'POST' },
        'wix-chat'
      );
      
      ENDPOINT_STATUS.wix.chat = 'active';
      logDebug('✅ Wix HTTP endpoint successful');
      return result;
      
    } catch (fallbackError) {
      ENDPOINT_STATUS.wix.chat = 'error';
      logError('❌ All chat methods failed:', fallbackError);
      throw fallbackError;
    }
  }
}

async function saveUserMemory(userId, memoryContent, memoryType = 'general', diveLogData = null) {
  const requestData = {
    userId: userId,
    memoryContent: memoryContent,
    type: memoryType
  };

  // ✅ Add dive log data if provided for storage in DiveLogs collection with compressed structure
  if (diveLogData) {
    requestData.diveLogData = diveLogData;
    requestData.sessionName = `Dive Journal - ${diveLogData.date || 'Unknown Date'}`;
  }

  // Master mode: Add metadata
  requestData.metadata = {
    source: 'wix-app-frontend',
    mode: currentMode,
    timestamp: new Date().toISOString(),
    version: '2.0'
  };

  return await makeRequest(
    FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.userMemory,
    { body: JSON.stringify(requestData), method: 'POST' },
    'user-memory'
  );
}

async function getUserProfile(userId) {
  const cacheKey = `profile_${userId}`;
  
  // Check cache first
  const cached = dataCache.get(cacheKey);
  if (cached) {
    logDebug('📋 Profile loaded from cache');
    return cached;
  }

  const result = await makeRequest(
    `${FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.userProfile}?userId=${userId}`,
    { method: 'GET' },
    'user-profile'
  );

  // Cache the result
  dataCache.set(cacheKey, result, 600000); // Cache for 10 minutes

  return result;
}

async function saveDiveLog(userId, diveData) {
  const requestData = {
    userId: userId,
    ...diveData
  };

  // Master mode: Add validation metadata
  requestData.submissionMetadata = {
    mode: currentMode,
    timestamp: new Date().toISOString(),
    validation: true
  };

  // ✅ ENHANCED: Save using compressed structure for optimal AI analysis and DiveLogs collection
  try {
    // Primary: Use new compressed structure save method (DiveLogs collection)
    const compressedResult = await saveDiveLogCompressed(userId, diveData);
    logDebug('✅ Dive log saved using compressed structure to DiveLogs collection');
    return compressedResult;
    
  } catch (compressedError) {
    logDebug('⚠️ Compressed save failed, trying legacy userMemory method...', compressedError.message);
    
    // Fallback 1: Use userMemory method (still saves to DiveLogs but with legacy format)
    try {
      const memoryResult = await saveUserMemory(
        userId, 
        `Dive Log: ${diveData.discipline || 'Unknown'} dive to ${diveData.reachedDepth || 0}m at ${diveData.location || 'Unknown location'}`,
        'dive_log',
        diveData
      );
      
      logDebug('✅ Dive log saved via userMemory method to DiveLogs collection');
      
      // Invalidate related caches
      dataCache.invalidate(`diveLogs_${userId}`);
      dataCache.invalidate(`profile_${userId}`);
      
      return memoryResult;
      
    } catch (memoryError) {
      logDebug('⚠️ UserMemory save failed, trying legacy diveLogs endpoint...', memoryError.message);
      
      // Fallback 2: Use legacy diveLogs endpoint (last resort)
      const result = await makeRequest(
        FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.diveLogs,
        { body: JSON.stringify(requestData), method: 'POST' },
        'dive-logs'
      );

      // Invalidate related caches
      dataCache.invalidate(`diveLogs_${userId}`);

      return result;
    }
  }
}

async function testConnection() {
  try {
    const result = await makeRequest(
      FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.testConnection,
      { body: JSON.stringify({ test: true }), method: 'POST' },
      'test-connection'
    );
    
    ENDPOINT_STATUS.wix.testConnection = 'active';
    return result;
    
  } catch (error) {
    ENDPOINT_STATUS.wix.testConnection = 'error';
    throw error;
  }
}

// ✅ NEW: Get user data from DiveLogs collection with compressed structure parsing
async function getUserDiveLogs(userId, limit = 50) {
  const cacheKey = `diveLogs_${userId}`;
  
  // Check cache first
  const cached = dataCache.get(cacheKey);
  if (cached) {
    logDebug('📊 Dive logs loaded from cache');
    return cached;
  }

  try {
    // ✅ Use userMemory backend GET endpoint to retrieve compressed data from DiveLogs collection
    const response = await makeRequest(
      `${FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.userMemory}?userId=${userId}&limit=${limit}&includeDetails=true&type=dive_log`,
      { method: 'GET' },
      'get-user-dive-logs'
    );

    if (response.success) {
      // ✅ Parse the response structure from userMemory.jsw GET function
      const userData = {
        userId: response.userId,
        diveLogs: response.diveLogs || [],
        totalRecords: response.diveLogsCount || 0,
        lastDiveLogDate: response.lastDiveLogDate || null,
        recentDives: response.recentDives || []
      };

      // Cache the result
      dataCache.set(cacheKey, userData, 300000); // Cache for 5 minutes
      
      logDebug(`✅ Retrieved ${userData.totalRecords} dive logs from DiveLogs collection`);
      return userData;
    } else {
      logDebug('⚠️ No dive logs found or error in response');
      return {
        userId: userId,
        diveLogs: [],
        totalRecords: 0,
        lastDiveLogDate: null,
        recentDives: []
      };
    }

  } catch (error) {
    logError('❌ Error retrieving user dive logs:', error);
    
    // Return empty structure on error
    return {
      userId: userId,
      diveLogs: [],
      totalRecords: 0,
      lastDiveLogDate: null,
      recentDives: [],
      error: error.message
    };
  }
}

// ✅ NEW: Get user memory data (chat/memories only) from DiveLogs collection
async function getUserMemories(userId, limit = 20) {
  const cacheKey = `memories_${userId}`;
  
  // Check cache first
  const cached = dataCache.get(cacheKey);
  if (cached) {
    logDebug('💭 Memories loaded from cache');
    return cached;
  }

  try {
    // ✅ Use userMemory backend GET endpoint to retrieve compressed memory data from DiveLogs collection
    const response = await makeRequest(
      `${FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.userMemory}?userId=${userId}&type=chat_memory&limit=${limit}&includeDetails=true`,
      { method: 'GET' },
      'get-user-memories'
    );

    if (response.success) {
      const memories = response.memories || [];
      
      // Cache the result
      dataCache.set(cacheKey, memories, 300000); // Cache for 5 minutes
      
      logDebug(`✅ Retrieved ${memories.length} memories from DiveLogs collection`);
      return memories;
    } else {
      logDebug('⚠️ No memories found');
      return [];
    }

  } catch (error) {
    logError('❌ Error retrieving user memories:', error);
    return [];
  }
}

// ✅ NEW: Save dive log with enhanced compressed structure to DiveLogs collection
async function saveDiveLogCompressed(userId, diveData) {
  const requestData = {
    userId: userId,
    diveLogData: diveData,
    type: 'dive_log'
  };

  // Add metadata for tracking
  requestData.metadata = {
    source: 'wix-app-frontend',
    mode: currentMode,
    timestamp: new Date().toISOString(),
    version: '2.0'
  };

  try {
    // ✅ Use userMemory backend POST endpoint for compressed structure save to DiveLogs collection
    const result = await makeRequest(
      FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.userMemory,
      { body: JSON.stringify(requestData), method: 'POST' },
      'save-dive-log-compressed'
    );

    if (result.success) {
      logDebug('✅ Dive log saved with compressed structure to DiveLogs collection:', result._id);
      logDebug('📊 Analysis data included:', !!result.compressedStructure?.hasAnalysis);
      logDebug('📸 Photo included:', !!result.hasPhoto);
      logDebug('🔍 LogEntry structure:', !!result.logEntry);
      
      // Invalidate cache to force refresh
      dataCache.invalidate(`diveLogs_${userId}`);
      
      return result;
    } else {
      throw new Error(result.error || 'Save failed');
    }

  } catch (error) {
    logError('❌ Error saving compressed dive log to DiveLogs collection:', error);
    throw error;
  }
}

// ✅ NEW: Parse compressed dive log structure for display
function parseCompressedDiveLog(diveLogItem) {
  try {
    if (!diveLogItem) return null;
    
    // If logEntry is already parsed, use it
    const logEntry = diveLogItem.logEntry || {};
    
    // Extract dive data for display
    const parsed = {
      id: diveLogItem._id,
      diveLogId: diveLogItem.diveLogId,
      userId: diveLogItem.userId,
      date: diveLogItem.diveDate,
      time: diveLogItem.diveTime,
      photo: diveLogItem.diveLogWatch,
      
      // Dive details from compressed structure
      discipline: logEntry.dive?.discipline || 'Unknown',
      location: logEntry.dive?.location || 'Unknown',
      targetDepth: logEntry.dive?.depths?.target || 0,
      reachedDepth: logEntry.dive?.depths?.reached || 0,
      mouthfillDepth: logEntry.dive?.depths?.mouthfill || 0,
      issueDepth: logEntry.dive?.depths?.issue || null,
      
      // Performance data
      exit: logEntry.dive?.performance?.exit || 'Unknown',
      duration: logEntry.dive?.performance?.duration || '0:00',
      totalTime: logEntry.dive?.performance?.totalTime || '0:00',
      attemptType: logEntry.dive?.performance?.attemptType || 'Training',
      surfaceProtocol: logEntry.dive?.performance?.surfaceProtocol || 'Standard',
      
      // Issues and notes
      squeeze: logEntry.dive?.issues?.squeeze || false,
      issueComment: logEntry.dive?.issues?.issueComment || '',
      notes: logEntry.dive?.notes || '',
      
      // Analysis data for AI and display
      progressionScore: logEntry.analysis?.progressionScore || 0,
      riskFactors: logEntry.analysis?.riskFactors || [],
      technicalNotes: logEntry.analysis?.technicalNotes || '',
      depthAchievement: logEntry.analysis?.depthAchievement || 0,
      
      // Metadata
      source: logEntry.metadata?.source || 'unknown',
      version: logEntry.metadata?.version || '1.0',
      type: logEntry.metadata?.type || 'dive_log'
    };
    
    return parsed;
    
  } catch (error) {
    logError('❌ Error parsing compressed dive log:', error);
    return null;
  }
}

// ✅ NEW: Save chat memory to DiveLogs collection with compressed structure
async function saveChatMemory(userId, messageContent, sessionContext = {}) {
  const requestData = {
    userId: userId,
    memoryContent: messageContent,
    type: 'chat_memory',
    sessionContext: sessionContext
  };

  // Add metadata for tracking
  requestData.metadata = {
    source: 'wix-app-frontend-chat',
    mode: currentMode,
    timestamp: new Date().toISOString(),
    version: '2.0'
  };

  try {
    // ✅ Use userMemory backend POST endpoint for chat memory save to DiveLogs collection
    const result = await makeRequest(
      FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.userMemory,
      { body: JSON.stringify(requestData), method: 'POST' },
      'save-chat-memory'
    );

    if (result.success) {
      logDebug('✅ Chat memory saved to DiveLogs collection:', result._id);
      
      // Invalidate memory cache to force refresh
      dataCache.invalidate(`memories_${userId}`);
      
      return result;
    } else {
      throw new Error(result.error || 'Chat memory save failed');
    }

  } catch (error) {
    logError('❌ Error saving chat memory to DiveLogs collection:', error);
    throw error;
  }
}

// ✅ NEW: Get user's latest dive statistics from DiveLogs collection
async function getUserDiveStats(userId) {
  try {
    const userData = await getUserDiveLogs(userId, 20); // Get recent dives
    
    if (!userData.diveLogs || userData.diveLogs.length === 0) {
      return {
        totalDives: 0,
        averageDepth: 0,
        maxDepth: 0,
        averageProgressionScore: 0,
        lastDiveDate: null,
        favoriteLocation: 'No dives yet'
      };
    }
    
    const diveLogs = userData.diveLogs;
    const depths = diveLogs.map(dive => {
      const parsed = parseCompressedDiveLog(dive);
      return parsed ? parsed.reachedDepth : 0;
    }).filter(depth => depth > 0);
    
    const progressionScores = diveLogs.map(dive => {
      const parsed = parseCompressedDiveLog(dive);
      return parsed ? parsed.progressionScore : 0;
    }).filter(score => score > 0);
    
    const locations = diveLogs.map(dive => {
      const parsed = parseCompressedDiveLog(dive);
      return parsed ? parsed.location : 'Unknown';
    }).filter(loc => loc !== 'Unknown');
    
    // Calculate statistics
    const totalDives = diveLogs.length;
    const averageDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;
    const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
    const averageProgressionScore = progressionScores.length > 0 ? 
      progressionScores.reduce((a, b) => a + b, 0) / progressionScores.length : 0;
    
    // Find most common location
    const locationCounts = {};
    locations.forEach(loc => {
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    const favoriteLocation = Object.keys(locationCounts).length > 0 ? 
      Object.keys(locationCounts).reduce((a, b) => locationCounts[a] > locationCounts[b] ? a : b) : 
      'No location data';
    
    return {
      totalDives,
      averageDepth: Math.round(averageDepth * 10) / 10,
      maxDepth,
      averageProgressionScore: Math.round(averageProgressionScore * 10) / 10,
      lastDiveDate: userData.lastDiveLogDate,
      favoriteLocation
    };
    
  } catch (error) {
    logError('❌ Error calculating dive stats:', error);
    return {
      totalDives: 0,
      averageDepth: 0,
      maxDepth: 0,
      averageProgressionScore: 0,
      lastDiveDate: null,
      favoriteLocation: 'Error loading stats',
      error: error.message
    };
  }
}

// 🔥 UI MANAGEMENT FUNCTIONS

function findAIWidget() {
  for (const id of FRONTEND_CONFIG.UI.WIDGET_IDS) {
    try {
      const widget = $w(id);
      if (widget) {
        logDebug(`✅ Found AI widget: ${id}`);
        return widget;
      }
    } catch (e) {
      // Widget not found, continue searching
    }
  }
  logError('❌ No AI widget found with any of the expected IDs');
  return null;
}

function showTypingIndicator(widget) {
  if (!FRONTEND_CONFIG.UI.TYPING_INDICATOR || !widget) return;
  
  try {
    if (widget.postMessage && typeof widget.postMessage === 'function') {
      widget.postMessage({ type: 'typing', show: true });
    } else if (widget.src) {
      // For iframe widgets, try to get the contentWindow
      const iframe = widget.src ? document.querySelector(`iframe[src*="${widget.src}"]`) : null;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'typing', show: true }, '*');
      }
    }
  } catch (error) {
    logDebug('Could not show typing indicator:', error);
  }
}

function hideTypingIndicator(widget) {
  if (!FRONTEND_CONFIG.UI.TYPING_INDICATOR || !widget) return;
  
  try {
    if (widget.postMessage && typeof widget.postMessage === 'function') {
      widget.postMessage({ type: 'typing', show: false });
    } else if (widget.src) {
      // For iframe widgets, try to get the contentWindow
      const iframe = widget.src ? document.querySelector(`iframe[src*="${widget.src}"]`) : null;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'typing', show: false }, '*');
      }
    }
  } catch (error) {
    logDebug('Could not hide typing indicator:', error);
  }
}

// 🔥 MAIN APPLICATION INITIALIZATION - WIX APP SAFE WITH COMPRESSED STRUCTURE SUPPORT
async function initializeKovalApp() {
  let aiWidget = null; // Declare at function scope
  
  try {
    logDebug("✅ Koval-AI Wix app initializing with compressed DiveLogs structure support...");
    logDebug(`🔧 Current mode: ${currentMode}`);

    // Check if we're in a Wix environment
    if (typeof $w === 'undefined') {
      logError("❌ $w is not available - this code must be placed in a Wix page");
      return;
    }

    // Find and initialize AI widget
    aiWidget = findAIWidget();
    
    if (!aiWidget) {
      logError("❌ Could not find AI widget");
      // Don't return here - app can still function without widget
    }

    // Test backend connection (optional - won't affect AI functionality)
    logDebug('🔧 Testing Wix backend connection (optional)...');
    testConnection()
      .then(() => {
        logDebug("✅ Wix backend connection available (bonus features enabled)");
      })
      .catch((error) => {
        logDebug("ℹ️ Wix backend unavailable (AI still works via Next.js API)", error.message);
        
        // Additional debugging info for development
        logDebug('🔍 Backend availability check:');
        logDebug(`- backend object exists: ${backend !== null}`);
        logDebug(`- backend is object: ${typeof backend === 'object'}`);
        if (backend) {
          logDebug(`- backend.wixConnection exists: ${typeof backend.wixConnection === 'function'}`);
          logDebug(`- backend.chat exists: ${typeof backend.chat === 'function'}`);
        }
        logDebug(`- USE_DIRECT_BACKEND: ${FRONTEND_CONFIG.USE_DIRECT_BACKEND}`);
      });

    // Get current user
    let currentUser = null;
    let userProfile = null;
    
    try {
      // ✅ Use wixUsers.currentUser instead of getCurrentUser() in Wix Apps
      currentUser = wixUsers.currentUser;
      if (currentUser && currentUser.loggedIn) {
        logDebug(`👤 User authenticated: ${currentUser.id}`);
        
        // Load user profile (master mode always enabled)
        try {
          userProfile = await getUserProfile(currentUser.id);
          logDebug("📋 User profile loaded:", userProfile);
          
          // ✅ FALLBACK: If backend profile is empty, use currentUser data
          if (!userProfile || !userProfile.nickname) {
            logDebug("⚠️ Backend profile empty, using currentUser data as fallback");
            userProfile = {
              nickname: currentUser.nickname || currentUser.displayName || 'User',
              displayName: currentUser.displayName || currentUser.nickname || 'User', 
              firstName: currentUser.firstName || '',
              lastName: currentUser.lastName || '',
              loginEmail: currentUser.loginEmail || '',
              profilePhoto: currentUser.picture || '',
              source: 'wix-currentUser-fallback'
            };
          }
        } catch (error) {
          logDebug("Could not load user profile:", error);
          
          // ✅ FALLBACK: Use currentUser data directly
          userProfile = {
            nickname: currentUser.nickname || currentUser.displayName || 'User',
            displayName: currentUser.displayName || currentUser.nickname || 'User',
            firstName: currentUser.firstName || '',
            lastName: currentUser.lastName || '',
            loginEmail: currentUser.loginEmail || '',
            profilePhoto: currentUser.picture || '',
            source: 'wix-currentUser-error-fallback'
          };
          logDebug("📋 Using currentUser fallback profile:", userProfile);
        }
      } else {
        logDebug("👤 No authenticated user or user not logged in");
      }
    } catch (error) {
      logError("Error getting current user:", error);
    }

    // Set up message handling only if widget exists
    if (aiWidget && aiWidget.onMessage) {
      aiWidget.onMessage(async (event) => {
        try {
          // ✅ Comprehensive null checking to prevent any errors
          if (!event || !event.data || typeof event.data !== 'object' || !event.data.hasOwnProperty('type')) {
            console.warn('⚠️ Invalid message received');
            return;
          }
          
          const { type, data } = event.data;
          
          // ✅ Additional safety check for type
          if (!type || typeof type !== 'string') {
            console.warn('⚠️ Invalid type in message:', type);
            return;
          }
          
          switch (type) {
            case 'chat':
              if (currentUser && data && data.message) {
                showTypingIndicator(aiWidget);
                
                try {
                  const response = await sendChatMessage(
                    data.message,
                    currentUser.id,
                    data.sessionId
                  );
                  
                  hideTypingIndicator(aiWidget);
                  
                  // ✅ ENHANCED: Save chat interaction to DiveLogs collection for memory
                  if (response && response.aiResponse) {
                    try {
                      await saveChatMemory(currentUser.id, {
                        userMessage: data.message,
                        aiResponse: response.aiResponse,
                        sessionId: data.sessionId
                      });
                    } catch (memoryError) {
                      logDebug('Could not save chat memory:', memoryError);
                    }
                  }
                  
                  if (aiWidget && aiWidget.postMessage) {
                    aiWidget.postMessage({
                      type: 'chatResponse',
                      data: response
                    });
                  }
                  
                } catch (error) {
                  hideTypingIndicator(aiWidget);
                  logError('Chat error:', error);
                  
                  if (aiWidget && aiWidget.postMessage) {
                    aiWidget.postMessage({
                      type: 'error',
                      data: { message: 'Failed to send message' }
                    });
                  }
                }
              } else {
                if (aiWidget && aiWidget.postMessage) {
                  aiWidget.postMessage({
                    type: 'error',
                    data: { message: 'Please log in to chat' }
                  });
                }
              }
              break;
              
            case 'saveMemory':
              if (currentUser && data && data.content) {
                try {
                  // ✅ Use new compressed structure for memory saving
                  await saveChatMemory(currentUser.id, data.content, data.context || {});
                  
                  if (aiWidget && aiWidget.postMessage) {
                    aiWidget.postMessage({
                      type: 'memorySaved',
                      data: { success: true }
                    });
                  }
                  
                } catch (error) {
                  logError('Memory save error:', error);
                  if (aiWidget && aiWidget.postMessage) {
                    aiWidget.postMessage({
                      type: 'error',
                      data: { message: 'Failed to save memory' }
                    });
                  }
                }
              }
              break;
              
            case 'saveDiveLog':
              if (currentUser && data) {
                try {
                  // ✅ Use compressed structure for dive log saving
                  await saveDiveLogCompressed(currentUser.id, data);
                  
                  if (aiWidget && aiWidget.postMessage) {
                    aiWidget.postMessage({
                      type: 'diveLogSaved',
                      data: { success: true }
                    });
                  }
                  
                } catch (error) {
                  logError('Dive log save error:', error);
                  if (aiWidget && aiWidget.postMessage) {
                    aiWidget.postMessage({
                      type: 'error',
                      data: { message: 'Failed to save dive log' }
                    });
                  }
                }
              }
              break;
              
            case 'getDiveLogs':
              if (currentUser) {
                try {
                  const userData = await getUserDiveLogs(currentUser.id, data?.limit || 50);
                  
                  if (aiWidget && aiWidget.postMessage) {
                    aiWidget.postMessage({
                      type: 'diveLogsData',
                      data: userData
                    });
                  }
                  
                } catch (error) {
                  logError('Get dive logs error:', error);
                  if (aiWidget && aiWidget.postMessage) {
                    aiWidget.postMessage({
                      type: 'error',
                      data: { message: 'Failed to load dive logs' }
                    });
                  }
                }
              }
              break;
              
            case 'getDiveStats':
              if (currentUser) {
                try {
                  const stats = await getUserDiveStats(currentUser.id);
                  
                  if (aiWidget && aiWidget.postMessage) {
                    aiWidget.postMessage({
                      type: 'diveStatsData',
                      data: stats
                    });
                  }
                  
                } catch (error) {
                  logError('Get dive stats error:', error);
                  if (aiWidget && aiWidget.postMessage) {
                    aiWidget.postMessage({
                      type: 'error',
                      data: { message: 'Failed to load dive statistics' }
                    });
                  }
                }
              }
              break;
              
            case 'getMemories':
              if (currentUser) {
                try {
                  const memories = await getUserMemories(currentUser.id, data?.limit || 20);
                  
                  if (aiWidget && aiWidget.postMessage) {
                    aiWidget.postMessage({
                      type: 'memoriesData',
                      data: memories
                    });
                  }
                  
                } catch (error) {
                  logError('Get memories error:', error);
                  if (aiWidget && aiWidget.postMessage) {
                    aiWidget.postMessage({
                      type: 'error',
                      data: { message: 'Failed to load memories' }
                    });
                  }
                }
              }
              break;
              
            case 'getMetrics':
              if (aiWidget && aiWidget.postMessage) {
                aiWidget.postMessage({
                  type: 'metrics',
                  data: {
                    performance: performanceTracker.getStats(),
                    cache: dataCache.getStats(),
                    endpoints: ENDPOINT_STATUS,
                    mode: currentMode
                  }
                });
              }
              break;
              
            case 'setMode':
              // Master mode doesn't support mode switching
              if (aiWidget && aiWidget.postMessage) {
                aiWidget.postMessage({
                  type: 'error',
                  data: { message: 'Master version operates in single perfect mode' }
                });
              }
              break;
          }
        } catch (error) {
          logError('Message handling error:', error);
          if (aiWidget && aiWidget.postMessage) {
            aiWidget.postMessage({
              type: 'error',
              data: { message: 'Internal error' }
            });
          }
        }
      });
    }

    // Send initial status to widget
    if (aiWidget && aiWidget.postMessage) {
      try {
        aiWidget.postMessage({
          type: 'initialized',
          data: {
            mode: currentMode,
            user: currentUser ? {
              id: currentUser.id,
              profile: userProfile
            } : null,
            endpoints: ENDPOINT_STATUS,
            features: {
              compressedStructure: true,
              diveLogsCollection: true,
              photoSupport: true,
              aiAnalysis: true
            }
          }
        });
      } catch (error) {
        logError("Error sending initial status to widget:", error);
      }
    }

    logDebug("🚀 Koval-AI app fully initialized with compressed DiveLogs structure support");
    
  } catch (error) {
    console.error("❌ Critical error during app initialization:", error);
    // Try to show error to user if possible
    try {
      if (typeof $w !== 'undefined') {
        const errorWidget = findAIWidget();
        if (errorWidget && errorWidget.postMessage) {
          errorWidget.postMessage({
            type: 'error',
            data: { message: 'App initialization failed' }
          });
        }
      }
    } catch (e) {
      console.error("❌ Could not even send error message:", e);
    }
  }
}

// 🔥 SAFE INITIALIZATION - Check if $w is available
function startKovalApp() {
  if (typeof $w !== 'undefined' && $w.onReady) {
    $w.onReady(initializeKovalApp);
  } else {
    // Fallback for environments where $w is not immediately available
    setTimeout(function() {
      if (typeof $w !== 'undefined' && $w.onReady) {
        $w.onReady(initializeKovalApp);
      } else {
        initializeKovalApp();
      }
    }, 1000);
  }
}

// Start the app safely
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startKovalApp);
  } else {
    startKovalApp();
  }
} else {
  startKovalApp();
}

// 🔥 EXPORT FUNCTIONS FOR EXTERNAL USE
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sendChatMessage,
    saveUserMemory,
    getUserProfile,
    saveDiveLog,
    saveDiveLogCompressed,
    getUserDiveLogs,
    getUserMemories,
    getUserDiveStats,
    saveChatMemory,
    parseCompressedDiveLog,
    testConnection,
    performanceTracker,
    dataCache,
    FRONTEND_CONFIG,
    ENDPOINT_STATUS
  };
}

console.log("🔥 Wix App Frontend Master initialized - Single perfect version with compressed DiveLogs structure");
console.log("✅ All data now stored in single DiveLogs page collection with compressed logEntry structure");
console.log("🚀 AI Priority: Next.js/OpenAI API is PRIMARY, Wix backend saves to DiveLogs collection");
console.log("📊 Features: Compressed structure, photo support, AI analysis, sidebar integration");
console.log("✅ Your AI will work regardless of Wix backend status!");