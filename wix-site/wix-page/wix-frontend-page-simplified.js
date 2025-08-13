// ===== 🔥 WIX MASTER PAGE - KOVAL AI INTEGRATION V4.0 =====
// Updated with Session Management, Vercel Handshake & Buffering System
//
// 🚨 IMPORTANT: CORS Configuration Required
// Your Vercel app must allow requests from: https://www.deepfreediving.com
// Add this to your Vercel app's API routes or middleware:
// Access-Control-Allow-Origin: https://www.deepfreediving.com
//
// 🔧 Configuration Status:
// ✅ Vercel URL: https://kovaldeepai-main.vercel.app
// ✅ Session Management: Enabled
// ✅ Offline Buffering: Enabled
// ⚠️  CORS Setup: Required for full functionality

// Required Wix imports
import wixData from 'wix-data';
import wixStorage from 'wix-storage-frontend';
import { currentMember } from 'wix-members-frontend';

// ===== SESSION MANAGEMENT CONFIGURATION =====
const SESSION_CONFIG = {
    VERCEL_URL: 'https://kovaldeepai-main.vercel.app', // Updated with actual Vercel URL
    HANDSHAKE_TIMEOUT: 10000, // 10 seconds
    RETRY_MAX_ATTEMPTS: 3,
    SESSION_UPGRADE_TIMEOUT: 15000, // 15 seconds
};

// ===== GLOBAL STATE =====
let globalSessionData = {
    userId: null,
    wixMemberId: null,
    sessionId: null,
    isAuthenticated: false,
    connectionStatus: 'disconnected', // 'connected', 'offline', 'error'
    bufferData: [],
    widgetReady: false
};

// ===== MAIN PAGE INITIALIZATION =====
$w.onReady(function () {
    console.log("🚀 Koval AI Widget V4.0 initialization starting...");

    // ===== FIND WIDGET =====
    var aiWidget = findWidget();
    if (!aiWidget) {
        console.error("❌ No AI widget found. Please check widget ID in Wix editor.");
        return;
    }
    
    console.log("✅ Widget found, initializing session management...");

    // ===== INITIALIZE SESSION MANAGEMENT =====
    initializeSessionManagement()
        .then(function(sessionData) {
            console.log("✅ Session management initialized:", sessionData);
            // ===== INITIALIZE WIDGET WITH SESSION DATA =====
            initializeWidgetWithSession(aiWidget, sessionData);
        })
        .catch(function(error) {
            console.error("❌ Session initialization failed, falling back to basic mode:", error);
            // Fallback to basic initialization
            initializeWidgetRobust(aiWidget);
        });
});

// ===== SESSION MANAGEMENT FUNCTIONS =====

/**
 * Initialize session management with Vercel handshake
 */
function initializeSessionManagement() {
    return new Promise(function(resolve, reject) {
        console.log("🔄 Initializing session management...");
        
        // Generate or retrieve userId
        var userId = generateOrRetrieveUserId();
        var sessionId = generateSessionId();
        
        // Load any buffered data from previous sessions
        loadBufferedData();
        
        // Try to get Wix member data
        getWixMemberData()
            .then(function(memberData) {
                globalSessionData.userId = userId;
                globalSessionData.wixMemberId = memberData ? memberData.id : null;
                globalSessionData.sessionId = sessionId;
                globalSessionData.isAuthenticated = !!memberData;
                
                console.log("👤 User data prepared:", {
                    userId: userId,
                    wixMemberId: memberData ? "***" + memberData.id.slice(-4) : null,
                    isAuthenticated: globalSessionData.isAuthenticated
                });
                
                // Attempt Vercel handshake
                return performVercelHandshake(userId, memberData ? memberData.id : null, sessionId);
            })
            .then(function(handshakeResult) {
                if (handshakeResult.success) {
                    globalSessionData.connectionStatus = 'connected';
                    console.log("✅ Vercel handshake successful");
                } else {
                    globalSessionData.connectionStatus = 'offline';
                    console.log("⚠️ Vercel handshake failed, working in offline mode");
                }
                
                // If connection is successful and we have buffered data, try to flush it
                if (handshakeResult.success && globalSessionData.bufferData.length > 0) {
                    console.log('🔄 Connection restored, attempting to flush buffer...');
                    flushBuffer()
                        .then(function(flushResult) {
                            if (flushResult.success) {
                                console.log('✅ Buffer flush completed:', flushResult.processed, 'items processed');
                            } else {
                                console.log('⚠️ Buffer flush failed:', flushResult.error);
                            }
                        });
                }
                
                resolve(globalSessionData);
            })
            .catch(function(error) {
                console.error("❌ Session initialization error:", error);
                globalSessionData.connectionStatus = 'error';
                // Don't reject - continue in offline mode
                resolve(globalSessionData);
            });
    });
}

