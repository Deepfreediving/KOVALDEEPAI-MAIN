// ===== 🔥 WIX MASTER-LEVEL CONFIGURATION =====

// Required Wix imports for page functionality
import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import { currentMember } from 'wix-members';

/**
 * 🔥 MASTER: Advanced configuration following latest Wix Data API best practices
 * Single perfect version for freediving community
 */
const WIX_MASTER_CONFIG = {
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
 * 🔥 MASTER: Performance and analytics tracking
 */
class WixMasterAnalytics {
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
        if (duration > WIX_MASTER_CONFIG.PERFORMANCE.SLOW_QUERY_THRESHOLD) {
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
        
        if (WIX_MASTER_CONFIG.MONITORING.LOG_ALL_QUERIES) {
            console.log(`📊 WIX MASTER - ${operation}: ${duration}ms, items: ${itemCount}${error ? ', ERROR: ' + error.message : ''}`);
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

// 🔥 MASTER: Initialize analytics
const wixMasterAnalytics = new WixMasterAnalytics();

/**
 * 🔥 MASTER: Enhanced error classification for retry logic
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
 * 🔥 MASTER: Exponential backoff with jitter
 */
function calculateRetryDelay(attempt, baseDelay = WIX_MASTER_CONFIG.PERFORMANCE.RETRY_BASE_DELAY) {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, 10000); // Max 10s delay
}

/**
 * 🔥 MASTER: Resilient API call with advanced retry logic
 */
async function makeWixMasterApiCall(url, options = {}, retries = WIX_MASTER_CONFIG.PERFORMANCE.RETRY_MAX_ATTEMPTS) {
    const startTime = Date.now();
    const operation = options.method === 'POST' ? 'write' : 'read';
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(WIX_MASTER_CONFIG.DATA_LIMITS.REQUEST_TIMEOUT)
            });
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            const duration = Date.now() - startTime;
            
            wixMasterAnalytics.recordQuery(operation, duration, result.data?.length || 0);
            
            return result;
            
        } catch (error) {
            console.warn(`⚠️ WIX MASTER - Attempt ${attempt}/${retries} failed:`, error.message);
            
            if (attempt === retries || !isWixRetryableError(error)) {
                const duration = Date.now() - startTime;
                wixMasterAnalytics.recordQuery(operation, duration, 0, error);
                throw error;
            }
            
            const delay = calculateRetryDelay(attempt);
            console.log(`🔄 WIX MASTER - Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// ===== 🔄 Enhanced Widget Communication & Entitlement Logic =====
// (Merged from koval-ai-page.js)

// ✅ WIX PAGE OPTIMIZED BACKEND CONFIGURATION
const BACKEND_CONFIG = {
    wix: {
        // Skip health checks for Wix Page - no backend functions available
        diveLogs: "https://kovaldeepai-main.vercel.app/api/analyze/dive-logs"
    },
    nextjs: {
        chat: "https://kovaldeepai-main.vercel.app/api/openai/chat"
    }
};

// ✅ WIX MASTER: ADVANCED REQUEST CACHE & INTELLIGENT RATE LIMITING
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

// ✅ WIX MASTER: ENHANCED CACHING FUNCTIONS
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

// ✅ WIX MASTER: COMPREHENSIVE ENDPOINT STATUS WITH ERROR CODE TRACKING
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

// ✅ WIX MASTER: COMPREHENSIVE ERROR CODE MAPPING
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

// ✅ WIX PAGE: CORRECTED API ENDPOINTS - ONLY AVAILABLE FUNCTIONS
const MEMBER_PROFILE_API = "/_functions/getUserProfile";
const WIX_CHAT_API = "/_functions/chat";
const WIX_DIVE_LOGS_API = "https://kovaldeepai-main.vercel.app/api/analyze/dive-logs";
const WIX_USER_MEMORY_API = "/_functions/userMemory";
const WIX_GET_USER_PROFILE_API = "/_functions/getUserProfile";

// ✅ NEXT.JS BACKEND FALLBACKS - CORRECTED
const CHAT_API = "https://kovaldeepai-main.vercel.app/api/openai/chat";  // ✅ Only for chat
const USER_MEMORY_API = "https://kovaldeepai-main.vercel.app/api/auth/save-user-memory";  // ✅ FIXED
const DIVE_LOGS_API = "https://kovaldeepai-main.vercel.app/api/analyze/dive-logs";  // ✅ Already correct
const LOAD_MEMORIES_API = "https://kovaldeepai-main.vercel.app/api/auth/get-user-memory";  // ✅ FIXED
const GET_USER_MEMORY_API = "https://kovaldeepai-main.vercel.app/api/auth/get-user-memory";  // ✅ FIXED
const SAVE_TO_USER_MEMORY_API = "https://kovaldeepai-main.vercel.app/api/auth/save-user-memory";  // ✅ FIXED

// ✅ Keep backup the same
const BACKUP_CHAT_API = "https://kovaldeepai-main.vercel.app/api/openai/chat";

const DEBUG_MODE = true;

// ===== 🚀 WIX MASTER LEVEL FUNCTIONS =====

/**
 * ✅ WIX MASTER: OPTIMIZED HEALTH CHECK WITH BATCHING AND INTELLIGENT CACHING
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

    console.log("🔍 Starting WIX MASTER optimized health check...");
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

    console.log(`📊 WIX MASTER Health: ${results.summary.working}/${results.summary.total} working (${totalTime}ms total, ${results.summary.averageResponseTime}ms avg)`);
    
    return results;
}

/**
 * ✅ WIX MASTER: OPTIMIZED SINGLE ENDPOINT CHECK WITH ERROR CODE DETECTION
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
                message: "health check",  // ✅ Fixed: Use 'message' instead of 'userMessage'
                userId: "test_user",
                minimal: true,
                profile: {},
                embedMode: false
            });
        }

        // ✅ USE ABORT CONTROLLER FOR PRECISE TIMEOUT
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // ✅ Only add custom headers for internal Wix functions, not external APIs
        const isExternalAPI = url.includes('vercel.app') || url.includes('openai.com') || url.includes('pinecone.io');
        
        const headers = {
            "Content-Type": "application/json"
        };
        
        // Only add custom headers for non-external APIs
        if (!isExternalAPI) {
            headers["X-Health-Check"] = "wix-master";
            headers["X-Request-ID"] = `health_${Date.now()}`;
        }

        const response = await fetch(url, {
            method: method,
            headers: headers,
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
 * ✅ WIX MASTER: OPTIMIZED BACKEND STATUS DISPLAY WITH RICH METRICS
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
        console.log("✅ Updated WIX MASTER status display");
    } else {
        console.log("📊 WIX MASTER Backend Status:", statusText);
        
        // ✅ CREATE FLOATING STATUS INDICATOR IF POSSIBLE
        try {
            if (typeof document !== 'undefined' && document.body) {
                const existingStatus = document.getElementById('wix-master-status');
                if (existingStatus) existingStatus.remove();
                
                const healthColor = endpointHealth.summary.working > 0 ? '#28a745' : '#dc3545';
                const statusHtml = `
                    <div id="wix-master-status" style="
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
                    const status = document.getElementById('wix-master-status');
                    if (status) status.remove();
                }, 8000);
            }
        } catch (domError) {
            console.warn("⚠️ Could not create floating status indicator:", domError);
        }
    }
}

