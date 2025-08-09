// 🔥 WIX-APP-FRONTEND.JS - WIX IDE COMPATIBLE VERSION
// Single perfect version for freediving community - Wix Code IDE Optimized
// Version: 4.1.0 - Wix IDE Compatibility Edition
// Date: August 9, 2025

import wixUsers from 'wix-users';
import { fetch } from 'wix-fetch';
// Backend imports for direct function calls (try-catch wrapped)
let backend = null;
try {
  backend = require('backend');
} catch (backendError) {
  console.warn('⚠️ Backend module not available, using fetch fallback');
}

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

// 🎯 MASTER CONFIGURATION - Wix Compatible
const FRONTEND_CONFIG = {
  MODE: 'master',
  
  BACKEND_ENDPOINTS: {
    wix: {
      chat: "/_functions/chat",
      userMemory: "/_functions/userMemory", 
      diveLogs: "/_functions/diveLogs",
      userProfile: "/_functions/getUserProfile",
      testConnection: "/_functions/wixConnection"
    },
    nextjs: {
      chat: "https://kovaldeepai-main.vercel.app/api/openai/chat",
      pinecone: "https://kovaldeepai-main.vercel.app/api/pinecone"
    }
  },
  
  PERFORMANCE: {
    REQUEST_LIMITS: { read: 80, write: 20 },
    BATCH_DELAY: 100,
    CACHE_TTL: 300000,
    REQUEST_TIMEOUT: 15000,
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

const currentMode = FRONTEND_CONFIG.MODE;

// 🔥 SIMPLE REQUEST RATE LIMITER
const requestLimiter = {
  requestCounts: { read: 0, write: 0 },
  resetTime: Date.now() + 60000,
  maxRequests: FRONTEND_CONFIG.PERFORMANCE.REQUEST_LIMITS,

  canMakeRequest(type) {
    this.checkReset();
    return this.requestCounts[type] < this.maxRequests[type];
  },

  recordRequest(type) {
    this.checkReset();
    this.requestCounts[type]++;
    console.log(`📊 Request count: ${type} ${this.requestCounts[type]}/${this.maxRequests[type]}`);
  },

  checkReset() {
    if (Date.now() > this.resetTime) {
      this.requestCounts = { read: 0, write: 0 };
      this.resetTime = Date.now() + 60000;
      console.log("🔄 Request limiter reset");
    }
  },

  waitTime(type) {
    this.checkReset();
    if (this.canMakeRequest(type)) return 0;
    return this.resetTime - Date.now();
  }
};

// 🔥 SIMPLE CACHE SYSTEM
const dataCache = {
  cache: new Map(),
  cacheExpiry: new Map(),
  defaultTTL: FRONTEND_CONFIG.PERFORMANCE.CACHE_TTL,

  set(key, value, ttl) {
    const cacheTTL = ttl || this.defaultTTL;
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + cacheTTL);
  },

  get(key) {
    if (!this.cache.has(key)) return null;
    
    if (Date.now() > this.cacheExpiry.get(key)) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  },

  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  },

  clear() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
};

// 🔥 PERFORMANCE TRACKER
const performanceTracker = {
  metrics: {
    requests: 0,
    responses: 0,
    errors: 0,
    totalDuration: 0,
    cacheHits: 0,
    rateLimitHits: 0,
    slowRequests: 0
  },

  trackRequest(endpoint, duration, success, cached) {
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
  },

  getStats() {
    return {
      ...this.metrics,
      averageDuration: this.metrics.requests > 0 ? this.metrics.totalDuration / this.metrics.requests : 0,
      successRate: this.metrics.requests > 0 ? (this.metrics.responses / this.metrics.requests) * 100 : 0
    };
  }
};

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

// 🔥 UTILITY FUNCTIONS
function logDebug(message, data) {
  console.log(message, data || '');
}

function logError(message, error) {
  console.error(message, error || '');
  if (error) {
    performanceTracker.trackRequest('error', 0, false);
  }
}

// 🔥 ENHANCED HTTP REQUEST FUNCTION
async function makeRequest(url, options, endpoint) {
  const startTime = Date.now();
  
  // Check cache first
  const cacheKey = `${url}_${JSON.stringify(options)}`;
  const cached = dataCache.get(cacheKey);
  if (cached) {
    performanceTracker.trackRequest(endpoint, Date.now() - startTime, true, true);
    logDebug(`💾 Cache hit for ${endpoint}`);
    return cached;
  }

  // Check rate limits
  const requestType = (options.method === 'POST' || options.method === 'PUT') ? 'write' : 'read';
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
    if (url.startsWith('/_functions/') && backend) {
      const functionName = url.replace('/_functions/', '');
      logDebug(`🔄 Trying backend for ${functionName}`);
      
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
        logDebug(`⚠️ backend failed for ${functionName}, trying fetch...`);
      }
    }
    
    // Fallback to regular fetch
    // Only add custom headers for internal Wix functions, not external APIs
    const isExternalAPI = endpoint.includes('vercel.app') || endpoint.includes('openai.com') || endpoint.includes('pinecone.io');
    
    const requestOptions = {
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      // Cache successful responses
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
    throw error;
  }
}

// 🔥 API FUNCTIONS