/**
 * Perform Vercel handshake
 */
function performVercelHandshake(userId, wixMemberId, sessionId) {
    return new Promise(function(resolve, reject) {
        console.log("🤝 Performing Vercel handshake...");
        
        var handshakeData = {
            userId: userId,
            wixMemberId: wixMemberId,
            sessionId: sessionId,
            timestamp: Date.now(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Wix-Browser'
        };
        
        // Create timeout
        var timeoutId = setTimeout(function() {
            console.warn("⏰ Vercel handshake timeout");
            resolve({ success: false, error: 'Timeout' });
        }, SESSION_CONFIG.HANDSHAKE_TIMEOUT);
        
        fetch(SESSION_CONFIG.VERCEL_URL + '/api/system/vercel-handshake', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(handshakeData)
        })
        .then(function(response) {
            clearTimeout(timeoutId);
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Handshake failed: ' + response.status);
            }
        })
        .then(function(result) {
            console.log("✅ Handshake response:", result);
            resolve({ success: true, data: result });
        })
        .catch(function(error) {
            clearTimeout(timeoutId);
            console.warn("⚠️ Handshake error:", error);
            
            // Check if it's a CORS error
            if (error.message && error.message.includes('Failed to fetch')) {
                console.log("🚫 CORS error detected - continuing in offline mode");
                console.log("ℹ️ Ensure your Vercel app has proper CORS configuration for: https://www.deepfreediving.com");
            }
            
            resolve({ success: false, error: error.message, type: 'cors-error' });
        });
    });
}

/**
 * Get Wix member data safely
 */
function getWixMemberData() {
    return new Promise(function(resolve, reject) {
        try {
            currentMember.getMember()
                .then(function(member) {
                    if (member) {
                        console.log("✅ Wix member found:", member.loginEmail);
                        resolve({
                            id: member._id,
                            email: member.loginEmail,
                            nickname: member.profile.nickname,
                            firstName: member.contactDetails.firstName,
                            lastName: member.contactDetails.lastName
                        });
                    } else {
                        console.log("ℹ️ No Wix member (guest user)");
                        resolve(null);
                    }
                })
                .catch(function(error) {
                    console.log("ℹ️ Member API error (guest mode):", error);
                    resolve(null);
                });
        } catch (error) {
            console.log("ℹ️ Member check failed (guest mode):", error);
            resolve(null);
        }
    });
}

/**
 * Generate or retrieve user ID
 */
function generateOrRetrieveUserId() {
    try {
        // Try to get from Wix storage first
        var storedId = wixStorage.session.getItem('kovalUserId');
        if (storedId && storedId.length > 10) {
            console.log("✅ Retrieved stored user ID");
            return storedId;
        }
    } catch (e) {
        console.log("ℹ️ Wix storage not available, using fallback");
    }
    
    // Generate new ID
    var userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 12);
    
    // Try to store it
    try {
        if (typeof wixStorage !== 'undefined' && wixStorage.session) {
            wixStorage.session.setItem('kovalUserId', userId);
        }
    } catch (e) {
        console.log("ℹ️ Could not store user ID");
    }
    
    console.log("✅ Generated new user ID");
    return userId;
}

/**
 * Load buffered data from storage
 */
function loadBufferedData() {
    try {
        if (typeof wixStorage !== 'undefined' && wixStorage.session) {
            var storedBuffer = wixStorage.session.getItem('kovalBuffer');
            if (storedBuffer) {
                var bufferData = JSON.parse(storedBuffer);
                if (Array.isArray(bufferData) && bufferData.length > 0) {
                    globalSessionData.bufferData = bufferData;
                    console.log('📦 Loaded buffered data:', bufferData.length, 'items');
                    return bufferData;
                }
            }
        }
    } catch (e) {
        console.log('ℹ️ Could not load buffered data:', e.message);
    }
    
    return [];
}

/**
 * Generate session ID
 */
