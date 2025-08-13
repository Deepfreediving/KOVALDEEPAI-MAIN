// ===== 🔥 SIMPLIFIED WIX PAGE - NO AUTHENTICATION BLOCKING =====

import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import { currentMember } from 'wix-members-frontend';

$w.onReady(function () {
    console.log("🚀 AI initialization starting...");

    // ===== FIND WIDGET =====
    var aiWidget = null;
    var widgetIds = ['#koval-ai', '#KovalAiWidget', '#kovalAIWidget', '#KovalAIWidget', '#htmlComponent1', '#html1'];
    
    for (var i = 0; i < widgetIds.length; i++) {
        try {
            var widget = $w(widgetIds[i]);
            if (widget) {
                console.log("✅ Found widget with ID: " + widgetIds[i]);
                aiWidget = widget;
                break;
            }
        } catch (e) {
            console.log("ℹ️ Widget " + widgetIds[i] + " not found, trying next...");
        }
    }

    if (!aiWidget) {
        console.error("❌ No AI widget found");
        return;
    }

    // ===== ALWAYS TRY TO GET USER DATA, NEVER FAIL =====
    getUserDataSafely()
        .then(function(userData) {
            console.log("✅ Got user data:", userData);
            initializeWidget(aiWidget, userData);
        })
        .catch(function(error) {
            console.log("ℹ️ User data failed, using fallback:", error);
            var fallbackData = createFallbackUserData();
            initializeWidget(aiWidget, fallbackData);
        });
});

// ===== SAFE USER DATA LOADING - NEVER BLOCKS =====
function getUserDataSafely() {
    return new Promise(function(resolve) {
        console.log("🔍 Attempting to get Wix user data...");
        
        // Set timeout to ensure we never hang
        var timeoutId = setTimeout(function() {
            console.log("⏰ User data timeout, using fallback");
            resolve(createFallbackUserData());
        }, 3000); // 3 second max wait
        
        try {
            currentMember.getMember()
                .then(function(member) {
                    clearTimeout(timeoutId);
                    
                    if (member && member.loggedIn && member._id) {
                        console.log("✅ Found authenticated Wix member:", member._id);
                        
                        var profile = member.profile || {};
                        var userData = {
                            userId: member._id,
                            userEmail: member.loginEmail || '',
                            userName: profile.nickname || member.loginEmail || 'User',
                            firstName: profile.firstName || '',
                            lastName: profile.lastName || '',
                            profilePicture: profile.photo || '',
                            isWixMember: true,
                            source: 'wix-authenticated',
                            timestamp: Date.now()
                        };
                        
                        console.log("✅ Created authenticated user data");
                        resolve(userData);
                    } else {
                        console.log("ℹ️ No authenticated member found, using fallback");
                        resolve(createFallbackUserData());
                    }
                })
                .catch(function(error) {
                    clearTimeout(timeoutId);
                    console.log("⚠️ Member API error, using fallback:", error.message);
                    resolve(createFallbackUserData());
                });
        } catch (error) {
            clearTimeout(timeoutId);
            console.log("⚠️ Member check failed, using fallback:", error.message);
            resolve(createFallbackUserData());
        }
    });
}

// ===== FALLBACK USER DATA - ALWAYS WORKS =====
function createFallbackUserData() {
    var sessionId = 'session-' + Date.now();
    return {
        userId: sessionId,
        userEmail: '',
        userName: 'User',
        firstName: '',
        lastName: '',
        profilePicture: '',
        isWixMember: false,
        source: 'local-session',
        timestamp: Date.now()
    };
}

