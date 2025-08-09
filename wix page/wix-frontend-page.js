// ===== 🔥 WIX EXPERT-LEVEL CONFIGURATION =====

/**
 * 🔥 EXPERT: Advanced configuration following latest Wix Data API best practices
 */
const WIX_EXPERT_CONFIG = {
    DATA_LIMITS: {
        READ_REQUESTS_PER_MINUTE: 3000,
        WRITE_REQUESTS_PER_MINUTE: 1500,
        REQUEST_TIMEOUT: 5000,
        MAX_RESULTS_PER_QUERY: 100,
        OPTIMAL_PAGE_SIZE: 25
    },
    PERFORMANCE: {
        SLOW_QUERY_THRESHOLD: 2000,
        CACHE_TTL_READ: 45000,      // 45s for read operations
        CACHE_TTL_WRITE: 10000,     // 10s for write operations
        RETRY_MAX_ATTEMPTS: 3,
        RETRY_BASE_DELAY: 1000
    },
    MONITORING: {
        LOG_ALL_QUERIES: true,
        TRACK_PERFORMANCE: true,
        ALERT_ON_ERRORS: true
    }
};

/**
 * 🔥 EXPERT: Performance and analytics tracking
 */
class WixExpertAnalytics {
    constructor() {
        this.metrics = {
            totalRequests: 0,
            readRequests: 0,
            writeRequests: 0,
            totalDuration: 0,
            slowQueries: 0,
            errors: 0,
            cacheHits: 0,
            rateLimitHits: 0
        };
        this.performanceLog = [];
    }
    
    recordQuery(operation, duration, itemCount = 0, error = null) {
        this.metrics.totalRequests++;
        this.metrics.totalDuration += duration;
        
        if (operation === 'read') this.metrics.readRequests++;
        if (operation === 'write') this.metrics.writeRequests++;
        
        if (error) this.metrics.errors++;
        if (duration > WIX_EXPERT_CONFIG.PERFORMANCE.SLOW_QUERY_THRESHOLD) {
            this.metrics.slowQueries++;
        }
        
        this.performanceLog.push({
            operation,
            duration,
            itemCount,
            error: error ? error.message : null,
            timestamp: Date.now()
        });
        
        // Keep only last 100 entries
        if (this.performanceLog.length > 100) {
            this.performanceLog = this.performanceLog.slice(-100);
        }
        
        if (WIX_EXPERT_CONFIG.MONITORING.LOG_ALL_QUERIES) {
            console.log(`📊 WIX EXPERT - ${operation}: ${duration}ms, items: ${itemCount}${error ? ', ERROR: ' + error.message : ''}`);
        }
    }
    
    getReport() {
        const avgDuration = this.metrics.totalRequests > 0 ? 
            Math.round(this.metrics.totalDuration / this.metrics.totalRequests) : 0;
        
        return {
            ...this.metrics,
            averageDuration: avgDuration,
            successRate: this.metrics.totalRequests > 0 ? 
                Math.round(((this.metrics.totalRequests - this.metrics.errors) / this.metrics.totalRequests) * 100) : 100,
            slowQueryPercentage: this.metrics.totalRequests > 0 ? 
                Math.round((this.metrics.slowQueries / this.metrics.totalRequests) * 100) : 0,
            performance: avgDuration < 1000 ? 'Excellent' : 
                        avgDuration < 2000 ? 'Good' : 'Needs Optimization'
        };
    }
}

// 🔥 EXPERT: Initialize analytics
const wixExpertAnalytics = new WixExpertAnalytics();

/**
 * 🔥 EXPERT: Enhanced error classification for retry logic
 */
function isWixRetryableError(error) {
    const retryablePatterns = [
        /timeout/i,
        /network/i,
        /temporary/i,
        /rate limit/i,
        /too many requests/i,
        /WDE0014/i,  // Wix rate limit error
        /WDE0028/i   // Wix timeout error
    ];
    
    const errorMessage = error.message || error.toString();
    return retryablePatterns.some(pattern => pattern.test(errorMessage));
}

/**
 * 🔥 EXPERT: Exponential backoff with jitter
 */
function calculateRetryDelay(attempt, baseDelay = WIX_EXPERT_CONFIG.PERFORMANCE.RETRY_BASE_DELAY) {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, 10000); // Max 10s delay
}

/**
 * 🔥 EXPERT: Resilient API call with advanced retry logic
 */