function generateSessionId() {
    return 'wix_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Buffer data for offline sync
 */
function bufferData(operation, data) {
    var bufferedItem = {
        id: 'buffer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        operation: operation,
        data: data,
        timestamp: Date.now(),
        userId: globalSessionData.userId,
        wixMemberId: globalSessionData.wixMemberId
    };
    
    globalSessionData.bufferData.push(bufferedItem);
    console.log("💾 Data buffered:", operation, bufferedItem.id);
    
    // Try to store in Wix storage
    try {
        wixStorage.session.setItem('kovalSessionBuffer', JSON.stringify(globalSessionData.bufferData));
    } catch (e) {
        console.warn("⚠️ Cannot store buffer in Wix storage");
    }
}

/**
 * Session upgrade for premium features
 */
function upgradeSession(featureType) {
    return new Promise(function(resolve, reject) {
        if (globalSessionData.connectionStatus !== 'connected') {
            console.log('⚠️ Cannot upgrade session - not connected to Vercel');
            resolve({ success: false, error: 'Not connected' });
            return;
        }
        
        console.log('⬆️ Requesting session upgrade for:', featureType);
        
        var upgradeData = {
            userId: globalSessionData.userId,
            wixMemberId: globalSessionData.wixMemberId,
            sessionId: globalSessionData.sessionId,
            featureType: featureType,
            timestamp: Date.now()
        };
        
        fetch(SESSION_CONFIG.VERCEL_URL + '/api/system/upgrade-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(upgradeData)
        })
        .then(function(response) {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Upgrade failed: ' + response.status);
            }
        })
        .then(function(result) {
            console.log('✅ Session upgrade response:', result);
            resolve(result);
        })
        .catch(function(error) {
            console.warn('⚠️ Session upgrade error:', error);
            resolve({ success: false, error: error.message });
        });
    });
}

/**
 * Add item to offline buffer
 */
function addToBuffer(operation, data) {
    var bufferedItem = {
        id: 'buf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        operation: operation,
        data: data,
        timestamp: Date.now(),
        userId: globalSessionData.userId
    };
    
    globalSessionData.bufferData.push(bufferedItem);
    
    console.log('📦 Added to buffer:', operation, bufferedItem.id);
    
    // Try to save buffer to local storage if available
    try {
        if (typeof wixStorage !== 'undefined' && wixStorage.session) {
            wixStorage.session.setItem('kovalBuffer', JSON.stringify(globalSessionData.bufferData));
        }
    } catch (e) {
        console.log('ℹ️ Could not save buffer to storage:', e.message);
    }
    
    return bufferedItem.id;
}

/**
 * Flush buffered data when connection is restored
 */
function flushBuffer() {
    if (globalSessionData.bufferData.length === 0) {
        console.log('ℹ️ No buffered data to flush');
        return Promise.resolve({ success: true, processed: 0 });
    }
    
    if (globalSessionData.connectionStatus !== 'connected') {
        console.log('⚠️ Cannot flush buffer - not connected to Vercel');
        return Promise.resolve({ success: false, error: 'Not connected' });
    }
    
    console.log('🔄 Flushing buffer data...', globalSessionData.bufferData.length, 'items');
    
    var flushData = {
        userId: globalSessionData.userId,
        wixMemberId: globalSessionData.wixMemberId,
        sessionId: globalSessionData.sessionId,
        bufferData: globalSessionData.bufferData
    };
    
    return fetch(SESSION_CONFIG.VERCEL_URL + '/api/system/flush-buffer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(flushData)
    })
    .then(function(response) {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Buffer flush failed: ' + response.status);
        }
    })
    .then(function(result) {
        console.log('✅ Buffer flush completed:', result);
        
        // Clear the buffer on successful flush
        globalSessionData.bufferData = [];
        try {
            if (typeof wixStorage !== 'undefined' && wixStorage.session) {
                wixStorage.session.removeItem('kovalBuffer');
            }
        } catch (e) {
            console.log('ℹ️ Could not clear buffer from storage:', e.message);
        }
        
        return result;
    })
    .catch(function(error) {
        console.warn('⚠️ Buffer flush error:', error);
        return { success: false, error: error.message };
    });
}

/**
 * Enhanced widget initialization with session data
 */
