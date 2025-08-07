// ===== 🎯 FINAL WIX PAGE CODE - DEPLOY THIS TO YOUR WIX PAGE =====
// This code connects your Wix page to your deployed backend functions

import wixUsers from 'wix-users';
import wixData from 'wix-data';

// ✅ YOUR DEPLOYED BACKEND ENDPOINTS
const BACKEND_FUNCTIONS = {
    CHAT: "/_functions/chat",
    USER_MEMORY: "/_functions/userMemory", 
    DIVE_LOGS: "/_functions/diveLogs",
    GET_USER_MEMORY: "/_functions/getUserMemory",
    SAVE_TO_USER_MEMORY: "/_functions/saveToUserMemory",
    GET_USER_PROFILE: "/_functions/getUserProfile",
    LOAD_MEMORIES: "/_functions/loadMemories",
    WIX_CONNECTION: "/_functions/wixConnection",
    UTILS: "/_functions/utils"
};

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
 * ✅ TEST BACKEND CONNECTION
 */
async function testBackendConnection() {
    try {
        console.log("🔍 Testing backend connection...");
        const response = await fetch(BACKEND_FUNCTIONS.WIX_CONNECTION, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("🔗 Backend connection status:", data);
        } else {
            console.warn("⚠️ Response not OK:", response.status);
        }
    } catch (error) {
        console.error("❌ Backend connection test failed:", error);
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
 * ✅ LOAD USER DATA
 */
async function loadUserData() {
    try {
        const user = wixUsers.currentUser;
        const userId = user.id || `wix-guest-${Date.now()}`;
        
        console.log("👤 Loading data for user:", user.loggedIn ? user.id : 'guest', `(${userId})`);
        
        // Get user profile if logged in
        let profile = {};
        if (user.loggedIn) {
            try {
                const response = await fetch(BACKEND_FUNCTIONS.GET_USER_PROFILE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id })
                });
                
                if (response.ok) {
                    profile = await response.json();
                }
            } catch (profileError) {
                console.warn("⚠️ Could not load user profile:", profileError);
            }
        }
        
        const userData = {
            userId: userId,
            isLoggedIn: user.loggedIn,
            email: user.loggedIn ? (user.email || profile.email || '') : '',
            displayName: profile.displayName || 'User',
            profile: profile,
            timestamp: new Date().toISOString()
        };
        
        console.log("📊 Loaded user data:", userData);
        return userData;
        
    } catch (error) {
        console.error("❌ Failed to load user data:", error);
        return {
            userId: `wix-guest-${Date.now()}`,
            isLoggedIn: false,
            email: '',
            displayName: 'Guest User',
            profile: {},
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * ✅ SETUP WIDGET
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
        setupMessageListener(widget);
        
    } catch (error) {
        console.error("❌ Failed to setup widget:", error);
    }
}

/**
 * ✅ LOAD CHAT INTERFACE
 */
async function loadChatInterface(widget, userData) {
    try {
        console.log("🔄 Loading chat interface...");
        console.log("📦 Using container:", widget.id);
        
        // Create embed URL with user data
        const embedUrl = new URL('https://kovaldeepai-main.vercel.app/embed');
        embedUrl.searchParams.set('theme', 'light');
        embedUrl.searchParams.set('userId', userData.userId);
        embedUrl.searchParams.set('userName', userData.displayName);
        embedUrl.searchParams.set('embedded', 'true');
        embedUrl.searchParams.set('v', Date.now().toString());
        
        console.log("🔗 Embed URL:", embedUrl.toString());
        
        // Set iframe content
        const iframeHtml = `
            <iframe 
                src="${embedUrl.toString()}"
                style="width: 100%; height: 100%; border: none; background: white;"
                allow="microphone; camera; geolocation"
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
 * ✅ SETUP MESSAGE LISTENER
 */
function setupMessageListener(widget) {
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
 * ✅ HANDLE WIDGET MESSAGES
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
        }
    } catch (error) {
        console.error("❌ Failed to handle widget message:", error);
    }
}

/**
 * ✅ SAVE DIVE LOG
 */
async function saveDiveLog(diveLogData) {
    try {
        const response = await fetch(BACKEND_FUNCTIONS.DIVE_LOGS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(diveLogData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ Dive log saved:", result);
        } else {
            console.error("❌ Failed to save dive log:", response.status);
        }
    } catch (error) {
        console.error("❌ Error saving dive log:", error);
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