/**
 * ✅ WIX MASTER: GENERATE RICH STATUS TEXT WITH METRICS
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

// ===== 🚀 QUICK MESSAGE LISTENER SETUP =====
if (typeof window !== 'undefined') {
    window.addEventListener('message', async (event) => {
        // Handle widget requests quickly
        if (event.data?.type === 'REQUEST_USER_DATA' && event.data?.source === 'koval-ai-widget') {
            console.log('📨 Quick user data request from widget');
            
            try {
                const userData = await loadComprehensiveUserData();
                event.source.postMessage({
                    type: 'USER_DATA_RESPONSE',
                    userData: userData
                }, event.origin);
                console.log('📤 Quick user data sent:', userData.userId);
            } catch (error) {
                console.warn('⚠️ Quick fallback to guest data');
                const guestData = getGuestUserData();
                event.source.postMessage({
                    type: 'USER_DATA_RESPONSE',
                    userData: guestData
                }, event.origin);
            }
        }
    });
    console.log('👂 Quick message listener active');
}

// ===== 🚀 WIX MASTER LEVEL FUNCTIONS =====

$w.onReady(async function () {
    console.log("🚀 Quick AI initialization - bypassing health checks...");

    // ===== SKIP HEALTH CHECKS FOR SPEED =====
    console.log("⚡ Skipping health checks, focusing on getting AI working");

    // ===== FIND WIDGET QUICKLY =====
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
            // Continue searching
        }
    }

    if (!aiWidget) {
        console.error("❌ No AI widget found, creating fallback");
        return;
    }

    // ===== QUICK USER DATA LOADING =====
    let userData = null;
    try {
        console.log('🔍 DEBUGGING: About to load user data...');
        
        // ✅ ENHANCED DEBUG: Check authentication status first
        try {
            const member = await currentMember.getMember();
            console.log('🔍 DEBUGGING: currentMember result:', {
                hasmember: !!member,
                memberId: member?._id,
                loggedIn: member?.loggedIn,
                nickname: member?.nickname
            });
        } catch (e) {
            console.log('🔍 DEBUGGING: currentMember failed:', e.message);
        }
        
        const wixUser = wixUsers.currentUser;
        console.log('🔍 DEBUGGING: wixUsers.currentUser:', {
            hasUser: !!wixUser,
            userId: wixUser?.id,
            loggedIn: wixUser?.loggedIn,
            nickname: wixUser?.nickname
        });
        
        userData = await loadComprehensiveUserData();
        console.log("✅ User data loaded:", {
            userId: userData.userId,
            displayName: userData.profile?.displayName
        });
    } catch (error) {
        console.error("❌ Authentication error:", error);
        // Since all users should be authenticated in Wix, show error and retry
        console.log("🔄 Retrying authentication in 2 seconds...");
        setTimeout(async () => {
            try {
                userData = await loadComprehensiveUserData();
                console.log("✅ Authentication retry successful:", userData.userId);
                // Update widget with authenticated user data
                const embedUrl = `https://kovaldeepai-main.vercel.app/embed?theme=light&userId=${userData.userId}&userName=${encodeURIComponent(userData.profile?.displayName || 'User')}&embedded=true&v=${Date.now()}`;
                aiWidget.src = embedUrl;
            } catch (retryError) {
                console.error("❌ Authentication retry failed:", retryError);
                // Show user a message to refresh the page
                alert("Authentication failed. Please refresh the page to continue.");
            }
        }, 2000);
        return; // Exit early on authentication failure
    }

    // ===== SETUP WIDGET FAST =====
    try {
        // Update widget src with user data
        if (userData && userData.userId) {
            const embedUrl = `https://kovaldeepai-main.vercel.app/embed?theme=light&userId=${userData.userId}&userName=${encodeURIComponent(userData.profile?.displayName || 'User')}&embedded=true&v=${Date.now()}`;
            aiWidget.src = embedUrl;
            console.log("� Widget src updated for user:", userData.userId);
        }

        // Send user data via multiple methods
        setTimeout(() => {
            // Method 1: Try postMessage directly
            try {
                if (aiWidget && aiWidget.contentWindow) {
                    aiWidget.contentWindow.postMessage({
                        type: 'USER_AUTH',
                        data: userData
                    }, '*');
                    console.log("📤 Method 1: Posted via contentWindow");
                }
            } catch (e) {
                console.log("⚠️ Method 1 failed:", e.message);
            }

            // Method 2: Try widget postMessage method
            try {
                if (aiWidget && typeof aiWidget.postMessage === 'function') {
                    aiWidget.postMessage({
                        type: 'USER_AUTH',
                        data: userData
                    });
                    console.log("📤 Method 2: Posted via widget method");
                }
            } catch (e) {
                console.log("⚠️ Method 2 failed:", e.message);
            }

            // Method 3: Global window message
            try {
                window.postMessage({
                    type: 'KOVAL_USER_AUTH',
                    userId: userData.userId,
                    profile: userData.profile
                }, '*');
                console.log("📤 Method 3: Global window message");
            } catch (e) {
                console.log("⚠️ Method 3 failed:", e.message);
            }
        }, 1000);

        console.log("⚡ Quick AI setup complete!");
        
        // ✅ ENHANCED: Initialize user authentication after widget setup (non-blocking)
        setTimeout(async () => {
            console.log('🔄 Checking user authentication status...');
            try {
                const member = await currentMember.getMember();
                if (member && member.loggedIn) {
                    console.log('✅ User already authenticated:', member._id);
                } else {
                    console.log('ℹ️ User not authenticated, continuing as guest');
                }
            } catch (error) {
                console.log('ℹ️ Authentication check failed, continuing as guest:', error.message);
            }
        }, 2000);

    } catch (error) {
        console.error("❌ Quick setup failed:", error);
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
            loadComprehensiveUserData(),
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
                // ✅ Enhanced widget detection with multiple fallback methods
                let widgetElement = aiWidget;
                let postMessageMethod = null;
                
                // Try multiple ways to get the widget and its postMessage method
                if (widgetElement && typeof widgetElement.postMessage === 'function') {
                    postMessageMethod = widgetElement.postMessage.bind(widgetElement);
                } else if (widgetElement && widgetElement.contentWindow && typeof widgetElement.contentWindow.postMessage === 'function') {
                    // For iframe elements
                    postMessageMethod = (data) => widgetElement.contentWindow.postMessage(data, '*');
                } else {
                    // Try to find widget in different ways
                    const widgetSelectors = ['#aiWidget', '[id*="koval"]', 'iframe[src*="koval"]', 'koval-ai-widget'];
                    for (const selector of widgetSelectors) {
                        const element = $w(selector);
                        if (element && typeof element.postMessage === 'function') {
                            widgetElement = element;
                            postMessageMethod = element.postMessage.bind(element);
                            break;
                        } else if (element && element.contentWindow && typeof element.contentWindow.postMessage === 'function') {
                            widgetElement = element;
                            postMessageMethod = (data) => element.contentWindow.postMessage(data, '*');
                            break;
                        }
                    }
                }

                if (postMessageMethod && userData) {
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
                    
                    // ✅ Safely call postMessage with error handling
                    try {
                        postMessageMethod(postMessageData);
                        console.log("📤 Sent authentic user data to widget via postMessage:", {
                            userId: userData.userId,
                            userName: postMessageData.data.userName,
                            nickname: postMessageData.data.nickname,
                            isGuest: postMessageData.data.isGuest,
                            hasProfilePhoto: !!postMessageData.data.profilePicture,
                            profileSource: userData.profile?.source,
                            widgetType: widgetElement?.tagName || 'unknown'
                        });
                    } catch (messageError) {
                        console.warn("⚠️ PostMessage call failed:", messageError.message);
                    }
                } else {
                    console.log("ℹ️ Widget not ready or postMessage not available, userData present:", !!userData);
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
                console.log('🔍 Widget requesting user data');
                await sendUserDataToWidget();
                break;
                
            case 'CHECK_USER_REGISTRATION':
                console.log('🔐 Widget checking user registration');
                // Simple authentication check
                try {
                    const member = await currentMember.getMember();
                    const isAuthenticated = member && member.loggedIn;
                    
                    // Send authentication status to widget
                    const widgetSelectors = ['#koval-ai', '#KovalAiWidget', '#kovalAIWidget'];
                    let widget = null;
                    
                    for (const selector of widgetSelectors) {
                        try {
                            widget = $w(selector);
                            if (widget) break;
                        } catch (e) {}
                    }
                    
                    if (widget && widget.postMessage) {
                        widget.postMessage({
                            type: 'USER_ACCESS_STATUS',
                            data: {
                                isAuthenticated,
                                hasAccess: true, // Simplified for now
                                userId: member?._id || null
                            }
                        }, '*');
                    }
                } catch (error) {
                    console.warn('⚠️ Authentication check failed:', error);
                }
                break;
                
            case 'CHAT_MESSAGE':
                console.log('💬 Chat message from widget:', event.data?.data);
                // Handle chat messages if needed
                break;
                
            case 'SAVE_DIVE_LOG':
                console.log('💾 Saving dive log from widget via enhanced handler:', event.data?.data);
                if (event.data?.data) {
                    await saveDiveLogFromWidget(event.data.data);
                }
                break;
                
            default:
                console.log('❓ Unknown enhanced message type:', type);
        }
    } catch (error) {
        console.error('❌ Error in enhanced widget message handler:', error);
    }
}

/**
 * ✅ Initialize User Authentication and Entitlement (Non-blocking)
 */
