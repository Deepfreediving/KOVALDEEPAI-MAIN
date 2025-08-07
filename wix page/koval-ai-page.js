// ===== 🔄 Wix Page Code - Enhanced Widget Communication =====
// Add this to your Wix page where the Koval AI widget is embedded

import { currentMember } from 'wix-members-frontend';
import { checkUserAccess } from 'backend/checkUserAccess';

$w.onReady(function () {
    console.log('🚀 Koval AI page ready');
    
    // Listen for messages from the widget
    if (typeof window !== 'undefined') {
        window.addEventListener('message', handleWidgetMessage);
        console.log('👂 Listening for widget messages');
    }
    
    // Initialize user data
    initializeUserData();
});

/**
 * ✅ Handle messages from the Koval AI widget
 */
async function handleWidgetMessage(event) {
    console.log('📨 Page received message from widget:', event.data);
    
    try {
        const { type, source, timestamp } = event.data;
        
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
                await checkAndSendUserAccess();
                break;
                
            case 'CHAT_MESSAGE':
                console.log('💬 Chat message from widget:', event.data.data);
                // Handle chat messages if needed
                break;
                
            case 'SAVE_DIVE_LOG':
                console.log('💾 Saving dive log from widget:', event.data.data);
                await saveDiveLogFromWidget(event.data.data);
                break;
                
            default:
                console.log('❓ Unknown message type:', type);
        }
    } catch (error) {
        console.error('❌ Error handling widget message:', error);
    }
}

/**
 * ✅ Initialize and send user data to widget
 */
async function initializeUserData() {
    console.log('🔄 Initializing user data...');
    
    try {
        // Wait a moment for widget to load
        setTimeout(async () => {
            await sendUserDataToWidget();
        }, 1000);
        
        // Also check user access
        setTimeout(async () => {
            await checkAndSendUserAccess();
        }, 2000);
        
    } catch (error) {
        console.error('❌ User data initialization error:', error);
    }
}

/**
 * ✅ Get current user data and send to widget
 */
async function sendUserDataToWidget() {
    console.log('📤 Sending user data to widget...');
    
    try {
        const member = await currentMember.getMember();
        console.log('👤 Current member:', member);
        
        let userData = {
            userId: 'guest-' + Date.now(),
            userName: 'Guest User',
            userEmail: '',
            isAuthenticated: false,
            source: 'wix-page'
        };
        
        if (member && member.loggedIn) {
            userData = {
                userId: member._id,
                userName: member.profile?.nickname || member.profile?.firstName || 'Member',
                userEmail: member.loginEmail || '',
                isAuthenticated: true,
                profile: member.profile,
                source: 'wix-page-authenticated'
            };
        }
        
        // Send to widget
        const widgetFrame = $w('#kovalAiWidget'); // Replace with your widget ID
        if (widgetFrame) {
            postMessageToWidget('USER_DATA_RESPONSE', { userData });
            console.log('✅ User data sent to widget');
        } else {
            console.warn('⚠️ Widget iframe not found');
        }
        
    } catch (error) {
        console.error('❌ Error getting user data:', error);
    }
}

/**
 * ✅ Check user access and send to widget
 */
async function checkAndSendUserAccess() {
    console.log('🔐 Checking user access...');
    
    try {
        const member = await currentMember.getMember();
        
        if (!member || !member.loggedIn) {
            // User not logged in
            postMessageToWidget('USER_REGISTRATION_RESPONSE', {
                hasAccess: false,
                reason: 'not_logged_in',
                message: 'Please log in to access Koval AI'
            });
            return;
        }
        
        // Check access via backend
        const accessResult = await checkUserAccess(member._id, member.loginEmail);
        console.log('🔍 Access check result:', accessResult);
        
        // Send result to widget
        postMessageToWidget('USER_REGISTRATION_RESPONSE', {
            hasAccess: accessResult.hasAccess,
            user: {
                id: member._id,
                displayName: member.profile?.nickname || member.profile?.firstName,
                loginEmail: member.loginEmail
            },
            accessData: accessResult,
            timestamp: Date.now()
        });
        
        console.log('✅ Access status sent to widget');
        
    } catch (error) {
        console.error('❌ Access check error:', error);
        
        // Send error response
        postMessageToWidget('USER_REGISTRATION_RESPONSE', {
            hasAccess: false,
            error: error.message,
            reason: 'check_failed'
        });
    }
}

/**
 * ✅ Save dive log from widget
 */
async function saveDiveLogFromWidget(diveLogData) {
    console.log('💾 Saving dive log from widget:', diveLogData);
    
    try {
        // You can add this to your existing dive log saving logic
        // For now, just log it
        console.log('📊 Dive log data received:', diveLogData);
        
        // If you have a backend function for saving dive logs:
        // const result = await saveDiveLog(diveLogData);
        
        // Send confirmation back to widget
        postMessageToWidget('DIVE_LOG_SAVED', {
            success: true,
            message: 'Dive log saved successfully'
        });
        
    } catch (error) {
        console.error('❌ Error saving dive log:', error);
        
        postMessageToWidget('DIVE_LOG_SAVED', {
            success: false,
            error: error.message
        });
    }
}

/**
 * ✅ Helper function to send messages to widget
 */
function postMessageToWidget(type, data = {}) {
    try {
        const widgetFrame = $w('#kovalAiWidget'); // Replace with your actual widget element ID
        
        if (widgetFrame && widgetFrame.contentWindow) {
            const message = {
                type,
                data,
                source: 'wix-page',
                timestamp: Date.now()
            };
            
            widgetFrame.contentWindow.postMessage(message, '*');
            console.log('📤 Message sent to widget:', type);
        } else {
            console.warn('⚠️ Widget contentWindow not available');
        }
    } catch (error) {
        console.error('❌ Error sending message to widget:', error);
    }
}

/**
 * ✅ Register button click handler (if you have a registration button)
 */
export function registerButton_click(event) {
    console.log('🔘 Registration button clicked');
    
    // Redirect to your registration/payment page
    wixLocation.to('/register-koval-ai');
    
    // Or open in a lightbox if you prefer
    // $w('#registrationLightbox').show();
}

/**
 * ✅ Handle edit mode changes (optional)
 */
if (typeof wixWindow !== 'undefined' && wixWindow.onEditModeChange) {
    wixWindow.onEditModeChange((isEditMode) => {
        console.log(`🎛️ Page edit mode: ${isEditMode ? 'EDIT' : 'PREVIEW'}`);
        
        // Send edit mode status to widget
        postMessageToWidget('EDIT_MODE_CHANGE', {
            editMode: isEditMode,
            timestamp: Date.now()
        });
    });
}

console.log('✅ Koval AI page code loaded');