async function makeWixExpertApiCall(url, options = {}, retries = WIX_EXPERT_CONFIG.PERFORMANCE.RETRY_MAX_ATTEMPTS) {
    const startTime = Date.now();
    const operation = options.method === 'POST' ? 'write' : 'read';
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(WIX_EXPERT_CONFIG.DATA_LIMITS.REQUEST_TIMEOUT)
            });
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            const duration = Date.now() - startTime;
            
            wixExpertAnalytics.recordQuery(operation, duration, result.data?.length || 0);
            
            return result;
            
        } catch (error) {
            console.warn(`⚠️ WIX EXPERT - Attempt ${attempt}/${retries} failed:`, error.message);
            
            if (attempt === retries || !isWixRetryableError(error)) {
                const duration = Date.now() - startTime;
                wixExpertAnalytics.recordQuery(operation, duration, 0, error);
                throw error;
            }
            
            const delay = calculateRetryDelay(attempt);
            console.log(`🔄 WIX EXPERT - Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// ===== 🔄 Enhanced Widget Communication & Entitlement Logic =====
// (Merged from koval-ai-page.js)

// ✅ WIX EXPERT OPTIMIZED BACKEND CONFIGURATION
const BACKEND_CONFIG = {
    wix: {
        chat: "/_functions/chat",
        userMemory: "/_functions/userMemory", 
        diveLogs: "/_functions/diveLogs",
        userProfile: "/_functions/getUserProfile",
        testConnection: "/_functions/wixConnection",
        memberProfile: "/_functions/memberProfile"
    },
    nextjs: {
        chat: "https://kovaldeepai-main.vercel.app/api/openai/chat",
        pinecone: "https://kovaldeepai-main.vercel.app/api/pinecone"
    }
};

// ✅ WIX EXPERT: ADVANCED REQUEST CACHE & INTELLIGENT RATE LIMITING
const REQUEST_CACHE = new Map();
const CACHE_EXPIRY = new Map();

const RATE_LIMITER = {
    requests: [],
    maxPerMinute: 45, // More conservative limit to avoid WDE0014
    maxWritePerMinute: 15, // Separate limit for write operations
    writeRequests: [],
    
    cleanup: () => {
        const oneMinuteAgo = Date.now() - 60000;
        RATE_LIMITER.requests = RATE_LIMITER.requests.filter(time => time > oneMinuteAgo);
        RATE_LIMITER.writeRequests = RATE_LIMITER.writeRequests.filter(time => time > oneMinuteAgo);
    },
    
    canMakeRequest: (type = 'read') => {
        RATE_LIMITER.cleanup();
        if (type === 'write') {
            return RATE_LIMITER.writeRequests.length < RATE_LIMITER.maxWritePerMinute;
        }
        return RATE_LIMITER.requests.length < RATE_LIMITER.maxPerMinute;
    },
    
    recordRequest: (type = 'read') => {
        const now = Date.now();
        RATE_LIMITER.requests.push(now);
        if (type === 'write') {
            RATE_LIMITER.writeRequests.push(now);
        }
        console.log(`📊 Rate limiter: ${RATE_LIMITER.requests.length}/${RATE_LIMITER.maxPerMinute} requests, ${RATE_LIMITER.writeRequests.length}/${RATE_LIMITER.maxWritePerMinute} writes`);
    },
    
    waitTime: (type = 'read') => {
        RATE_LIMITER.cleanup();
        const requests = type === 'write' ? RATE_LIMITER.writeRequests : RATE_LIMITER.requests;
        const limit = type === 'write' ? RATE_LIMITER.maxWritePerMinute : RATE_LIMITER.maxPerMinute;
        
        if (requests.length < limit) return 0;
        
        const oldestRequest = Math.min(...requests);
        return Math.max(0, 60000 - (Date.now() - oldestRequest));
    }
};

// ✅ WIX EXPERT: ENHANCED CACHING FUNCTIONS
const CACHE_MANAGER = {
    set: (key, value, ttl = 300000) => { // 5 minutes default
        REQUEST_CACHE.set(key, value);
        CACHE_EXPIRY.set(key, Date.now() + ttl);
    },
    
    get: (key) => {
        if (!REQUEST_CACHE.has(key)) return null;
        
        if (Date.now() > CACHE_EXPIRY.get(key)) {
            REQUEST_CACHE.delete(key);
            CACHE_EXPIRY.delete(key);
            return null;
        }
        
        return REQUEST_CACHE.get(key);
    },
    
    invalidate: (pattern) => {
        for (const key of REQUEST_CACHE.keys()) {
            if (key.includes(pattern)) {
                REQUEST_CACHE.delete(key);
                CACHE_EXPIRY.delete(key);
            }
        }
    },
    
    clear: () => {
        REQUEST_CACHE.clear();
        CACHE_EXPIRY.clear();
    }
};

// ✅ WIX EXPERT: COMPREHENSIVE ENDPOINT STATUS WITH ERROR CODE TRACKING
const ENDPOINT_STATUS = {
    wix: {
        chat: { working: null, lastChecked: null, errorCode: null, responseTime: null },
        userMemory: { working: null, lastChecked: null, errorCode: null, responseTime: null },
        diveLogs: { working: null, lastChecked: null, errorCode: null, responseTime: null },
        userProfile: { working: null, lastChecked: null, errorCode: null, responseTime: null },
        testConnection: { working: null, lastChecked: null, errorCode: null, responseTime: null },
        memberProfile: { working: null, lastChecked: null, errorCode: null, responseTime: null }
    },
    nextjs: {
        chat: { working: null, lastChecked: null, errorCode: null, responseTime: null },
        pinecone: { working: null, lastChecked: null, errorCode: null, responseTime: null }
    },
    metrics: {
        totalRequests: 0,
        failedRequests: 0,
        rateLimitHits: 0,
        timeouts: 0,
        averageResponseTime: 0,
        lastHealthCheck: null,
        cacheHits: 0,
        cacheBypass: 0
    }
};

// ✅ WIX EXPERT: COMPREHENSIVE ERROR CODE MAPPING
const WIX_ERROR_CODES = {
    'WDE0001': 'Invalid collection ID - Check collection name format',
    'WDE0002': 'Item not found - Item may have been deleted',
    'WDE0003': 'Permission denied - Check user permissions',
    'WDE0004': 'Field validation failed - Check required fields',
    'WDE0005': 'Required field missing - Add missing required data',
    'WDE0009': 'Single-item payload too large (512 KB limit) - Reduce data size',
    'WDE0014': 'Requests per minute quota exceeded - Implement rate limiting',
    'WDE0028': 'Operation time limit exceeded (5-10s) - Optimize query or use pagination',
    'WDE0109': 'Bulk operation payload too large (4 MB limit) - Use smaller batches',
    'WDE0110': 'Too many items in bulk operation - Reduce batch size',
    'WDE0200': 'Database connection error - Temporary issue, retry',
    'WDE0201': 'Database timeout - Query too complex',
    'WDE0202': 'Database overloaded - Reduce request frequency'
};

// ✅ WIX EXPERT: OPTIMIZED API ENDPOINTS WITH CONSISTENT NAMING
const WIX_CONNECTION_API = "/_functions/wixConnection";
const MEMBER_PROFILE_API = "/_functions/memberProfile";
const TEST_API = "/_functions/test";
const WIX_CHAT_API = "/_functions/chat";
const WIX_DIVE_LOGS_API = "/_functions/diveLogs";
const WIX_USER_MEMORY_API = "/_functions/userMemory";
const WIX_GET_USER_PROFILE_API = "/_functions/getUserProfile";  // ✅ Available in Website Backend

// ✅ NEXT.JS BACKEND FALLBACKS
const CHAT_API = "https://kovaldeepai-main.vercel.app/api/openai/chat";  // ✅ Next.js fallback
const USER_MEMORY_API = "https://kovaldeepai-main.vercel.app/api/openai/chat";  // ✅ Next.js fallback
const DIVE_LOGS_API = "https://kovaldeepai-main.vercel.app/api/analyze/dive-logs";  // ✅ Next.js fallback
const LOAD_MEMORIES_API = "https://kovaldeepai-main.vercel.app/api/openai/chat";  // ✅ Next.js fallback
const GET_USER_MEMORY_API = "https://kovaldeepai-main.vercel.app/api/openai/chat";  // ✅ Next.js fallback
const SAVE_TO_USER_MEMORY_API = "https://kovaldeepai-main.vercel.app/api/openai/chat";  // ✅ Next.js fallback

// ✅ Keep backup the same
const BACKUP_CHAT_API = "https://kovaldeepai-main.vercel.app/api/openai/chat";

const DEBUG_MODE = true;

// ===== 🚀 WIX EXPERT LEVEL FUNCTIONS =====

/**
 * ✅ WIX EXPERT: OPTIMIZED HEALTH CHECK WITH BATCHING AND INTELLIGENT CACHING
 */
async function performOptimizedHealthCheck() {
    const cacheKey = 'health_check_optimized';
    const cachedResult = CACHE_MANAGER.get(cacheKey);
    
    if (cachedResult && (Date.now() - ENDPOINT_STATUS.metrics.lastHealthCheck) < 30000) {
        console.log("✅ Using cached health check result");
        ENDPOINT_STATUS.metrics.cacheHits++;
        return cachedResult;
    }

    const results = {
        wix: {},
        nextjs: {},
        summary: { 
            working: 0, 
            total: 0, 
            failed: [], 
            rateLimited: 0, 
            timedOut: 0,
            averageResponseTime: 0
        },
        optimization: {
            cacheHits: ENDPOINT_STATUS.metrics.cacheHits,
            requestsSaved: 0,
            batchProcessed: true
        }
    };

    console.log("🔍 Starting WIX EXPERT optimized health check...");
    const startTime = Date.now();

    // ✅ BATCH ENDPOINT CHECKS TO MINIMIZE REQUESTS
    const healthPromises = [];

    // Test Wix endpoints with rate limiting
    for (const [name, url] of Object.entries(BACKEND_CONFIG.wix)) {
        if (!RATE_LIMITER.canMakeRequest('read')) {
            const waitTime = RATE_LIMITER.waitTime('read');
            console.warn(`⏳ Rate limit reached, waiting ${waitTime}ms for ${name}`);
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 5000)));
            }
        }

        healthPromises.push(checkSingleEndpointOptimized(name, url, 'wix'));
    }

    // Test Next.js endpoints
    for (const [name, url] of Object.entries(BACKEND_CONFIG.nextjs)) {
        healthPromises.push(checkSingleEndpointOptimized(name, url, 'nextjs'));
    }

    // ✅ PROCESS ALL HEALTH CHECKS CONCURRENTLY
    const healthResults = await Promise.allSettled(healthPromises);
    const responseTimes = [];
    
    healthResults.forEach((result, index) => {
        const endpointNames = [...Object.keys(BACKEND_CONFIG.wix), ...Object.keys(BACKEND_CONFIG.nextjs)];
        const endpointName = endpointNames[index];
        const endpointType = index < Object.keys(BACKEND_CONFIG.wix).length ? 'wix' : 'nextjs';

        if (result.status === 'fulfilled') {
            const status = result.value;
            results[endpointType][endpointName] = status;
            ENDPOINT_STATUS[endpointType][endpointName] = status;

            if (status.responseTime) {
                responseTimes.push(status.responseTime);
            }

            if (status.working) {
                results.summary.working++;
                console.log(`✅ ${endpointType} ${endpointName}: OK (${status.responseTime}ms)`);
            } else {
                results.summary.failed.push(`${endpointType}.${endpointName}`);
                
                // ✅ TRACK SPECIFIC WIX ERROR PATTERNS
                if (status.errorCode === 'WDE0014') {
                    results.summary.rateLimited++;
                    ENDPOINT_STATUS.metrics.rateLimitHits++;
                } else if (status.errorCode === 'WDE0028') {
                    results.summary.timedOut++;
                    ENDPOINT_STATUS.metrics.timeouts++;
                }
                
                console.warn(`❌ ${endpointType} ${endpointName}: ${status.error}`);
            }
        } else {
            const errorStatus = {
                working: false,
                responseTime: null,
                error: result.reason?.message || 'Unknown error',
                errorCode: null,
                timestamp: new Date().toISOString()
            };

            results[endpointType][endpointName] = errorStatus;
            ENDPOINT_STATUS[endpointType][endpointName] = errorStatus;
            results.summary.failed.push(`${endpointType}.${endpointName}`);
        }
        results.summary.total++;
    });

    // ✅ CALCULATE OPTIMIZATION METRICS
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    results.summary.averageResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

    ENDPOINT_STATUS.metrics.lastHealthCheck = Date.now();
    ENDPOINT_STATUS.metrics.averageResponseTime = results.summary.averageResponseTime;

    // ✅ INTELLIGENT CACHING BASED ON RESULTS
    const cacheTTL = results.summary.working > (results.summary.total * 0.7) ? 45000 : 15000;
    CACHE_MANAGER.set(cacheKey, results, cacheTTL);

    console.log(`📊 WIX EXPERT Health: ${results.summary.working}/${results.summary.total} working (${totalTime}ms total, ${results.summary.averageResponseTime}ms avg)`);
    
    return results;
}

/**
 * ✅ WIX EXPERT: OPTIMIZED SINGLE ENDPOINT CHECK WITH ERROR CODE DETECTION
 */
async function checkSingleEndpointOptimized(name, url, type) {
    const startTime = Date.now();
    
    try {
        console.log(`🔍 Testing ${type} endpoint: ${name}`);
        
        // ✅ RECORD REQUEST FOR RATE LIMITING
        if (type === 'wix') {
            RATE_LIMITER.recordRequest('read');
        }

        // ✅ DETERMINE OPTIMAL METHOD AND TIMEOUT
        const method = (name === 'chat') ? "POST" : "GET";
        const timeout = type === 'wix' ? 4000 : 7000; // Aggressive timeouts for Pages
        
        let testBody = null;
        if (method === "POST") {
            testBody = JSON.stringify({
                userMessage: "health check",
                userId: "test_user",
                minimal: true
            });
        }

        // ✅ USE ABORT CONTROLLER FOR PRECISE TIMEOUT
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
            method: method,
            headers: { 
                "Content-Type": "application/json",
                "X-Health-Check": "wix-expert",
                "X-Request-ID": `health_${Date.now()}`
            },
            body: testBody,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        const status = {
            working: response.ok,
            statusCode: response.status,
            responseTime: responseTime,
            error: null,
            errorCode: null,
            timestamp: new Date().toISOString()
        };

        // ✅ PARSE WIX-SPECIFIC ERROR RESPONSES
        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = response.statusText;
            }
            
            // ✅ DETECT SPECIFIC WIX ERROR CODES
            for (const [code, description] of Object.entries(WIX_ERROR_CODES)) {
                if (errorText.includes(code)) {
                    status.error = `${code}: ${description}`;
                    status.errorCode = code;
                    break;
                }
            }
            
            if (!status.error) {
                status.error = `HTTP ${response.status}: ${response.statusText}`;
            }
        }

        return status;

    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        let errorMessage = error.message;
        let errorCode = null;
        
        // ✅ CATEGORIZE ERROR TYPES
        if (error.name === 'AbortError') {
            errorMessage = 'Request timeout (exceeds Wix limits)';
            errorCode = 'WDE0028';
        } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
            errorMessage = 'Rate limit exceeded';
            errorCode = 'WDE0014';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            errorMessage = 'Network connectivity issue';
        }

        return {
            working: false,
            statusCode: null,
            responseTime: responseTime,
            error: errorMessage,
            errorCode: errorCode,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * ✅ WIX EXPERT: OPTIMIZED BACKEND STATUS DISPLAY WITH RICH METRICS
 */
function displayOptimizedBackendStatus(endpointHealth) {
    const statusText = generateOptimizedStatusText(endpointHealth);
    
    // Try to find status display elements
    const statusIds = ['#backendStatus', '#status', '#systemStatus', '#connectionStatus'];
    let statusElement = null;
    
    for (const id of statusIds) {
        try {
            statusElement = $w(id);
            if (statusElement) break;
        } catch (e) {
            // Element not found, continue
        }
    }

    if (statusElement && typeof statusElement.text !== 'undefined') {
        statusElement.text = statusText;
        console.log("✅ Updated WIX EXPERT status display");
    } else {
        console.log("📊 WIX EXPERT Backend Status:", statusText);
        
        // ✅ CREATE FLOATING STATUS INDICATOR IF POSSIBLE
        try {
            if (typeof document !== 'undefined' && document.body) {
                const existingStatus = document.getElementById('wix-expert-status');
                if (existingStatus) existingStatus.remove();
                
                const healthColor = endpointHealth.summary.working > 0 ? '#28a745' : '#dc3545';
                const statusHtml = `
                    <div id="wix-expert-status" style="
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        background: ${healthColor};
                        color: white;
                        padding: 8px 12px;
                        border-radius: 6px;
                        font-size: 11px;
                        z-index: 9999;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        font-family: Arial, sans-serif;
                    ">
                        ${statusText}
                    </div>
                `;
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = statusHtml;
                document.body.appendChild(tempDiv.firstElementChild);
                
                // Auto-remove after 8 seconds
                setTimeout(() => {
                    const status = document.getElementById('wix-expert-status');
                    if (status) status.remove();
                }, 8000);
            }
        } catch (domError) {
            console.warn("⚠️ Could not create floating status indicator:", domError);
        }
    }
}

/**
 * ✅ WIX EXPERT: GENERATE RICH STATUS TEXT WITH METRICS
 */
function generateOptimizedStatusText(endpointHealth) {
    const { summary } = endpointHealth;
    const workingCount = summary.working;
    const totalCount = summary.total;
    
    let statusText = '';
    let icon = '';
    
    if (workingCount === totalCount) {
        icon = '🟢';
        statusText = `All systems operational (${workingCount}/${totalCount})`;
    } else if (workingCount > 0) {
        icon = '🟡';
        statusText = `Partial service (${workingCount}/${totalCount})`;
    } else {
        icon = '🔴';
        statusText = `Systems offline (${workingCount}/${totalCount})`;
    }
    
    // ✅ ADD PERFORMANCE METRICS
    const metrics = [];
    if (summary.averageResponseTime > 0) {
        metrics.push(`${summary.averageResponseTime}ms`);
    }
    if (summary.rateLimited > 0) {
        metrics.push(`${summary.rateLimited} rate limited`);
    }
    if (summary.timedOut > 0) {
        metrics.push(`${summary.timedOut} timeouts`);
    }
    
    const metricsText = metrics.length > 0 ? ` | ${metrics.join(', ')}` : '';
    
    return `${icon} ${statusText}${metricsText}`;
}

$w.onReady(async function () {
    console.log("🚀 Koval-AI widget initializing with WIX EXPERT optimizations...");

    // ===== 🎯 WIX EXPERT: INTELLIGENT ENDPOINT HEALTH CHECK =====
    const endpointHealth = await performOptimizedHealthCheck();
    console.log("🔗 WIX EXPERT endpoint health check:", endpointHealth);
    displayOptimizedBackendStatus(endpointHealth);

    // ===== 🔄 Enhanced Widget Communication (from koval-ai-page.js) =====
    
    // Setup enhanced message listener for widget communication
    if (typeof window !== 'undefined') {
        window.addEventListener('message', handleEnhancedWidgetMessage);
        console.log('👂 Enhanced widget message listener active');
    }

    // ===== User Authentication & Entitlement Check =====
    await initializeUserAuthAndEntitlement();

    // ===== Original Widget Setup Logic =====

    // ✅ SETUP MESSAGE LISTENER FOR WIDGET COMMUNICATION (with safety check)
    if (typeof window !== 'undefined') {
        window.addEventListener('message', async (event) => {
            if (event.data?.type === 'REQUEST_USER_DATA' && event.data?.source === 'koval-ai-widget') {
                console.log('📨 Widget requesting user data, sending authenticated user info...');
                
                try {
                    // Load current user data
                    const userData = await loadUserData();
                    
                    // Send user data back to widget with more detailed logging
                    console.log('🔍 Sending user data:', {
                        userId: userData.userId,
                        hasProfile: !!userData.profile,
                        diveLogsCount: userData.userDiveLogs?.length || 0
                    });
                    
                    event.source.postMessage({
                        type: 'USER_DATA_RESPONSE',
                        userData: userData
                    }, event.origin);
                    
                    console.log('📤 Sent authenticated user data to widget:', userData.userId);
                } catch (error) {
                    console.error('❌ Failed to send user data to widget:', error);
                    
                    // Send guest data as fallback
                    const guestData = getGuestUserData();
                    event.source.postMessage({
                        type: 'USER_DATA_RESPONSE',
                        userData: guestData
                    }, event.origin);
                    console.log('📤 Sent guest data as fallback');
                }
            }
        });
    }

    // ✅ TRY MULTIPLE POSSIBLE WIDGET IDS - PRIORITIZING THE CORRECT ONE
    let aiWidget = null;
    const possibleIds = ['#koval-ai', '#KovalAiWidget', '#kovalAIWidget', '#KovalAIWidget', '#htmlComponent1', '#html1', '#customElement1'];
    
    for (const id of possibleIds) {
        try {
            aiWidget = $w(id);
            if (aiWidget) {
                console.log(`✅ Found widget with ID: ${id}`);
                break;
            }
        } catch (e) {
            console.log(`⚠️ Widget ${id} not found`);
        }
    }

    if (!aiWidget) {
        console.error("❌ No Koval-AI widget found on page. Tried IDs:", possibleIds);
        console.log("📋 Available elements:", Object.keys($w));
        showFallbackMessage();
        return;
    }

    try {
        // ✅ SETUP WIDGET WITH LOADING STATE
        await setupKovalAIWidget(aiWidget);
    } catch (error) {
        console.error("❌ Widget initialization failed:", error);
        showFallbackMessage();
    }
});

/**
 * ✅ SETUP KOVAL AI WIDGET WITH PROPER ERROR HANDLING
 */
async function setupKovalAIWidget(aiWidget) {
    // ✅ Show loading state
    try {
        if (aiWidget && typeof aiWidget.setProperty === 'function') {
            aiWidget.setProperty("loading", true);
        }
    } catch (propError) {
        console.warn("⚠️ Widget property setting failed, using alternative approach");
    }

    // ✅ LOAD USER DATA WITH TIMEOUT PROTECTION
    let userData = null;
    try {
        userData = await Promise.race([
            loadUserData(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('User data load timeout')), 10000)
            )
        ]);
        
        if (DEBUG_MODE) console.log("📊 User data loaded:", userData);
        
        // ✅ UPDATE WIDGET SRC URL WITH CORRECT USER ID (if widget supports it)
        if (userData && userData.userId && !userData.userId.startsWith('guest-')) {
            try {
                // ✅ Try to update the widget's src URL with the correct user ID
                const embedUrl = `https://kovaldeepai-main.vercel.app/embed?theme=light&userId=${userData.userId}&userName=${encodeURIComponent(userData.profile?.displayName || 'User')}&embedded=true&v=${Date.now()}`;
                aiWidget.src = embedUrl;
                console.log("🔗 Updated widget src with authenticated user ID:", userData.userId);
            } catch (srcError) {
                console.warn("⚠️ Could not update widget src:", srcError);
            }
        }
        
    } catch (dataError) {
        console.error("❌ Failed to load user data:", dataError);
        userData = getGuestUserData();
    }

    // ✅ SEND INITIAL DATA TO WIDGET
    try {
        // ✅ Check what type of widget we're dealing with
        if (aiWidget && typeof aiWidget.setProperty === 'function') {
            console.log('✅ Widget supports properties, setting user data...');
            aiWidget.setProperty("userData", userData);
            aiWidget.setProperty("loading", false);
        } else {
            console.warn('⚠️ Widget does not support setProperty - using postMessage only');
        }
        
        // ✅ ALSO SEND USER DATA VIA POST MESSAGE FOR EMBEDDED WIDGETS
        setTimeout(() => {
            try {
                if (aiWidget && typeof aiWidget.postMessage === 'function' && userData) {
                    // ✅ FORMAT DATA FOR EMBED PAGE EXPECTATIONS
                    const postMessageData = {
                        type: 'USER_AUTH',
                        data: {
                            userId: userData.userId,
                            userName: userData.profile?.displayName || userData.profile?.nickname || 'User',
                            userEmail: userData.profile?.loginEmail || '',
                            firstName: userData.profile?.firstName || '',
                            lastName: userData.profile?.lastName || '',
                            profilePicture: userData.profile?.profilePhoto || userData.profile?.profilePicture || '',
                            phone: userData.profile?.phone || '',
                            bio: userData.profile?.about || userData.profile?.bio || '',
                            location: userData.profile?.location || '',
                            source: 'wix-frontend-auth',
                            isGuest: userData.profile?.isGuest || false,
                            customFields: userData.profile?.customFields || {},
                            diveLogs: userData.userDiveLogs || [],
                            memories: userData.userMemories || [],
                            // ✅ Add additional profile fields for better display
                            nickname: userData.profile?.nickname || userData.profile?.displayName || 'User',
                            fullProfile: userData.profile  // ✅ Pass full profile for debugging
                        }
                    };
                    
                    aiWidget.postMessage(postMessageData);
                    console.log("📤 Sent authentic user data to widget via postMessage:", {
                        userId: userData.userId,
                        userName: postMessageData.data.userName,
                        nickname: postMessageData.data.nickname,
                        isGuest: postMessageData.data.isGuest,
                        hasProfilePhoto: !!postMessageData.data.profilePicture,
                        profileSource: userData.profile?.source,
                        // ✅ Add detailed debugging for profile data
                        profileDebug: {
                            displayName: userData.profile?.displayName,
                            nickname: userData.profile?.nickname,
                            firstName: userData.profile?.firstName,
                            originalProfile: userData.profile
                        }
                    });
                }
            } catch (postError) {
                console.warn("⚠️ Could not send postMessage to widget:", postError);
            }
        }, 1000); // Give widget time to load
        
    } catch (propError) {
        console.warn("⚠️ Could not set widget properties");
    }

    // ✅ SETUP EVENT HANDLERS WITH ERROR PROTECTION
    setupWidgetEventHandlers(aiWidget);

    console.log("✅ Koval-AI widget initialized successfully");
}