async function sendChatMessage(message, userId, sessionId) {
  const requestData = {
    userMessage: message,
    userId: userId
  };
  
  if (sessionId) {
    requestData.sessionId = sessionId;
  }

  requestData.context = {
    timestamp: new Date().toISOString(),
    mode: currentMode,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Wix-App'
  };

  try {
    const result = await makeRequest(
      FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.chat,
      { body: JSON.stringify(requestData), method: 'POST' },
      'wix-chat'
    );
    
    ENDPOINT_STATUS.wix.chat = 'active';
    return result;
    
  } catch (error) {
    logError('Wix chat failed, trying Next.js fallback:', error);
    ENDPOINT_STATUS.wix.chat = 'error';
    
    try {
      const result = await makeRequest(
        FRONTEND_CONFIG.BACKEND_ENDPOINTS.nextjs.chat,
        { body: JSON.stringify(requestData), method: 'POST' },
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

async function saveUserMemory(userId, memoryContent, memoryType) {
  const requestData = {
    userId: userId,
    memoryContent: memoryContent,
    type: memoryType || 'general'
  };

  requestData.metadata = {
    source: 'wix-app',
    mode: currentMode,
    timestamp: new Date().toISOString()
  };

  return await makeRequest(
    FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.userMemory,
    { body: JSON.stringify(requestData), method: 'POST' },
    'user-memory'
  );
}

async function getUserProfile(userId) {
  const cacheKey = `profile_${userId}`;
  
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

  dataCache.set(cacheKey, result, 600000);
  return result;
}

async function saveDiveLog(userId, diveData) {
  const requestData = {
    userId: userId,
    ...diveData
  };

  requestData.submissionMetadata = {
    mode: currentMode,
    timestamp: new Date().toISOString(),
    validation: true
  };

  const result = await makeRequest(
    FRONTEND_CONFIG.BACKEND_ENDPOINTS.wix.diveLogs,
    { body: JSON.stringify(requestData), method: 'POST' },
    'dive-logs'
  );

  dataCache.invalidate(`diveLogs_${userId}`);
  return result;
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

// 🔥 UI MANAGEMENT FUNCTIONS - WIX APP COMPATIBLE

function findAIWidget() {
  // In Wix Apps, we need to check if $w is available first
  if (typeof $w === 'undefined') {
    logError('❌ $w is not available - make sure this code is in a Wix page');
    return null;
  }

  for (const id of FRONTEND_CONFIG.UI.WIDGET_IDS) {
    try {
      const widget = $w(id);
      if (widget) {
        logDebug(`✅ Found AI widget: ${id}`);
        return widget;
      }
    } catch (e) {
      // Widget not found, continue searching
      logDebug(`⚠️ Widget ${id} not found`);
    }
  }
  
  // Try to find any HTML component that might be our widget
  try {
    const htmlComponents = ['#htmlComponent1', '#htmlComponent2', '#html1', '#html2'];
    for (const id of htmlComponents) {
      try {
        const widget = $w(id);
        if (widget) {
          logDebug(`✅ Found HTML component widget: ${id}`);
          return widget;
        }
      } catch (e) {
        // Continue searching
      }
    }
  } catch (e) {
    logDebug('Could not search for HTML components');
  }
  
  logError('❌ No AI widget found with any of the expected IDs');
  logDebug('Available page elements:', typeof $w !== 'undefined' ? Object.keys($w) : 'N/A');
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

// 🔥 MAIN APPLICATION INITIALIZATION - WIX APP SAFE
function initializeKovalApp() {
  try {
    logDebug("✅ Koval-AI Wix app initializing...");
    logDebug(`🔧 Current mode: ${currentMode}`);

    // Check if we're in a Wix environment
    if (typeof $w === 'undefined') {
      logError("❌ $w is not available - this code must be placed in a Wix page");
      return;
    }

    const aiWidget = findAIWidget();
    
    if (!aiWidget) {
      logError("❌ Could not find AI widget");
      // Don't return here - app can still function without widget
    }

    // Test backend connection
    testConnection()
      .then(() => {
        logDebug("✅ Backend connection established");
      })
      .catch((error) => {
        logError("⚠️ Backend connection test failed:", error);
      });

    let currentUser = null;
    try {
      currentUser = wixUsers.currentUser;
      if (currentUser && currentUser.loggedIn) {
        logDebug(`👤 User authenticated: ${currentUser.id}`);
        
        getUserProfile(currentUser.id)
          .then((profile) => {
            logDebug("📋 User profile loaded");
          })
          .catch((error) => {
            logDebug("Could not load user profile:", error);
          });
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
          if (!event || !event.data || typeof event.data !== 'object' || !event.data.hasOwnProperty('type')) {
            console.warn('⚠️ Invalid message received');
            return;
          }
          
          const { type, data } = event.data;
          
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
              if (currentUser && data && data.content) {
                try {
                  await saveUserMemory(
                    currentUser.id,
                    data.content,
                    data.type || 'general'
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
              if (currentUser && data) {
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
              aiWidget.postMessage({
                type: 'metrics',
                data: {
                  performance: performanceTracker.getStats(),
                  cache: dataCache,
                  endpoints: ENDPOINT_STATUS,
                  mode: currentMode
                }
              });
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

    // Send initial status to widget if available
    if (aiWidget && aiWidget.postMessage) {
      try {
        aiWidget.postMessage({
          type: 'initialized',
          data: {
            mode: currentMode,
            user: currentUser ? { id: currentUser.id } : null,
            endpoints: ENDPOINT_STATUS
          }
        });
      } catch (error) {
        logError("Error sending initial status to widget:", error);
      }
    }

    logDebug("🚀 Koval-AI app fully initialized");
    
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

// Start the app
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startKovalApp);
  } else {
    startKovalApp();
  }
} else {
  startKovalApp();
}

console.log("🔥 Wix App Frontend Master initialized - Wix IDE Compatible Version");