function initializeWidgetWithSession(widget, sessionData) {
    console.log("🚀 Initializing widget with session management...");
    
    // Create enhanced iframe source with session data
    var baseUrl = SESSION_CONFIG.VERCEL_URL + '/embed';
    
    // Build URL parameters more safely
    var urlParams = [];
    urlParams.push('userId=' + encodeURIComponent(sessionData.userId || ''));
    urlParams.push('wixMemberId=' + encodeURIComponent(sessionData.wixMemberId || ''));
    urlParams.push('sessionId=' + encodeURIComponent(sessionData.sessionId || ''));
    urlParams.push('nickname=' + encodeURIComponent('Wix User'));
    urlParams.push('embedded=true');
    urlParams.push('theme=auto');
    urlParams.push('connectionStatus=' + encodeURIComponent(sessionData.connectionStatus || 'offline'));
    urlParams.push('isAuthenticated=' + encodeURIComponent(sessionData.isAuthenticated ? 'true' : 'false'));
    urlParams.push('source=wix-page');
    urlParams.push('v=' + Date.now()); // Cache busting
    
    var fullUrl = baseUrl + '?' + urlParams.join('&');
    
    var iframeHtml = 
        '<iframe ' +
        'src="' + fullUrl + '" ' +
        'style="width: 100%; height: 100%; border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);" ' +
        'allow="camera; microphone; clipboard-write" ' +
        'sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-top-navigation-by-user-activation">' +
        '</iframe>';
    
    try {
        widget.html = iframeHtml;
        globalSessionData.widgetReady = true;
        
        // Set up message handling for widget communication
        setupWidgetMessageHandling(sessionData);
        
        console.log("✅ Widget initialized successfully with session data");
        console.log("🔗 Widget URL:", fullUrl);
    } catch (error) {
        console.error("❌ Widget initialization failed:", error);
        // Fallback to basic initialization
        initializeWidgetRobust(widget);
    }
}

/**
 * Set up message handling between Wix and widget
 */
function setupWidgetMessageHandling(sessionData) {
    // Listen for messages from the widget
    if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('message', function(event) {
            // Verify origin - allow both production and development URLs
            var allowedOrigins = [
                'https://kovaldeepai-main.vercel.app',
                'http://localhost:3000',
                'https://www.deepfreediving.com'
            ];
            
            if (!allowedOrigins.some(function(origin) { return event.origin === origin; })) {
                console.log("🚫 Message from unauthorized origin:", event.origin);
                return;
            }
            
            console.log("📨 Received message from widget:", event.data);
            
            switch (event.data.type) {
                case 'EMBED_READY':
                    handleEmbedReady(event.data);
                    break;
                case 'USER_AUTH_REQUEST':
                    handleUserAuthRequest(event.data);
                    break;
                case 'SAVE_DIVE_LOG':
                    handleSaveDiveLog(event.data);
                    break;
                case 'BUFFER_DATA':
                    bufferData(event.data.operation, event.data.data);
                    break;
                default:
                    console.log("ℹ️ Unknown message type:", event.data.type);
            }
        });
    }
}

/**
 * Handle embed ready message
 */
function handleEmbedReady(data) {
    console.log("✅ Widget is ready, sending initial data...");
    
    // Send user data to widget
    sendMessageToWidget('USER_DATA_INIT', {
        userId: globalSessionData.userId,
        wixMemberId: globalSessionData.wixMemberId,
        sessionId: globalSessionData.sessionId,
        isAuthenticated: globalSessionData.isAuthenticated,
        connectionStatus: globalSessionData.connectionStatus
    });
}

/**
 * Handle user authentication request
 */
function handleUserAuthRequest(data) {
    console.log("👤 Widget requesting user authentication...");
    
    // If we have fresh member data, send it
    getWixMemberData()
        .then(function(memberData) {
            if (memberData && memberData.id !== globalSessionData.wixMemberId) {
                // User has authenticated, upgrade session
                console.log("⬆️ User authenticated, upgrading session...");
                
                globalSessionData.wixMemberId = memberData.id;
                globalSessionData.isAuthenticated = true;
                
                sendMessageToWidget('USER_AUTH', {
                    userId: globalSessionData.userId,
                    wixMemberId: memberData.id,
                    userName: memberData.nickname || memberData.firstName,
                    userEmail: memberData.email,
                    isWixMember: true,
                    source: 'wix-member-upgrade'
                });
            } else {
                // Send current session data
                sendMessageToWidget('USER_AUTH', {
                    userId: globalSessionData.userId,
                    wixMemberId: globalSessionData.wixMemberId,
                    userName: 'Wix User',
                    isWixMember: !!globalSessionData.wixMemberId,
                    source: 'wix-session'
                });
            }
        });
}

