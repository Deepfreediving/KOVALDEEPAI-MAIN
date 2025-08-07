// ===== 🎯 UPDATED WIX FRONTEND CODE - DEPLOY THIS TO YOUR WIX PAGE =====
// This fixes the backend connection issues

import wixUsers from 'wix-users';
import wixData from 'wix-data';

// ✅ CORRECTED API ENDPOINTS TO MATCH YOUR DEPLOYED BACKEND FUNCTIONS
const BACKEND_ENDPOINTS = {
    WIX_CONNECTION: "/_functions/wixConnection",  // ✅ Your http-wixConnection.jsw
    CHAT: "/_functions/chat",  // ✅ Your http-chat.jsw
    USER_MEMORY: "/_functions/userMemory",  // ✅ Your http-userMemory.jsw
    DIVE_LOGS: "/_functions/diveLogs",  // ✅ Your http-diveLogs.jsw
    LOAD_MEMORIES: "/_functions/loadMemories",  // ✅ Your http-loadMemories.jsw
    GET_USER_MEMORY: "/_functions/getUserMemory",  // ✅ Your http-getUserMemory.jsw
    SAVE_TO_USER_MEMORY: "/_functions/saveToUserMemory",  // ✅ Your http-saveToUserMemory.jsw
    GET_USER_PROFILE: "/_functions/getUserProfile",  // ✅ Your http-getUserProfile.jsw
    UTILS: "/_functions/utils",  // ✅ Your http-utils.jsw
    TEST_CONNECTION: "/_functions/testConnection"  // ✅ Your http-testConnection.jsw
};

const DEBUG_MODE = true;

$w.onReady(async function () {
    console.log("🚀 Koval AI initializing...");
    console.log("🔧 Cache buster: " + Date.now());
    
    // ✅ Test backend connection first
    await testBackendConnection();
    
    // ✅ Find and setup the widget
    const widget = findKovalWidget();
    if (widget) {
        await initializeKovalAI(widget);
    } else {
        console.error("❌ Koval AI widget not found");
        await loadWidgetDirectly();
    }
});

/**
 * ✅ TEST BACKEND CONNECTION WITH IMPROVED ERROR HANDLING
 */
async function testBackendConnection() {
    try {
        console.log("🔍 Testing backend connection...");
        
        const response = await fetch(BACKEND_ENDPOINTS.WIX_CONNECTION, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("🔗 Backend connection status:", data);
            return true;
        } else {
            console.warn("⚠️ Response not OK:", response.status);
            
            // Try alternative test
            return await testAlternativeConnection();
        }
    } catch (error) {
        console.error("❌ Backend connection test failed:", error);
        return await testAlternativeConnection();
    }
}

/**
 * ✅ TEST ALTERNATIVE CONNECTION METHOD
 */
async function testAlternativeConnection() {
    try {
        console.log("🔄 Trying alternative connection test...");
        
        const response = await fetch(BACKEND_ENDPOINTS.TEST_CONNECTION, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            console.log("✅ Alternative connection successful");
            return true;
        } else {
            console.warn("⚠️ Alternative connection also failed:", response.status);
            return false;
        }
    } catch (error) {
        console.error("❌ Alternative connection failed:", error);
        return false;
    }
}

/**
 * ✅ FIND KOVAL AI WIDGET
 */
function findKovalWidget() {
    const possibleIds = ['#koval-ai', '#KovalAiWidget', '#htmlComponent1', '#html1'];
    
    for (const id of possibleIds) {
        try {
            const element = $w(id);
            if (element) {
                console.log(`✅ Found Koval AI widget with ID: ${id}`);
                console.log(`🎯 Widget type: ${element.type}`);
                return element;
            }
        } catch (e) {
            // Element not found, continue
        }
    }
    
    return null;
}

/**
 * ✅ INITIALIZE KOVAL AI WIDGET
 */
async function initializeKovalAI(widget) {
    try {
        console.log("🚀 Successfully connected to Koval AI widget:", widget.id);
        console.log("📋 Widget properties:", Object.keys(widget));
        
        // ✅ Load user data
        const userData = await loadUserData();
        console.log("👤 User data loaded:", userData);
        
        // ✅ Setup widget with user data
        await setupWidget(widget, userData);
        
        console.log("✅ Koval AI initialization complete");
        
    } catch (error) {
        console.error("❌ Failed to initialize Koval AI:", error);
    }
}