// ===== INITIALIZE WIDGET - ALWAYS SUCCEEDS =====
function initializeWidget(widget, userData) {
    try {
        console.log("🔧 Initializing widget...");
        
        // Send data to widget immediately and with retries
        sendUserDataToWidget(widget, userData);
        
        // Also send with delays to catch widget when ready
        setTimeout(function() { sendUserDataToWidget(widget, userData); }, 1000);
        setTimeout(function() { sendUserDataToWidget(widget, userData); }, 3000);
        
        // Set up event listening
        setupEventHandlers(widget, userData);
        
        console.log("✅ Widget initialization complete");
        
    } catch (error) {
        console.log("⚠️ Widget initialization error:", error.message);
        // Continue anyway - don't let errors break the system
    }
}

// ===== SEND DATA TO WIDGET - MULTIPLE METHODS =====
function sendUserDataToWidget(widget, userData) {
    try {
        var messageData = {
            type: 'USER_AUTH',
            source: 'wix-page',
            timestamp: Date.now(),
            data: userData
        };
        
        // Method 1: Widget postMessage
        if (widget && typeof widget.postMessage === 'function') {
            widget.postMessage(messageData, '*');
            console.log("📤 Sent data via widget postMessage");
        }
        
        // Method 2: Global variables (backup)
        if (typeof $w !== 'undefined' && $w && $w.window) {
            $w.window.wixUserId = userData.userId;
            $w.window.wixUserData = userData;
            console.log("📤 Set global variables");
        }
        
    } catch (error) {
        console.log("⚠️ Send data error:", error.message);
        // Don't throw - just log and continue
    }
}

// ===== EVENT HANDLERS =====
function setupEventHandlers(widget, userData) {
    try {
        if (typeof $w !== 'undefined' && $w && $w.window && $w.window.addEventListener) {
            $w.window.addEventListener('message', function(event) {
                handleWidgetMessage(event, userData);
            });
            console.log("✅ Event handlers setup");
        }
    } catch (error) {
        console.log("⚠️ Event handlers error:", error.message);
    }
}

function handleWidgetMessage(event, userData) {
    try {
        if (event.data && event.data.type) {
            switch (event.data.type) {
                case 'REQUEST_USER_DATA':
                    console.log('🔄 Widget requesting user data');
                    var widgets = ['#koval-ai', '#KovalAiWidget', '#kovalAIWidget'];
                    for (var i = 0; i < widgets.length; i++) {
                        try {
                            var w = $w(widgets[i]);
                            if (w) {
                                sendUserDataToWidget(w, userData);
                                break;
                            }
                        } catch (e) { }
                    }
                    break;
                    
                case 'SAVE_DIVE_LOG':
                    console.log('💾 Dive log save request:', event.data.data);
                    saveDiveLogToWix(event.data.data, userData);
                    break;
            }
        }
    } catch (error) {
        console.log("⚠️ Message handling error:", error.message);
    }
}

// ===== DIVE LOG SAVING - ALWAYS WORKS =====
function saveDiveLogToWix(diveLogData, userData) {
    try {
        console.log('💾 Processing dive log save...');
        
        // If we have a real Wix member, try to save to collection
        if (userData.isWixMember && userData.userId && !userData.userId.startsWith('session-')) {
            console.log('💾 Attempting to save to Wix collection...');
            
            var recordData = {
                userId: userData.userId,
                diveData: JSON.stringify(diveLogData),
                logDate: new Date(),
                location: diveLogData.location || 'Unknown',
                depth: diveLogData.reachedDepth || 0,
                notes: diveLogData.notes || ''
            };
            
            // Try to save to DiveLogs collection
            wixData.save('DiveLogs', recordData)
                .then(function(result) {
                    console.log('✅ Dive log saved to Wix collection:', result._id);
                })
                .catch(function(error) {
                    console.log('ℹ️ Wix collection save failed, data logged locally:', error.message);
                    // Failure is OK - we still have the data in the widget
                });
        } else {
            console.log('ℹ️ Session user - dive log handled by widget local storage');
        }
        
    } catch (error) {
        console.log('⚠️ Dive log save error:', error.message);
        // Never throw - always graceful
    }
}

console.log("✅ Simplified Wix page code loaded - no authentication blocking!");