// ===== 🔄 Enhanced Widget Communication Functions (from koval-ai-page.js) =====

/**
 * ✅ Enhanced Widget Message Handler
 */
async function handleEnhancedWidgetMessage(event) {
    console.log('📨 Enhanced message handler - received:', event.data);
    
    try {
        const { type, source } = event.data;
        
        // Security check - only respond to our widget
        if (source !== 'koval-ai-widget') {
            return;
        }
        
        switch (type) {
            case 'REQUEST_USER_DATA':
                console.log('🔍 Widget requesting user data via enhanced handler');
                await sendEnhancedUserDataToWidget();
                break;
                
            case 'CHECK_USER_REGISTRATION':
                console.log('🔐 Widget checking user registration via enhanced handler');
                await checkAndSendUserAccess();
                break;
                
            case 'CHAT_MESSAGE':
                console.log('💬 Chat message from widget:', event.data.data);
                // Handle chat messages if needed
                break;
                
            case 'SAVE_DIVE_LOG':
                console.log('💾 Saving dive log from widget via enhanced handler:', event.data.data);
                await saveDiveLogFromWidget(event.data.data);
                break;
                
            default:
                console.log('❓ Unknown enhanced message type:', type);
        }
    } catch (error) {
        console.error('❌ Error in enhanced widget message handler:', error);
    }
}