/**
 * ✅ LOAD USER DATA WITH BETTER ERROR HANDLING
 */
async function loadUserData() {
    try {
        const user = wixUsers.currentUser;
        const userId = user.id || `wix-guest-${Date.now()}`;
        
        console.log("👤 Loading data for user:", user.loggedIn ? user.id : 'guest', `(${userId})`);
        
        // Get user profile if logged in
        let profile = {};
        let userMemories = [];
        let userDiveLogs = [];
        
        if (user.loggedIn) {
            try {
                // Try to get user profile
                const profileResponse = await fetch(BACKEND_ENDPOINTS.GET_USER_PROFILE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id })
                });
                
                if (profileResponse.ok) {
                    profile = await profileResponse.json();
                }
            } catch (profileError) {
                console.warn("⚠️ Could not load user profile:", profileError);
            }
            
            try {
                // Try to get user memories
                const memoriesResponse = await fetch(BACKEND_ENDPOINTS.GET_USER_MEMORY, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id })
                });
                
                if (memoriesResponse.ok) {
                    const memoriesData = await memoriesResponse.json();
                    userMemories = memoriesData.memories || [];
                }
            } catch (memoriesError) {
                console.warn("⚠️ Could not load user memories:", memoriesError);
            }
        }
        
        const userData = {
            userId: userId,
            isLoggedIn: user.loggedIn,
            isGuest: !user.loggedIn,
            email: user.loggedIn ? (user.email || profile.email || '') : '',
            displayName: profile.displayName || profile.nickname || 'User',
            profile: profile,
            memories: userMemories,
            userMemories: userMemories,
            userDiveLogs: userDiveLogs,
            totalDives: userDiveLogs.length,
            timestamp: new Date().toISOString()
        };
        
        console.log("📊 Loaded user data:", userData);
        return userData;
        
    } catch (error) {
        console.error("❌ Failed to load user data:", error);
        return {
            userId: `wix-guest-${Date.now()}`,
            isLoggedIn: false,
            isGuest: true,
            email: '',
            displayName: 'Guest User',
            profile: {},
            memories: [],
            userMemories: [],
            userDiveLogs: [],
            totalDives: 0,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * ✅ SETUP WIDGET WITH IMPROVED COMMUNICATION
 */
async function setupWidget(widget, userData) {
    try {
        // Method 1: Try to load as iframe embed
        if (widget.type === 'CustomElementComponent' || widget.type === 'HtmlComponent') {
            await loadChatInterface(widget, userData);
        }
        // Method 2: Try custom properties
        else {
            try {
                await widget.setProperty('userData', userData);
                await widget.setProperty('initialized', true);
            } catch (propError) {
                console.warn("⚠️ Could not set widget properties, trying alternative approach");
                await loadChatInterface(widget, userData);
            }
        }
        
        // ✅ Setup message listener
        setupMessageListener(widget, userData);
        
        // ✅ Send initial data to widget
        try {
            await sendInitialDataToWidget(userData);
        } catch (sendError) {
            console.error("❌ Failed to send initial data to widget:", sendError);
        }
        
    } catch (error) {
        console.error("❌ Failed to setup widget:", error);
    }
}

/**
 * ✅ LOAD CHAT INTERFACE WITH CACHE BUSTING
 */
async function loadChatInterface(widget, userData) {
    try {
        console.log("🔄 Loading chat interface...");
        console.log("📦 Using container:", widget.id);
        
        // Create embed URL with user data and cache busting
        const embedUrl = new URL('https://kovaldeepai-main.vercel.app/embed');
        embedUrl.searchParams.set('theme', 'light');
        embedUrl.searchParams.set('userId', userData.userId);
        embedUrl.searchParams.set('userName', userData.displayName);
        embedUrl.searchParams.set('embedded', 'true');
        embedUrl.searchParams.set('v', Date.now().toString());
        
        console.log("🔗 Embed URL:", embedUrl.toString());
        
        // Set iframe content with proper permissions
        const iframeHtml = `
            <iframe 
                src="${embedUrl.toString()}"
                style="width: 100%; height: 100%; border: none; background: white;"
                allow="microphone; camera; geolocation"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                title="Koval AI Assistant">
            </iframe>
        `;
        
        if (widget.html !== undefined) {
            widget.html = iframeHtml;
        } else if (widget.src !== undefined) {
            widget.src = embedUrl.toString();
        }
        
        console.log("✅ Chat interface loaded");
        
    } catch (error) {
        console.error("❌ Failed to load chat interface:", error);
    }
}

/**
 * ✅ SETUP MESSAGE LISTENER WITH BETTER ERROR HANDLING
 */
function setupMessageListener(widget, userData) {
    if (widget.onMessage) {
        widget.onMessage(async (event) => {
            console.log("📥 Received message from widget:", event);
            await handleWidgetMessage(event);
        });
    } else {
        console.log("⚠️ Widget does not support onMessage - using global listener");
        
        // Fallback: Global message listener
        window.addEventListener('message', async (event) => {
            if (event.origin === 'https://kovaldeepai-main.vercel.app') {
                console.log("📥 Received global message:", event.data);
                await handleWidgetMessage(event.data);
            }
        });
    }
}

/**
 * ✅ SEND INITIAL DATA TO WIDGET
 */
async function sendInitialDataToWidget(userData) {
    try {
        // Wait a bit for iframe to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const iframe = document.querySelector('iframe[title="Koval AI Assistant"]');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'USER_DATA',
                payload: userData
            }, 'https://kovaldeepai-main.vercel.app');
            
            console.log("📤 Sent initial user data to widget");
        }
    } catch (error) {
        console.error("❌ Failed to send initial data:", error);
    }
}