/**
 * Handle dive log save request
 */
function handleSaveDiveLog(data) {
    console.log("💾 Widget requesting dive log save...");
    
    if (globalSessionData.connectionStatus !== 'connected') {
        // Buffer the data for later sync
        bufferData('saveDiveLog', data.data);
        
        sendMessageToWidget('SAVE_DIVE_LOG_RESPONSE', {
            success: true,
            buffered: true,
            message: 'Dive log buffered for sync when online'
        });
    } else {
        // Try to save directly to Wix collections
        saveDiveLogToWix(data.data)
            .then(function(result) {
                sendMessageToWidget('SAVE_DIVE_LOG_RESPONSE', {
                    success: true,
                    buffered: false,
                    data: result,
                    message: 'Dive log saved to Wix successfully'
                });
            })
            .catch(function(error) {
                console.error("❌ Wix save failed, buffering:", error);
                bufferData('saveDiveLog', data.data);
                
                sendMessageToWidget('SAVE_DIVE_LOG_RESPONSE', {
                    success: true,
                    buffered: true,
                    message: 'Saved locally, will sync to Wix when possible'
                });
            });
    }
}

/**
 * Send message to widget
 */
function sendMessageToWidget(type, data) {
    if (globalSessionData.widgetReady) {
        var message = {
            type: type,
            data: data,
            timestamp: Date.now(),
            source: 'wix-page'
        };
        
        console.log("📤 Sending message to widget:", message);
        
        // Post message to iframe
        try {
            var iframe = document.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(message, SESSION_CONFIG.VERCEL_URL);
            }
        } catch (error) {
            console.warn("⚠️ Could not send message to widget:", error);
        }
    }
}

// ===== ROBUST WIDGET FINDING =====
function findWidget() {
    var widgetIds = [
        '#koval-ai',        // Primary widget ID
        '#KovalAiWidget',   // Alternative casing
        '#kovalAIWidget',   // Mixed casing
        '#KovalAIWidget',   // All caps AI
        '#htmlComponent1',  // Generic HTML component
        '#html1'            // Simple HTML element
    ];
    
    for (var i = 0; i < widgetIds.length; i++) {
        try {
            var widget = $w(widgetIds[i]);
            if (widget) {
                console.log("✅ Found widget with ID: " + widgetIds[i]);
                return widget;
            }
        } catch (e) {
            console.log("ℹ️ Widget " + widgetIds[i] + " not found, trying next...");
        }
    }
    return null;
}

// ===== ROBUST WIDGET INITIALIZATION - NEVER BREAKS =====
function initializeWidgetRobust(widget) {
    console.log("🔧 Initializing widget robustly...");
    
    // ===== CREATE WIDGET IFRAME FIRST =====
    createWidgetIframe(widget);
    
    // ===== GET USER DATA WITH FALLBACK =====
    getUserDataWithFallback()
        .then(function(userData) {
            console.log("📋 User data ready:", userData);
            sendUserDataToWidget(widget, userData);
            setupMessageHandlers(widget);
        })
        .catch(function(error) {
            console.warn("⚠️ User data failed, using fallback:", error);
            var fallbackData = createFallbackUserData();
            sendUserDataToWidget(widget, fallbackData);
            setupMessageHandlers(widget);
        });
}

// ===== CREATE WIDGET IFRAME FOR FALLBACK MODE =====
function createWidgetIframe(widget) {
    console.log("🖼️ Creating widget iframe...");
    
    // Create basic iframe URL for fallback mode
    var baseUrl = SESSION_CONFIG.VERCEL_URL + '/embed';
    var urlParams = [];
    urlParams.push('embedded=true');
    urlParams.push('theme=auto');
    urlParams.push('source=wix-page');
    urlParams.push('fallback=true');
    urlParams.push('v=' + Date.now()); // Cache busting
    
    var fullUrl = baseUrl + '?' + urlParams.join('&');
    
    var iframeHtml = 
        '<iframe ' +
        'src="' + fullUrl + '" ' +
        'style="width: 100%; height: 100%; border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);" ' +
        'allow="camera; microphone; clipboard-write" ' +
        'sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-top-navigation-by-user-activation">' +
        '</iframe>';
    
    try {
        widget.html = iframeHtml;
        console.log("✅ Widget iframe created successfully");
        console.log("🔗 Widget URL:", fullUrl);
    } catch (error) {
        console.error("❌ Widget iframe creation failed:", error);
    }
}

