// ===== 🔥 SIMPLIFIED WIX PAGE - NEVER BREAKS DUE TO AUTH =====

// Required Wix imports
import wixData from 'wix-data';
import { currentMember } from 'wix-members-frontend';

// ===== MAIN PAGE INITIALIZATION =====

$w.onReady(function () {
    console.log("🚀 Koval AI Widget initialization starting...");

    // ===== FIND WIDGET =====
    var aiWidget = findWidget();
    if (!aiWidget) {
        console.error("❌ No AI widget found. Please check widget ID in Wix editor.");
        return;
    }
    
    console.log("✅ Widget found, initializing...");

    // ===== INITIALIZE WIDGET - NEVER FAILS =====
    initializeWidgetRobust(aiWidget);
});

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

// ===== SAVE DIVE LOG TO WIX COLLECTION =====
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
                
                // Try to save to Wix collection
                if (typeof wixData !== 'undefined' && wixData.save) {
                    wixData.save('DiveLogs', logToSave)
                        .then(function(result) {
                            console.log('✅ Dive log saved to Wix collection:', result._id);
                        })
                        .catch(function(error) {
                            console.log('ℹ️ Wix collection save failed, data logged locally:', error.message);
                        });
                } else {
                    console.log('ℹ️ Wix data not available, dive log logged locally');
                }
            });
            
    } catch (error) {
        console.log('ℹ️ Dive log save error:', error.message);
    }
}

console.log("✅ Simplified Wix page code loaded - Never breaks due to authentication!");