/**
 * ✅ HANDLE WIDGET MESSAGES WITH BACKEND INTEGRATION
 */
async function handleWidgetMessage(data) {
    try {
        if (data.type === 'SAVE_DIVE_LOG') {
            console.log("💾 Saving dive log:", data.payload);
            await saveDiveLog(data.payload);
        } else if (data.type === 'USER_AUTH') {
            console.log("🔐 User authentication request");
            const userData = await loadUserData();
            // Send response back to widget
            await sendInitialDataToWidget(userData);
        } else if (data.type === 'CHAT_MESSAGE') {
            console.log("💬 Processing chat message:", data.payload);
            await handleChatMessage(data.payload);
        }
    } catch (error) {
        console.error("❌ Failed to handle widget message:", error);
    }
}

/**
 * ✅ SAVE DIVE LOG TO BACKEND
 */
async function saveDiveLog(diveLogData) {
    try {
        const response = await fetch(BACKEND_ENDPOINTS.DIVE_LOGS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(diveLogData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ Dive log saved:", result);
            return result;
        } else {
            console.error("❌ Failed to save dive log:", response.status);
            throw new Error(`Save failed: ${response.status}`);
        }
    } catch (error) {
        console.error("❌ Error saving dive log:", error);
        throw error;
    }
}

/**
 * ✅ HANDLE CHAT MESSAGE
 */
async function handleChatMessage(messageData) {
    try {
        const response = await fetch(BACKEND_ENDPOINTS.CHAT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ Chat message processed:", result);
            return result;
        } else {
            console.error("❌ Failed to process chat message:", response.status);
        }
    } catch (error) {
        console.error("❌ Error processing chat message:", error);
    }
}

/**
 * ✅ FALLBACK: LOAD WIDGET DIRECTLY
 */
async function loadWidgetDirectly() {
    try {
        console.log("🔄 Loading widget directly...");
        
        // Create script element to load widget
        const script = document.createElement('script');
        script.src = 'https://kovaldeepai-main.vercel.app/public/bot-widget.js?v=' + Date.now();
        script.onload = () => {
            console.log("✅ Widget script loaded");
        };
        document.head.appendChild(script);
        
    } catch (error) {
        console.error("❌ Failed to load widget directly:", error);
    }
}

console.log("✅ Koval-AI Wix app initializing...");