// ===== GET USER DATA WITH ROBUST FALLBACK =====
function getUserDataWithFallback() {
    return new Promise(function(resolve) {
        console.log("🔍 Attempting to get user data...");
        
        // Try to get member data, but don't fail if it doesn't work
        try {
            currentMember.getMember()
                .then(function(member) {
                    console.log("📋 Member API response:", member);
                    
                    if (member && member.loggedIn && member._id) {
                        // SUCCESS: Create authenticated user data
                        var profile = member.profile || {};
                        var authenticatedData = {
                            userId: member._id,
                            userEmail: member.loginEmail || '',
                            userName: profile.nickname || member.loginEmail || 'User',
                            firstName: profile.firstName || '',
                            lastName: profile.lastName || '',
                            profilePicture: profile.photo || '',
                            isGuest: false,
                            source: 'wix-authenticated'
                        };
                        
                        console.log("✅ Authenticated user data created:", {
                            userId: authenticatedData.userId,
                            userName: authenticatedData.userName,
                            source: authenticatedData.source
                        });
                        
                        resolve(authenticatedData);
                    } else {
                        // NO AUTHENTICATED USER: Use fallback
                        console.log("ℹ️ No authenticated user, using fallback");
                        resolve(createFallbackUserData());
                    }
                })
                .catch(function(memberError) {
                    console.log("ℹ️ Member API error, using fallback:", memberError.message);
                    resolve(createFallbackUserData());
                });
        } catch (apiError) {
            console.log("ℹ️ Member API not available, using fallback:", apiError.message);
            resolve(createFallbackUserData());
        }
    });
}

// ===== CREATE FALLBACK USER DATA =====
function createFallbackUserData() {
    var fallbackId = 'session-' + Date.now();
    return {
        userId: fallbackId,
        userEmail: '',
        userName: 'Freediver',
        firstName: '',
        lastName: '',
        profilePicture: '',
        isGuest: true,
        source: 'fallback-session'
    };
}

// ===== SEND USER DATA TO WIDGET =====
function sendUserDataToWidget(widget, userData) {
    console.log("📤 Sending user data to widget...");
    
    var messageData = {
        type: 'USER_AUTH',
        source: 'wix-page',
        timestamp: Date.now(),
        data: userData
    };
    
    // Method 1: Direct widget postMessage
    try {
        if (widget && typeof widget.postMessage === 'function') {
            widget.postMessage(messageData, '*');
            console.log("✅ Sent data via widget.postMessage");
        }
    } catch (e) {
        console.log("ℹ️ Widget postMessage not available");
    }
    
    // Method 2: Set global variables for widget detection
    try {
        if (typeof $w !== 'undefined' && $w && $w.window) {
            $w.window.wixUserId = userData.userId;
            $w.window.wixUserName = userData.userName;
            $w.window.wixUserEmail = userData.userEmail;
            $w.window.KOVAL_USER_DATA = userData;
            console.log("✅ Set global variables");
        }
    } catch (e) {
        console.log("ℹ️ Global variables not available");
    }
    
    // Method 3: Retry sending data multiple times
    setTimeout(function() { sendDataRetry(widget, messageData); }, 1000);
    setTimeout(function() { sendDataRetry(widget, messageData); }, 3000);
    setTimeout(function() { sendDataRetry(widget, messageData); }, 5000);
}

function sendDataRetry(widget, messageData) {
    try {
        if (widget && typeof widget.postMessage === 'function') {
            widget.postMessage(messageData, '*');
            console.log("🔄 Retry: Sent data to widget");
        }
    } catch (e) {
        // Silent retry
    }
}

// ===== SETUP MESSAGE HANDLERS =====
function setupMessageHandlers(widget) {
    try {
        if (typeof $w !== 'undefined' && $w && $w.window && $w.window.addEventListener) {
            $w.window.addEventListener('message', function(event) {
                handleWidgetMessage(event, widget);
            });
            console.log("✅ Message handlers setup complete");
        }
    } catch (error) {
        console.log("ℹ️ Message handlers not available:", error.message);
    }
}