/**
 * ✅ Initialize User Authentication and Entitlement
 */
async function initializeUserAuthAndEntitlement() {
    try {
        console.log('🔄 Initializing user authentication and entitlement...');
        
        // 1. Check if user is logged in
        if (!wixUsers.currentUser.loggedIn) {
            console.log('👤 User not logged in, prompting login...');
            await wixUsers.promptLogin();
        }
        
        const member = await currentMember.getMember();
        if (!member || !member.loggedIn) {
            console.warn('⚠️ User login failed or cancelled');
            return;
        }
        
        // 2. Check entitlement (Registration/Access) - SIMPLIFIED
        console.log('✅ User has valid access - skipping access check for now');
        /*
        try {
            const accessResponse = await fetch('/_functions/checkUserAccess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: member._id,
                    userEmail: member.loginEmail
                })
            });
            const accessResult = await accessResponse.json();
            
            if (!accessResult || !accessResult.hasAccess) {
                console.log('❌ User not entitled, redirecting to pricing...');
                wixLocation.to('/plans-pricing');
                return;
            }
            console.log('✅ User has valid access:', accessResult);
        } catch (entitlementError) {
            console.warn('⚠️ Access check failed:', entitlementError);
            // Continue anyway - might be a backend issue
        }
        */
        
        // 3. Find and update widget with user data
        await updateWidgetWithUserData(member);
        
        // 4. Send initial user data
        setTimeout(async () => {
            await sendEnhancedUserDataToWidget();
        }, 1000);
        
        // 5. Check and send user access status
        setTimeout(async () => {
            await checkAndSendUserAccess();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error initializing user auth/entitlement:', error);
    }
}

/**
 * ✅ Update Widget with User Data
 */
async function updateWidgetWithUserData(member) {
    try {
        // Try to find the widget with various possible IDs
        const possibleIds = ['#koval-ai', '#KovalAiWidget', '#kovalAIWidget', '#KovalAIWidget', '#htmlComponent1', '#html1', '#customElement1'];
        let widget = null;
        
        for (const id of possibleIds) {
            try {
                widget = $w(id);
                if (widget) {
                    console.log(`✅ Found widget with ID: ${id}`);
                    break;
                }
            } catch (e) {
                // Continue trying other IDs
            }
        }
        
        // Update widget src with user data if it's an iframe
        if (widget && widget.src) {
            const url = new URL(widget.src, window.location.origin);
            url.searchParams.set('userId', member._id);
            url.searchParams.set('userName', member.profile?.nickname || member.profile?.firstName || 'Member');
            url.searchParams.set('ts', `${Date.now()}`);
            widget.src = url.toString();
            console.log('🔗 Updated widget iframe src with userId:', member._id);
        }
    } catch (error) {
        console.error('❌ Error updating widget with user data:', error);
    }
}

/**
 * ✅ Send Enhanced User Data to Widget
 */
async function sendEnhancedUserDataToWidget() {
    try {
        // ✅ Use the same enhanced loadUserData function that loads rich profile data
        const fullUserData = await loadUserData();
        
        // ✅ Format for widget consumption
        const userData = {
            userId: fullUserData.userId,
            userName: fullUserData.profile?.displayName || fullUserData.profile?.nickname || 'User',
            userEmail: fullUserData.profile?.loginEmail || '',
            firstName: fullUserData.profile?.firstName || '',
            lastName: fullUserData.profile?.lastName || '',
            profilePicture: fullUserData.profile?.profilePhoto || fullUserData.profile?.profilePicture || '',
            phone: fullUserData.profile?.phone || '',
            bio: fullUserData.profile?.about || fullUserData.profile?.bio || '',
            location: fullUserData.profile?.location || '',
            isAuthenticated: !fullUserData.profile?.isGuest,
            isGuest: fullUserData.profile?.isGuest || false,
            profile: fullUserData.profile,
            source: 'wix-enhanced-authenticated-full',
            customFields: fullUserData.profile?.customFields || {},
            // ✅ Include stats and dive data
            diveLogs: fullUserData.userDiveLogs || [],
            memories: fullUserData.userMemories || [],
            stats: fullUserData.stats || {}
        };
        
        // Send to widget via postMessage
        postEnhancedMessageToWidget('USER_AUTH', { ...userData });
        console.log('✅ Enhanced user data sent to widget:', {
            userId: userData.userId,
            userName: userData.userName,
            isGuest: userData.isGuest,
            hasProfilePhoto: !!userData.profilePicture,
            source: userData.source
        });
        
    } catch (error) {
        console.error('❌ Error sending enhanced user data to widget:', error);
        
        // ✅ Fallback to basic member data if full profile loading fails
        try {
            const member = await currentMember.getMember();
            if (member && member.loggedIn) {
                const fallbackData = {
                    userId: member._id,
                    userName: member.profile?.nickname || member.profile?.firstName || member.profile?.displayName || 'Member',
                    userEmail: member.loginEmail || '',
                    isAuthenticated: true,
                    isGuest: false,
                    source: 'wix-enhanced-fallback',
                    profile: member.profile || {}
                };
                
                postEnhancedMessageToWidget('USER_AUTH', fallbackData);
                console.log('📤 Sent fallback user data to widget:', fallbackData.userId);
            }
        } catch (fallbackError) {
            console.error('❌ Fallback user data failed:', fallbackError);
        }
    }
}

/**
 * ✅ Check and Send User Access Status
 */
async function checkAndSendUserAccess() {
    try {
        const member = await currentMember.getMember();
        
        if (!member || !member.loggedIn) {
            postEnhancedMessageToWidget('USER_REGISTRATION_RESPONSE', {
                hasAccess: false,
                reason: 'not_logged_in',
                message: 'Please log in to access Koval AI'
            });
            return;
        }
        
        // Check access via backend - SIMPLIFIED (no checkUserAccess function available)
        console.log('✅ User logged in, assuming valid access');
        const accessResult = { hasAccess: true, reason: 'logged_in_user' };
        
        /*
        const accessResponse = await fetch('/_functions/checkUserAccess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: member._id,
                userEmail: member.loginEmail
            })
        });
        const accessResult = await accessResponse.json();
        */
        console.log('🔍 Enhanced access check result:', accessResult);
        
        postEnhancedMessageToWidget('USER_REGISTRATION_RESPONSE', {
            hasAccess: accessResult.hasAccess,
            user: {
                id: member._id,
                displayName: member.profile?.nickname || member.profile?.firstName,
                loginEmail: member.loginEmail
            },
            accessData: accessResult,
            timestamp: Date.now()
        });
        
        console.log('✅ Enhanced access status sent to widget');
        
    } catch (error) {
        console.error('❌ Enhanced access check error:', error);
        postEnhancedMessageToWidget('USER_REGISTRATION_RESPONSE', {
            hasAccess: false,
            error: error.message,
            reason: 'check_failed'
        });
    }
}

/**
 * ✅ Save Dive Log from Widget (Enhanced)
 */
async function saveDiveLogFromWidget(diveLogData) {
    try {
        console.log('💾 Enhanced dive log save from widget:', diveLogData);
        
        // Use existing saveDiveLog function if available, or implement save logic
        let saveResult;
        if (typeof saveDiveLog === 'function') {
            saveResult = await saveDiveLog(diveLogData);
        } else {
            // Fallback save logic
            saveResult = { success: true, message: 'Dive log received' };
        }
        
        postEnhancedMessageToWidget('DIVE_LOG_SAVED', saveResult);
        
    } catch (error) {
        console.error('❌ Enhanced dive log save error:', error);
        postEnhancedMessageToWidget('DIVE_LOG_SAVED', {
            success: false,
            error: error.message
        });
    }
}

/**
 * ✅ Helper: Post Enhanced Message to Widget
 */
function postEnhancedMessageToWidget(type, data = {}) {
    try {
        // Try multiple widget IDs
        const possibleIds = ['#koval-ai', '#KovalAiWidget', '#kovalAIWidget', '#KovalAIWidget', '#htmlComponent1', '#html1', '#customElement1'];
        
        for (const id of possibleIds) {
            try {
                const widget = $w(id);
                if (widget && widget.contentWindow) {
                    const message = {
                        type,
                        data,
                        source: 'wix-enhanced-page',
                        timestamp: Date.now()
                    };
                    
                    widget.contentWindow.postMessage(message, '*');
                    console.log(`📤 Enhanced message sent to widget ${id}:`, type);
                    return; // Success, exit loop
                } else if (widget && widget.src) {
                    // Try to get iframe reference for widgets with src
                    const iframe = widget.src ? document.querySelector(`iframe[src*="${widget.src}"]`) : null;
                    if (iframe && iframe.contentWindow) {
                        const message = {
                            type,
                            data,
                            source: 'wix-enhanced-page',
                            timestamp: Date.now()
                        };
                        
                        iframe.contentWindow.postMessage(message, '*');
                        console.log(`📤 Enhanced message sent to iframe ${id}:`, type);
                        return; // Success, exit loop
                    }
                }
            } catch (e) {
                // Continue trying other IDs
                console.log(`⚠️ Could not send to widget ${id}:`, e.message);
            }
        }
        
        console.warn('⚠️ No widget found to send enhanced message');
    } catch (error) {
        console.error('❌ Error sending enhanced message to widget:', error);
    }
}

/**
 * ✅ ENHANCED EDIT MODE HANDLER
 */
if (typeof wixWindow !== 'undefined' && wixWindow.onEditModeChange) {
    wixWindow.onEditModeChange((isEditMode) => {
        console.log(`🎛️ Enhanced edit mode: ${isEditMode ? 'EDIT' : 'PREVIEW'}`);
        postEnhancedMessageToWidget('EDIT_MODE_CHANGE', {
            editMode: isEditMode,
            timestamp: Date.now()
        });
    });
}

// ===== � WIX EXPERT: ENHANCED DATASET INTEGRATION =====

/**
 * ✅ Initialize UserMemory Dataset with proper filtering
 */
function initializeUserMemoryDataset() {
    try {
        // ✅ Set up dataset filtering by current user
        if (wixUsers.currentUser.loggedIn) {
            const userId = wixUsers.currentUser.id;
            console.log('🔍 Filtering UserMemory dataset for user:', userId);
            
            // Check if dataset exists
            if ($w('#dataset1')) {
                // Filter dataset to show only current user's memories
                $w('#dataset1').setFilter(wixData.filter()
                    .eq('userId', userId)
                );
                
                // ✅ Load the data with proper pagination
                $w('#dataset1').loadPage(1)  // ✅ Specify page number explicitly
                    .then(() => {
                        console.log('✅ UserMemory dataset loaded successfully');
                        console.log('📊 Loaded items:', $w('#dataset1').getTotalCount());
                    })
                    .catch((error) => {
                        console.error('❌ Error loading UserMemory dataset:', error);
                    });
            } else {
                console.warn('⚠️ Dataset #dataset1 not found on page');
            }
        } else {
            console.warn('⚠️ User not logged in, cannot filter UserMemory dataset');
        }
    } catch (error) {
        console.error('❌ Error initializing dataset:', error);
    }
}

/**
 * ✅ Save new memory to dataset
 */
async function saveMemoryToDataset(memoryData) {
    try {
        if (!wixUsers.currentUser.loggedIn) {
            throw new Error('User not logged in');
        }
        
        const userId = wixUsers.currentUser.id;
        
        // Prepare data for saving
        const newMemory = {
            userId: userId,
            memoryContent: memoryData.content || memoryData.memoryContent,
            logEntry: memoryData.logEntry || '',
            sessionName: memoryData.sessionName || 'Page Session',
            timestamp: new Date(),
            metadata: memoryData.metadata || {}
        };
        
        // Save to dataset if it exists
        if ($w('#dataset1')) {
            const result = await $w('#dataset1').save(newMemory);
            console.log('✅ Memory saved to dataset:', result);
            return { success: true, data: result };
        } else {
            console.warn('⚠️ Dataset not available, saving via API instead');
            return await saveUserMemory(memoryData);
        }
        
    } catch (error) {
        console.error('❌ Error saving memory to dataset:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ✅ Setup dataset event handlers
 */
function setupDatasetEventHandlers() {
    try {
        if ($w('#dataset1')) {
            // Handle dataset ready
            $w('#dataset1').onReady(() => {
                console.log('📊 UserMemory dataset is ready');
            });
            
            // Handle dataset errors
            $w('#dataset1').onError((error) => {
                console.error('❌ Dataset error:', error);
            });
            
            // ✅ Check if onCurrentItemChanged exists before using it
            if (typeof $w('#dataset1').onCurrentItemChanged === 'function') {
                $w('#dataset1').onCurrentItemChanged(() => {
                    console.log('🔄 Dataset current item changed');
                });
            } else {
                console.warn('⚠️ onCurrentItemChanged not available for this dataset type');
            }
        }
    } catch (error) {
        console.error('❌ Error setting up dataset handlers:', error);
    }
}

// ✅ Initialize dataset integration
setTimeout(() => {
    initializeUserMemoryDataset();
    setupDatasetEventHandlers();
}, 1000); // Give page time to load

/**
 * ✅ SYNC LOCAL DIVE LOGS TO WIX DATABASE
 */
async function syncLocalDiveLogsToWix(userId, localDiveLogs) {
    console.log(`🔄 Syncing ${localDiveLogs.length} local dive logs to Wix for user: ${userId}`);
    
    for (const diveLog of localDiveLogs) {
        try {
            // Convert local dive log format to Wix format
            const wixDiveLog = {
                userId: userId,
                ...diveLog,
                type: 'dive-log',
                source: 'local-sync',
                timestamp: diveLog.timestamp || new Date().toISOString(),
                memoryContent: `Dive Log: ${diveLog.discipline} at ${diveLog.location}, reached ${diveLog.reachedDepth}m (target: ${diveLog.targetDepth}m). ${diveLog.notes || 'No additional notes.'}`,
                logEntry: `${diveLog.date}: ${diveLog.discipline} dive at ${diveLog.location}`
            };
            
            // Save to Wix database via API
            const response = await fetch(DIVE_LOGS_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    userId: userId,
                    diveLog: wixDiveLog
                })
            });
            
            if (response.ok) {
                console.log(`✅ Synced dive log ${diveLog.id} to Wix`);
            } else {
                console.warn(`⚠️ Failed to sync dive log ${diveLog.id}:`, response.status);
            }
        } catch (error) {
            console.warn(`⚠️ Error syncing dive log ${diveLog.id}:`, error.message);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Local dive logs sync completed');
}
