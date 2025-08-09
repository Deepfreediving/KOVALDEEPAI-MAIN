// 🔥 WIX-APP-FRONTEND-MASTER.JS - ALL-IN-ONE FRONTEND SOLUTION
// Consolidates: wix-app-frontend.js + wix-app-frontend-expert.js (empty)
// Version: 4.0.0 - Master Consolidated Edition
// Date: August 8, 2025

import wixUsers from 'wix-users';

// 🎯 MASTER CONFIGURATION - ALL FRONTEND MODES
const FRONTEND_CONFIG = {
  MODES: {
    BASIC: 'basic',           // Simple chat interface
    EXPERT: 'expert',         // Advanced features + monitoring
    OPTIMIZED: 'optimized'    // Performance optimized + analytics
  },
  
  BACKEND_ENDPOINTS: {
    wix: {
      chat: "https://www.deepfreediving.com/_functions/chat",
      userMemory: "https://www.deepfreediving.com/_functions/userMemory", 
      diveLogs: "https://www.deepfreediving.com/_functions/diveLogs",
      userProfile: "https://www.deepfreediving.com/_functions/getUserProfile",
      testConnection: "https://www.deepfreediving.com/_functions/wixConnection"
    },
    nextjs: {
      chat: "https://kovaldeepai-main.vercel.app/api/openai/chat",
      pinecone: "https://kovaldeepai-main.vercel.app/api/pinecone"
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
let currentMode = FRONTEND_CONFIG.MODES.EXPERT; // Default to expert

// 🔥 WIX EXPERT: REQUEST RATE LIMITER - AVOID WDE0014 ERRORS
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
    if (currentMode !== 'basic') {
      console.log(`📊 Request count: ${type} ${this.requestCounts[type]}/${this.maxRequests[type]}`);
    }
  }

  checkReset() {
    if (Date.now() > this.resetTime) {
      this.requestCounts = { read: 0, write: 0 };
      this.resetTime = Date.now() + 60000;
      if (currentMode !== 'basic') {
        console.log("🔄 Request limiter reset");
      }
    }
  }

  waitTime(type = 'read') {
    this.checkReset();
    if (this.canMakeRequest(type)) return 0;
    return this.resetTime - Date.now();
  }
}

// 🔥 WIX EXPERT: INTELLIGENT CACHING SYSTEM
class WixDataCache {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultTTL = FRONTEND_CONFIG.PERFORMANCE.CACHE_TTL;
    this.enabled = currentMode !== 'basic';
  }

  set(key, value, ttl = this.defaultTTL) {
    if (!this.enabled) return;
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + ttl);
  }

  get(key) {
    if (!this.enabled || !this.cache.has(key)) return null;
    
    if (Date.now() > this.cacheExpiry.get(key)) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  invalidate(pattern) {
    if (!this.enabled) return;
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

// 🔥 WIX EXPERT: BATCH REQUEST MANAGER
class WixBatchManager {
  constructor() {
    this.pendingRequests = [];
    this.batchTimeout = null;
    this.batchDelay = FRONTEND_CONFIG.PERFORMANCE.BATCH_DELAY;
    this.enabled = currentMode === 'optimized';
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
    // This will be implemented in the actual request logic
    throw new Error("makeActualRequest must be implemented");
  }
}

// 🔥 PERFORMANCE METRICS (Expert/Optimized modes)
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
    this.enabled = currentMode !== 'basic';
  }

  trackRequest(endpoint, duration, success = true, cached = false) {
    if (!this.enabled) return;

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
    if (!this.enabled) return { message: 'Metrics available in expert/optimized modes only' };
    
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
  lastOptimizedCheck: null
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

// 🔥 MODE CONFIGURATION
function setMode(mode) {
  if (Object.values(FRONTEND_CONFIG.MODES).includes(mode)) {
    currentMode = mode;
    
    // Update component settings
    dataCache.enabled = mode !== 'basic';
    batchManager.enabled = mode === 'optimized';
    performanceTracker.enabled = mode !== 'basic';
    
    console.log(`🔧 Mode set to: ${mode}`);
    return true;
  }
  return false;
}

// 🔥 UTILITY FUNCTIONS
function logDebug(message, data = null) {
  if (currentMode !== 'basic') {
    console.log(message, data || '');
  }
}

function logError(message, error = null) {
  console.error(message, error || '');
  if (currentMode !== 'basic' && error) {
    performanceTracker.trackRequest('error', 0, false);
  }
}

// 🔥 ENHANCED HTTP REQUEST FUNCTION
async function makeRequest(url, options = {}, endpoint = 'unknown') {
  const startTime = Date.now();
  
  // Check cache first (expert/optimized modes)
  const cacheKey = `${url}_${JSON.stringify(options)}`;
  if (currentMode !== 'basic') {
    const cached = dataCache.get(cacheKey);
    if (cached) {
      performanceTracker.trackRequest(endpoint, Date.now() - startTime, true, true);
      logDebug(`💾 Cache hit for ${endpoint}`);
      return cached;
    }
  }

  // Check rate limits (expert/optimized modes)
  if (currentMode !== 'basic') {
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
  }

  try {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': currentMode,
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : null,
      ...options
    };

    logDebug(`🚀 Making ${requestOptions.method} request to ${endpoint}`);

    const response = await fetch(url, requestOptions);
    const data = await response.json();

    const duration = Date.now() - startTime;
    
    if (response.ok) {
      // Cache successful responses (expert/optimized modes)
      if (currentMode !== 'basic' && requestOptions.method === 'GET') {
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
    message: message,
    userId: userId
  };
  
  if (sessionId) {
    requestData.sessionId = sessionId;
  }

  // Expert/Optimized: Add context and preferences
  if (currentMode !== 'basic') {
    requestData.context = {
      timestamp: new Date().toISOString(),
      mode: currentMode,
      userAgent: navigator.userAgent
    };
  }

  try {
    // Try Wix backend first
    const result = await makeRequest(
      FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.chat,
      { body: requestData },
      'wix-chat'
    );
    
    ENDPOINT_STATUS.wix.chat = 'active';
    return result;
    
  } catch (error) {
    logError('Wix chat failed, trying Next.js fallback:', error);
    ENDPOINT_STATUS.wix.chat = 'error';
    
    // Fallback to Next.js
    try {
      const result = await makeRequest(
        FRONTEND_CONFIG.BACKEND_ENDPOINTS.nextjs.chat,
        { body: requestData },
        'nextjs-chat'
      );
      
      ENDPOINT_STATUS.nextjs.chat = 'active';
      return result;
      
    } catch (fallbackError) {
      ENDPOINT_STATUS.nextjs.chat = 'error';
      throw fallbackError;
    }
  }
}

async function saveUserMemory(userId, memoryContent, memoryType = 'general') {
  const requestData = {
    userId: userId,
    memoryContent: memoryContent,
    type: memoryType
  };

  // Expert/Optimized: Add metadata
  if (currentMode !== 'basic') {
    requestData.metadata = {
      source: 'wix-app',
      mode: currentMode,
      timestamp: new Date().toISOString()
    };
  }

  return await makeRequest(
    FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.userMemory,
    { body: requestData },
    'user-memory'
  );
}

async function getUserProfile(userId) {
  const cacheKey = `profile_${userId}`;
  
  // Check cache first
  if (currentMode !== 'basic') {
    const cached = dataCache.get(cacheKey);
    if (cached) {
      logDebug('📋 Profile loaded from cache');
      return cached;
    }
  }

  const result = await makeRequest(
    `${FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.userProfile}?userId=${userId}`,
    { method: 'GET' },
    'user-profile'
  );

  // Cache the result
  if (currentMode !== 'basic') {
    dataCache.set(cacheKey, result, 600000); // Cache for 10 minutes
  }

  return result;
}

async function saveDiveLog(userId, diveData) {
  const requestData = {
    userId: userId,
    ...diveData
  };

  // Expert/Optimized: Add validation metadata
  if (currentMode !== 'basic') {
    requestData.submissionMetadata = {
      mode: currentMode,
      timestamp: new Date().toISOString(),
      validation: true
    };
  }

  const result = await makeRequest(
    FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.diveLogs,
    { body: requestData },
    'dive-logs'
  );

  // Invalidate related caches
  if (currentMode !== 'basic') {
    dataCache.invalidate(`diveLogs_${userId}`);
  }

  return result;
}

async function testConnection() {
  try {
    const result = await makeRequest(
      FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.testConnection,
      { body: { test: true } },
      'test-connection'
    );
    
    ENDPOINT_STATUS.wix.testConnection = 'active';
    return result;
    
  } catch (error) {
    ENDPOINT_STATUS.wix.testConnection = 'error';
    throw error;
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
  if (currentMode === 'basic' || !FRONTEND_CONFIG.UI.TYPING_INDICATOR) return;
  
  try {
    // Add typing indicator to the widget
    if (widget && widget.postMessage) {
      widget.postMessage({ type: 'typing', show: true });
    }
  } catch (error) {
    logDebug('Could not show typing indicator:', error);
  }
}

function hideTypingIndicator(widget) {
  if (currentMode === 'basic' || !FRONTEND_CONFIG.UI.TYPING_INDICATOR) return;
  
  try {
    if (widget && widget.postMessage) {
      widget.postMessage({ type: 'typing', show: false });
    }
  } catch (error) {
    logDebug('Could not hide typing indicator:', error);
  }
}

// 🔥 MAIN APPLICATION INITIALIZATION
$w.onReady(async function () {
  logDebug("✅ Koval-AI Wix app initializing...");
  logDebug(`🔧 Current mode: ${currentMode}`);

  // Find and initialize AI widget
  const aiWidget = findAIWidget();
  
  if (!aiWidget) {
    logError("❌ Could not find AI widget");
    return;
  }

  // Test initial connection (expert/optimized modes)
  if (currentMode !== 'basic') {
    try {
      await testConnection();
      logDebug("✅ Backend connection established");
    } catch (error) {
      logError("⚠️ Backend connection test failed:", error);
    }
  }

  // Get current user
  let currentUser = null;
  try {
    currentUser = await wixUsers.getCurrentUser();
    if (currentUser) {
      logDebug(`👤 User authenticated: ${currentUser.id}`);
      
      // Load user profile (expert/optimized modes)
      if (currentMode !== 'basic') {
        try {
          const profile = await getUserProfile(currentUser.id);
          logDebug("📋 User profile loaded");
        } catch (error) {
          logDebug("Could not load user profile:", error);
        }
      }
    } else {
      logDebug("👤 No authenticated user");
    }
  } catch (error) {
    logError("Error getting current user:", error);
  }

  // Set up message handling
  if (aiWidget.onMessage) {
    aiWidget.onMessage(async (event) => {
      try {
        const { type, data } = event.data;
        
        switch (type) {
          case 'chat':
            if (currentUser) {
              showTypingIndicator(aiWidget);
              
              try {
                const response = await sendChatMessage(
                  data.message,
                  currentUser.id,
                  data.sessionId
                );
                
                hideTypingIndicator(aiWidget);
                
                aiWidget.postMessage({
                  type: 'chatResponse',
                  data: response
                });
                
              } catch (error) {
                hideTypingIndicator(aiWidget);
                logError('Chat error:', error);
                
                aiWidget.postMessage({
                  type: 'error',
                  data: { message: 'Failed to send message' }
                });
              }
            } else {
              aiWidget.postMessage({
                type: 'error',
                data: { message: 'Please log in to chat' }
              });
            }
            break;
            
          case 'saveMemory':
            if (currentUser) {
              try {
                await saveUserMemory(
                  currentUser.id,
                  data.content,
                  data.type
                );
                
                aiWidget.postMessage({
                  type: 'memorySaved',
                  data: { success: true }
                });
                
              } catch (error) {
                logError('Memory save error:', error);
                aiWidget.postMessage({
                  type: 'error',
                  data: { message: 'Failed to save memory' }
                });
              }
            }
            break;
            
          case 'saveDiveLog':
            if (currentUser) {
              try {
                await saveDiveLog(currentUser.id, data);
                
                aiWidget.postMessage({
                  type: 'diveLogSaved',
                  data: { success: true }
                });
                
              } catch (error) {
                logError('Dive log save error:', error);
                aiWidget.postMessage({
                  type: 'error',
                  data: { message: 'Failed to save dive log' }
                });
              }
            }
            break;
            
          case 'getMetrics':
            if (currentMode !== 'basic') {
              aiWidget.postMessage({
                type: 'metrics',
                data: {
                  performance: performanceTracker.getStats(),
                  cache: dataCache.getStats(),
                  endpoints: ENDPOINT_STATUS,
                  mode: currentMode
                }
              });
            } else {
              aiWidget.postMessage({
                type: 'error',
                data: { message: 'Metrics available in expert/optimized modes only' }
              });
            }
            break;
            
          case 'setMode':
            if (setMode(data.mode)) {
              aiWidget.postMessage({
                type: 'modeChanged',
                data: { mode: currentMode }
              });
            } else {
              aiWidget.postMessage({
                type: 'error',
                data: { message: 'Invalid mode' }
              });
            }
            break;
        }
      } catch (error) {
        logError('Message handling error:', error);
        aiWidget.postMessage({
          type: 'error',
          data: { message: 'Internal error' }
        });
      }
    });
  }

  // Send initial status to widget
  aiWidget.postMessage({
    type: 'initialized',
    data: {
      mode: currentMode,
      user: currentUser ? { id: currentUser.id } : null,
      endpoints: ENDPOINT_STATUS
    }
  });

  logDebug("🚀 Koval-AI app fully initialized");
});

// 🔥 EXPORT FUNCTIONS FOR EXTERNAL USE
export {
  setMode,
  sendChatMessage,
  saveUserMemory,
  getUserProfile,
  saveDiveLog,
  testConnection,
  performanceTracker,
  dataCache,
  FRONTEND_CONFIG,
  ENDPOINT_STATUS
};

console.log("🔥 Wix App Frontend Master initialized - All modes supported");