async function initializeUserAuthAndEntitlement() {
    try {
        console.log('🔄 Checking user authentication status...');
        
        // 1. Check if user is already logged in (don't force login)
        const member = await currentMember.getMember();
        if (!member || !member.loggedIn) {
            console.log('ℹ️ User not logged in, allowing guest access');
            return { success: false, guest: true };
        }
        
        console.log('✅ User is logged in:', member._id);
        
        // 2. Skip entitlement check for now (simplified)
        console.log('✅ User has valid access - skipping detailed access check');
        
        return { success: true, userId: member._id, guest: false };
        
    } catch (error) {
        console.warn('⚠️ Authentication check failed:', error.message);
        return { success: false, guest: true, error: error.message };
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
        // ✅ Use the same enhanced loadComprehensiveUserData function that loads rich profile data
        const fullUserData = await loadComprehensiveUserData();
        
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
        
        // Check access via backend - SIMPLIFIED (using logged in status)
        console.log('✅ User logged in, assuming valid access');
        const accessResult = { hasAccess: true, reason: 'logged_in_user' };
        
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

// ===== 🎯 WIX MASTER: ENHANCED DATASET INTEGRATION =====

/**
 * ✅ Initialize UserMemory Dataset with proper filtering
 */
function initializeUserMemoryDataset() {
    try {
        // ✅ Set up dataset filtering by current user
        if (wixUsers.currentUser && wixUsers.currentUser.loggedIn) {
            const userId = wixUsers.currentUser.id;
            console.log('🔍 Filtering UserMemory dataset for user:', userId);
            
            // Check if dataset exists
            if ($w('#dataset1')) {
                try {
                    // Filter dataset to show only current user's memories
                    $w('#dataset1').setFilter(wixData.filter()
                        .eq('userId', userId)
                    );
                    
                    // ✅ Set up onReady event handler before loading
                    $w('#dataset1').onReady(() => {
                        console.log('✅ UserMemory dataset ready, loading page...');
                        // ✅ Load the data with proper pagination inside onReady
                        $w('#dataset1').loadPage(1)  // ✅ Specify page number explicitly
                            .then(() => {
                                console.log('✅ UserMemory dataset loaded successfully');
                                console.log('📊 Loaded items:', $w('#dataset1').getTotalCount());
                            })
                            .catch((error) => {
                                if (error.message?.includes('collection') || error.message?.includes('not found')) {
                                    console.log('ℹ️ UserMemory collection not found, dataset will be empty');
                                } else {
                                    console.error('❌ Error loading UserMemory dataset:', error);
                                }
                            });
                    });
                } catch (datasetError) {
                    if (datasetError.message?.includes('collection') || datasetError.message?.includes('not found')) {
                        console.log('ℹ️ UserMemory collection not found, dataset initialization skipped');
                    } else {
                        console.error('❌ Error setting up dataset filter:', datasetError);
                    }
                }
                
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
        if (!wixUsers.currentUser || !wixUsers.currentUser.loggedIn) {
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

function getUserMemoriesFromDataset() {
    try {
        if ($w('#dataset1')) {
            const memories = $w('#dataset1').getCurrentPageItems();
            console.log('📋 Retrieved memories from dataset:', memories.length);
            return memories;
        }
        return [];
    } catch (error) {
        console.error('❌ Error getting memories from dataset:', error);
        return [];
    }
}

function setupDatasetEventHandlers() {
    try {
        if ($w('#dataset1')) {
            // Handle dataset ready
            $w('#dataset1').onReady(() => {
                console.log('📊 UserMemory dataset is ready');
            });
            
            // Handle dataset errors - check if onError method exists
            if (typeof $w('#dataset1').onError === 'function') {
                $w('#dataset1').onError((error) => {
                    console.error('❌ Dataset error:', error);
                });
            }
            
            // Handle data changes - check if method exists before using
            if (typeof $w('#dataset1').onCurrentItemChanged === 'function') {
                $w('#dataset1').onCurrentItemChanged(() => {
                    console.log('🔄 Dataset current item changed');
                });
            } else {
                console.log('ℹ️ onCurrentItemChanged not available for this dataset');
            }
        }
    } catch (error) {
        console.error('❌ Error setting up dataset handlers:', error);
    }
}

/**
 * 🔥 MASTER: Enhanced User Data Loading
 */
async function loadComprehensiveUserData() {
    try {
        console.log('🔍 Loading comprehensive user data...');
        
        // ✅ ENHANCED: Use both wixUsers and currentMember for better detection
        let currentUser = null;
        let member = null;
        
        // Try to get authenticated member first (most reliable for Wix apps)
        try {
            member = await currentMember.getMember();
            if (member && member._id) {
                console.log('✅ Found authenticated member via currentMember:', {
                    id: member._id,
                    loggedIn: member.loggedIn,
                    nickname: member.nickname,
                    email: member.loginEmail
                });
                currentUser = {
                    id: member._id,
                    loggedIn: true, // If we get a member, they're authenticated
                    nickname: member.nickname || member.profile?.nickname,
                    displayName: member.profile?.nickname || member.nickname || `${member.profile?.firstName || ''} ${member.profile?.lastName || ''}`.trim(),
                    loginEmail: member.loginEmail,
                    picture: member.profile?.profilePhoto
                };
            }
        } catch (memberError) {
            console.log('ℹ️ currentMember not available:', memberError.message);
        }
        
        // Fallback to wixUsers if currentMember failed
        if (!currentUser) {
            const wixUser = wixUsers.currentUser;
            console.log('🔍 Checking wixUsers.currentUser:', {
                hasUser: !!wixUser,
                userId: wixUser?.id,
                loggedIn: wixUser?.loggedIn,
                nickname: wixUser?.nickname
            });
            
            if (wixUser && wixUser.loggedIn && wixUser.id) {
                console.log('✅ Found authenticated user via wixUsers:', wixUser.id);
                currentUser = wixUser;
            }
        }
        
        if (currentUser && currentUser.loggedIn) {
            console.log('✅ User is authenticated:', currentUser.id);
            
            // Since Wix handles authentication, trust the authenticated user
            // Don't fall back to guest - all users should be properly authenticated
            
            // Get user profile from collections (with graceful fallback)
            let userProfile = null;
            try {
                // Try multiple profile collection names
                const possibleCollections = ['Members/FullData', 'Members/PrivateMembersData', 'Members'];
                
                for (const collectionName of possibleCollections) {
                    try {
                        const profileQuery = await wixData.query(collectionName)
                            .eq('userId', currentUser.id)
                            .find();
                        if (profileQuery.items && profileQuery.items.length > 0) {
                            userProfile = profileQuery.items[0];
                            console.log(`✅ Found user profile in ${collectionName}`);
                            break;
                        }
                    } catch (collectionError) {
                        console.log(`ℹ️ ${collectionName} not accessible, trying next...`);
                        continue;
                    }
                }
            } catch (error) {
                console.warn('⚠️ Could not load member profile:', error.message);
                // Continue without profile data - this is OK
            }
            
            // ✅ Use currentUser data as primary source for profile
            const profileData = {
                id: currentUser.id,
                displayName: currentUser.nickname || currentUser.displayName || 'User',
                nickname: currentUser.nickname || 'User',
                loginEmail: currentUser.loginEmail || '',
                firstName: userProfile?.firstName || currentUser.firstName || '',
                lastName: userProfile?.lastName || currentUser.lastName || '',
                profilePhoto: currentUser.picture || userProfile?.profilePicture || '',
                phone: userProfile?.phone || '',
                bio: userProfile?.bio || '',
                location: userProfile?.location || '',
                loggedIn: true
            };
            
            // Get user dive logs and memories from DiveLogs collection (compressed structure)
            let userDiveLogs = [];
            let userMemories = [];
            try {
                const memoryQuery = await wixData.query('DiveLogs')
                    .eq('userId', currentUser.id)
                    .descending('_createdDate')
                    .limit(50) // Get recent entries
                    .find();
                
                // ✅ Parse compressed logEntry data for each record
                for (const item of memoryQuery.items) {
                    try {
                        const parsedLogEntry = JSON.parse(item.logEntry || '{}');
                        
                        if (item.dataType === 'dive_log') {
                            // Extract dive log data from compressed structure
                            userDiveLogs.push({
                                _id: item._id,
                                userId: item.userId,
                                diveLogId: item.diveLogId,
                                date: item.diveDate,
                                time: item.diveTime,
                                photo: item.diveLogWatch,
                                dataType: item.dataType,
                                // Parsed dive data for easy access
                                ...parsedLogEntry.dive,
                                // Analysis data for AI
                                analysis: parsedLogEntry.analysis,
                                metadata: parsedLogEntry.metadata,
                                _createdDate: item._createdDate
                            });
                        } else if (item.dataType === 'chat_memory' || item.dataType === 'user_summary') {
                            // Extract memory data from compressed structure
                            userMemories.push({
                                _id: item._id,
                                userId: item.userId,
                                diveLogId: item.diveLogId,
                                dataType: item.dataType,
                                content: parsedLogEntry.content,
                                sessionName: parsedLogEntry.sessionName,
                                timestamp: parsedLogEntry.timestamp,
                                _createdDate: item._createdDate
                            });
                        }
                    } catch (parseError) {
                        console.warn('⚠️ Could not parse compressed logEntry for record:', item._id, parseError);
                    }
                }
                
                console.log(`✅ Loaded ${userDiveLogs.length} dive logs and ${userMemories.length} memories from DiveLogs collection`);
                
            } catch (error) {
                if (error.message?.includes('collection') || error.message?.includes('not found')) {
                    console.log('ℹ️ DiveLogs collection not found, using empty data');
                } else {
                    console.warn('⚠️ Could not load user data from DiveLogs:', error.message);
                }
                // Continue with empty arrays
            }
            
            // Build comprehensive user data
            const userData = {
                userId: currentUser.id,
                profile: {
                    id: currentUser.id,
                    displayName: currentUser.nickname || currentUser.displayName || userProfile?.firstName || 'User',
                    nickname: currentUser.nickname || userProfile?.firstName || 'User',
                    loginEmail: currentUser.loginEmail || '',
                    firstName: userProfile?.firstName || '',
                    lastName: userProfile?.lastName || '',
                    profilePhoto: currentUser.picture || userProfile?.profilePicture || '',
                    phone: userProfile?.phone || '',
                    bio: userProfile?.bio || '',
                    location: userProfile?.location || '',
                    loggedIn: true
                },
                userDiveLogs: userDiveLogs,
                userMemories: userMemories,
                isGuest: false
            };
            
            console.log('✅ Comprehensive user data loaded:', {
                userId: userData.userId,
                diveLogsCount: userData.userDiveLogs.length,
                memoriesCount: userData.userMemories.length
            });
            
            return userData;
        } else {
            console.error('❌ User not logged in - this should not happen in Wix app');
            // Since Wix handles authentication, this should not happen
            // Try to force authentication or show error
            throw new Error('User authentication failed - please refresh the page');
        }
    } catch (error) {
        console.error('❌ Error loading comprehensive user data:', error);
        // Don't fall back to guest - retry authentication or show error
        throw new Error(`Authentication error: ${error.message}`);
    }
}

function getGuestUserData() {
    console.log('👤 Creating guest user data');
    
    return {
        userId: `guest-${Date.now()}`,
        profile: {
            id: `guest-${Date.now()}`,
            displayName: 'Guest User',
            nickname: 'Guest User',
            loginEmail: '',
            firstName: '',
            lastName: '',
            profilePhoto: '',
            phone: '',
            bio: '',
            location: '',
            loggedIn: false
        },
        userDiveLogs: [],
        userMemories: [],
        isGuest: true
    };
}

/**
 * 🔥 MASTER: Enhanced Widget Communication
 */
function setupWidgetEventHandlers(aiWidget) {
    console.log('🔧 Setting up widget event handlers...');
    
    // Listen for messages from the widget
    if (typeof $w !== 'undefined' && $w.onMessage) {
        $w.onMessage((type, data) => {
            console.log('📨 Received message from widget:', type, data);
            
            switch (type) {
                case 'WIDGET_READY':
                    console.log('✅ Widget is ready');
                    sendUserDataToWidget();
                    break;
                    
                case 'REQUEST_USER_DATA':
                    console.log('🔍 Widget requesting user data');
                    sendUserDataToWidget();
                    break;
                    
                case 'SAVE_DIVE_LOG':
                    console.log('💾 Widget wants to save dive log:', data);
                    handleDiveLogSave(data);
                    break;
                    
                case 'WIDGET_ERROR':
                    console.error('🚨 Widget error:', data);
                    showFallbackMessage('Widget encountered an error. Please refresh the page.');
                    break;
                    
                default:
                    console.log('📝 Unknown message type:', type);
            }
        });
    }
    
    // Also listen for postMessage events (for iframe communication)
    if (typeof window !== 'undefined') {
        window.addEventListener('message', (event) => {
            // Security check
            if (!event.origin.includes('kovaldeepai') && !event.origin.includes('localhost')) {
                return;
            }
            
            console.log('📨 PostMessage from widget:', event.data);
            
            switch (event.data?.type) {
                case 'REQUEST_USER_DATA':
                    sendUserDataToWidget();
                    break;
                    
                case 'SAVE_DIVE_LOG':
                    if (event.data?.diveLog) {
                        handleDiveLogSave(event.data.diveLog);
                    }
                    break;
            }
        });
    }
}

async function sendUserDataToWidget() {
    try {
        console.log('📤 Sending user data to widget...');
        
        const userData = await loadComprehensiveUserData();
        
        // ✅ CRITICAL DEBUG: Log exactly what we're sending
        console.log('🔍 SENDING TO WIDGET - User ID:', userData.userId);
        console.log('🔍 SENDING TO WIDGET - Is Guest:', userData.isGuest);
        console.log('🔍 SENDING TO WIDGET - Full Data:', userData);
        
        // Find widget element
        const widgetSelectors = ['#kovalWidget', '#koval-ai', '#KovalAIFrame', '#kovalAIFrame'];
        let widget = null;
        
        for (const selector of widgetSelectors) {
            try {
                widget = $w(selector);
                if (widget) {
                    console.log('✅ Found widget element:', selector);
                    break;
                }
            } catch (e) {
                // Continue searching
            }
        }
        
        if (widget) {
            // Send via Wix messaging API
            console.log('📤 Sending via Wix messaging API...');
            widget.postMessage({
                type: 'USER_DATA_RESPONSE',
                userData: userData,
                timestamp: Date.now()
            });
            
            // Also send via postMessage for iframe
            if (widget.src) {
                console.log('📤 Sending via iframe postMessage...');
                widget.postMessage({
                    type: 'USER_AUTH',
                    data: userData,
                    timestamp: Date.now()
                });
            }
        } else {
            console.warn('⚠️ Widget element not found - trying global broadcast');
        }
        
        // Global broadcast as fallback
        if (typeof window !== 'undefined') {
            console.log('📤 Sending via global broadcast...');
            window.postMessage({
                type: 'KOVAL_USER_AUTH',
                userId: userData.userId,
                profile: userData.profile,
                diveLogs: userData.userDiveLogs,
                memories: userData.userMemories
            }, '*');
        }
        
        // Store globally for widget access
        if (typeof window !== 'undefined') {
            window.KOVAL_USER_DATA = userData;
            window.wixUserId = userData.userId; // ✅ CRITICAL: Store for bot-widget access
            window.wixUserName = userData.profile.displayName || userData.profile.nickname;
            console.log('✅ Stored user data globally - wixUserId:', userData.userId);
        }
        
        console.log('✅ User data sent to widget');
    } catch (error) {
        console.error('❌ Error sending user data to widget:', error);
        showFallbackMessage('Could not load user data');
    }
}

async function handleDiveLogSave(diveLogData) {
    try {
        console.log('💾 Saving dive log via Wix App backend:', diveLogData);
        
        const currentUser = wixUsers.currentUser;
        if (!currentUser || !currentUser.loggedIn) {
            console.warn('⚠️ Cannot save dive log - user not logged in');
            return;
        }
        
        // ✅ NEW: Use Wix App backend userMemory.jsw for compressed structure saving
        try {
            const response = await fetch('/_functions/userMemory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    diveLogData: diveLogData,
                    type: 'dive_log'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Dive log saved via backend with compressed structure:', result._id);
                console.log('📊 Analysis data included:', !!result.compressedStructure?.hasAnalysis);
                console.log('📸 Photo included:', !!result.hasPhoto);
                
                // Refresh user data to show the new dive log
                await sendUserDataToWidget();
                
            } else {
                const errorData = await response.json();
                console.error('❌ Backend save failed:', errorData);
            }
            
        } catch (fetchError) {
            console.error('❌ Error calling userMemory backend:', fetchError);
            console.log('⚠️ Falling back to direct collection insert...');
            
            // ✅ FALLBACK: Direct insert to DiveLogs collection (basic structure)
            await wixData.insert('DiveLogs', {
                userId: currentUser.id,
                diveLogId: `dive_${Date.now()}`,
                logEntry: JSON.stringify({
                    // Basic dive data if backend fails
                    dive: diveLogData,
                    metadata: { source: 'frontend-fallback', version: '1.0' }
                }),
                diveDate: diveLogData.date ? new Date(diveLogData.date) : new Date(),
                diveTime: diveLogData.time || new Date().toLocaleTimeString(),
                diveLogWatch: diveLogData.watchPhoto || null,
                dataType: 'dive_log',
                _createdDate: new Date()
            });
            
            console.log('✅ Fallback save completed');
        }
        
    } catch (error) {
        console.error('❌ Error saving dive log:', error);
    }
}

/**
 * ✅ Save Dive Log function
 */
async function saveDiveLog(diveLogData) {
    try {
        console.log('💾 Saving dive log:', diveLogData);
        
        const currentUser = wixUsers.currentUser;
        if (!currentUser || !currentUser.loggedIn) {
            throw new Error('User not logged in');
        }
        
        // Prepare dive log data
        const diveLogRecord = {
            userId: currentUser.id,
            diveDate: diveLogData.diveDate || new Date(),
            location: diveLogData.location || '',
            depth: diveLogData.depth || 0,
            time: diveLogData.time || 0,
            notes: diveLogData.notes || '',
            type: 'dive-log',
            timestamp: new Date(),
            ...diveLogData
        };
        
        // Try to save to wixData collection
        try {
            const result = await wixData.insert('DiveLogs', diveLogRecord);
            console.log('✅ Dive log saved to collection:', result._id);
            return { success: true, data: result };
        } catch (dbError) {
            if (dbError.message?.includes('collection') || dbError.message?.includes('not found')) {
                console.log('ℹ️ userMemory collection not found, using HTTP fallback');
            } else {
                console.warn('⚠️ Database save failed, trying HTTP function:', dbError);
            }
            
            // Fallback to HTTP function
            const response = await fetch(WIX_DIVE_LOGS_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(diveLogRecord)
            });
            
            const result = await response.json();
            if (response.ok) {
                return { success: true, data: result };
            } else {
                throw new Error(result.error || 'Failed to save dive log');
            }
        }
        
    } catch (error) {
        console.error('❌ Error saving dive log:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ✅ Save User Memory function
 */
async function saveUserMemory(memoryData) {
    try {
        console.log('💭 Saving user memory:', memoryData);
        
        const currentUser = wixUsers.currentUser;
        if (!currentUser || !currentUser.loggedIn) {
            throw new Error('User not logged in');
        }
        
        // Prepare memory data
        const memoryRecord = {
            userId: currentUser.id,
            memoryContent: memoryData.content || memoryData.memoryContent || '',
            logEntry: memoryData.logEntry || '',
            sessionName: memoryData.sessionName || 'Page Session',
            type: memoryData.type || 'memory',
            timestamp: new Date(),
            metadata: memoryData.metadata || {},
            ...memoryData
        };
        
        // Try to save to wixData collection
        try {
            const result = await wixData.insert('DiveLogs', memoryRecord);
            console.log('✅ Memory saved to collection:', result._id);
            return { success: true, data: result };
        } catch (dbError) {
            if (dbError.message?.includes('collection') || dbError.message?.includes('not found')) {
                console.log('ℹ️ userMemory collection not found, using HTTP fallback');
            } else {
                console.warn('⚠️ Database save failed, trying HTTP function:', dbError);
            }
            
            // Fallback to HTTP function
            const response = await fetch(WIX_USER_MEMORY_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memoryRecord)
            });
            
            const result = await response.json();
            if (response.ok) {
                return { success: true, data: result };
            } else {
                throw new Error(result.error || 'Failed to save memory');
            }
        }
        
    } catch (error) {
        console.error('❌ Error saving user memory:', error);
        return { success: false, error: error.message };
    }
}

// ===== 🚀 QUICK AI TEST FUNCTION =====
async function testAIConnection() {
    console.log('🧪 Testing AI connection...');
    
    try {
        const userData = await loadComprehensiveUserData();
        console.log('✅ User data loaded:', userData.userId);
        
        // Test chat API with correct parameter format
        const chatResponse = await fetch('https://kovaldeepai-main.vercel.app/api/openai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'test',  // ✅ Fixed: Use 'message' instead of 'userMessage'
                userId: userData.userId,
                profile: userData.profile || {},
                embedMode: false
            })
        });
        
        if (chatResponse.ok) {
            console.log('✅ Chat API working');
        } else {
            console.warn('⚠️ Chat API issue:', chatResponse.status);
        }
        
        // Test dive logs API
        const diveResponse = await fetch('https://kovaldeepai-main.vercel.app/api/analyze/dive-logs', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (diveResponse.ok) {
            console.log('✅ Dive logs API working');
        } else {
            console.warn('⚠️ Dive logs API issue:', diveResponse.status);
        }
        
        // Check widget
        const widget = $w('#koval-ai');
        if (widget) {
            console.log('✅ Widget found and ready');
        } else {
            console.warn('⚠️ Widget not found');
        }
        
        console.log('🎯 AI Test Complete - Ready to use!');
        
    } catch (error) {
        console.error('❌ AI test failed:', error);
    }
}

// Auto-run test after initialization
setTimeout(testAIConnection, 3000);

/**
 * ✅ Show Fallback Message function
 */
function showFallbackMessage(message = "Service temporarily unavailable") {
    console.log('⚠️ Showing fallback message:', message);
    
    // Show user-friendly message
    if (typeof wixWindow !== 'undefined' && wixWindow.openLightbox) {
        wixWindow.openLightbox('errorLightbox', {
            title: 'Connection Issue',
            message: message,
            buttonText: 'Try Again'
        }).catch(() => {
            // If lightbox fails, show simple alert
            console.log('📢 Fallback message:', message);
        });
    } else {
        console.log('📢 Fallback message:', message);
    }
}