// ===== HANDLE MESSAGES FROM WIDGET =====
function handleWidgetMessage(event, widget) {
    try {
        if (!event.data || !event.data.type) return;
        
        console.log('📨 Received message from widget:', event.data.type);
        
        switch (event.data.type) {
            case 'REQUEST_USER_DATA':
                console.log('🔍 Widget requesting user data');
                getUserDataWithFallback()
                    .then(function(userData) {
                        sendUserDataToWidget(widget, userData);
                    });
                break;
                
            case 'SAVE_DIVE_LOG':
                console.log('💾 Saving dive log from widget');
                saveDiveLogToWix(event.data.data);
                break;
                
            case 'WIDGET_READY':
                console.log('🎉 Widget is ready, sending user data');
                getUserDataWithFallback()
                    .then(function(userData) {
                        sendUserDataToWidget(widget, userData);
                    });
                break;
                
            default:
                console.log('📩 Unknown message type:', event.data.type);
        }
    } catch (error) {
        console.log('ℹ️ Message handling error:', error.message);
    }
}

/**
 * Test CORS connectivity (for debugging)
 * Call this from browser console: testCORSConnection()
 */
function testCORSConnection() {
    console.log('🧪 Testing CORS connectivity to Vercel...');
    
    fetch(SESSION_CONFIG.VERCEL_URL + '/api/system/vercel-handshake', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: 'test-user',
            wixMemberId: null,
            sessionId: 'test-session',
            timestamp: Date.now(),
            userAgent: 'Test-Browser'
        })
    })
    .then(function(response) {
        console.log('✅ CORS Test - Response status:', response.status);
        return response.json();
    })
    .then(function(result) {
        console.log('✅ CORS Test - Success! Response:', result);
        console.log('🎉 CORS is now working - refresh page to enable full functionality');
    })
    .catch(function(error) {
        console.error('❌ CORS Test - Still failing:', error);
        console.log('ℹ️ Check your Vercel API endpoint CORS configuration');
    });
}

// Make test function globally available
if (typeof window !== 'undefined') {
    window.testCORSConnection = testCORSConnection;
}

// ===== SAVE DIVE LOG TO WIX COLLECTION WITH BUFFERING =====
function saveDiveLogToWix(diveLogData) {
    try {
        console.log('💾 Processing dive log save:', diveLogData);
        
        if (!diveLogData) {
            console.log('⚠️ No dive log data provided');
            return;
        }
        
        // Get current user data for the save
        getUserDataWithFallback()
            .then(function(userData) {
                var logToSave = {
                    userId: userData.userId,
                    userName: userData.userName,
                    diveData: JSON.stringify(diveLogData),
                    timestamp: new Date(),
                    source: 'koval-ai-widget'
                };
                
                // If connected to Vercel, try to save via API first
                if (globalSessionData.connectionStatus === 'connected') {
                    console.log('🌐 Saving dive log via Vercel API...');
                    
                    fetch(SESSION_CONFIG.VERCEL_URL + '/api/analyze/save-dive-log', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(logToSave)
                    })
                    .then(function(response) {
                        if (response.ok) {
                            console.log('✅ Dive log saved via Vercel API');
                            return response.json();
                        } else {
                            throw new Error('Vercel API save failed: ' + response.status);
                        }
                    })
                    .catch(function(error) {
                        console.log('⚠️ Vercel API save failed, buffering data:', error.message);
                        addToBuffer('saveDiveLog', logToSave);
                        // Fallback to local Wix save
                        tryWixCollectionSave(logToSave);
                    });
                } else {
                    console.log('📦 No Vercel connection, buffering dive log and trying Wix save...');
                    addToBuffer('saveDiveLog', logToSave);
                    tryWixCollectionSave(logToSave);
                }
            });
            
    } catch (error) {
        console.log('ℹ️ Dive log save error:', error.message);
    }
}

// ===== TRY WIX COLLECTION SAVE AS FALLBACK =====
function tryWixCollectionSave(logToSave) {
    try {
        if (typeof wixData !== 'undefined' && wixData.save) {
            wixData.save('DiveLogs', logToSave)
                .then(function(result) {
                    console.log('✅ Dive log saved to Wix collection:', result._id);
                })
                .catch(function(error) {
                    console.log('ℹ️ Wix collection save failed:', error.message);
                });
        } else {
            console.log('ℹ️ Wix data not available');
        }
    } catch (error) {
        console.log('ℹ️ Wix collection save error:', error.message);
    }
}

console.log("✅ Simplified Wix page code loaded - Never breaks due to authentication!");
