import wixUsers from 'wix-users';

// ✅ CORRECTED API ENDPOINTS TO MATCH YOUR BACKEND FUNCTIONS
const CHAT_API = "https://www.deepfreediving.com/_functions/chat";  // ✅ Your post_chat function
const USER_MEMORY_API = "https://www.deepfreediving.com/_functions/http-userMemory";  // ✅ Your http-userMemory.jsw
const TEST_CONNECTION_API = "https://www.deepfreediving.com/_functions/testConnection";  // ✅ Your get_testConnection

// ✅ BACKUP: Direct to your Next.js backend if Wix functions fail
const BACKUP_CHAT_API = "https://kovaldeepai-main.vercel.app/api/chat-embed";
const PINECONE_API = "https://kovaldeepai-main.vercel.app/api/pinecone";

const DEBUG_MODE = true;

$w.onReady(async function () {
    console.log("✅ Koval-AI Wix app initializing...");

    // ✅ PRIORITIZE WIX BLOCKS SPECIFIC IDS - KovalAIFrame and koval-ai
    let aiWidget = null;
    const possibleIds = ['#koval-ai', '#KovalAIFrame', '#kovalAIFrame', '#KovalAiWidget', '#kovalAIWidget'];
    
    for (const id of possibleIds) {
        try {
            aiWidget = $w(id);
            if (aiWidget) {
                console.log(`✅ Found Koval AI widget with ID: ${id}`);
                console.log(`🎯 Widget type: ${aiWidget.type || 'custom'}`);
                break;
            }
        } catch (e) {
            console.log(`⚠️ Widget ${id} not found`);
        }
    }

    if (!aiWidget) {
        console.error("❌ No Koval-AI widget found on page. Expected IDs: #koval-ai or #KovalAIFrame");
        console.log("🔍 Available elements on page:", Object.keys($w).filter(k => k.startsWith('#')));
        showFallbackUI();
        return;
    }

    console.log(`🚀 Successfully connected to Koval AI widget: ${aiWidget.id || 'unknown'}`);
    console.log(`📋 Widget properties:`, {
        id: aiWidget.id,
        type: aiWidget.type,
        hasPostMessage: typeof aiWidget.postMessage === 'function',
        hasOnMessage: typeof aiWidget.onMessage === 'function'
    });

    // ✅ TEST CONNECTION FIRST
    const connectionStatus = await testBackendConnection();
    console.log("🔗 Backend connection status:", connectionStatus);

    // ✅ SETUP WIDGET WITH IMPROVED ERROR HANDLING
    try {
        await setupKovalAIWidget(aiWidget);
    } catch (error) {
        console.error("❌ Widget setup failed:", error);
        showFallbackUI();
    }
});

/**
 * ✅ SETUP KOVAL AI WIDGET WITH PROPER ERROR HANDLING
 */
async function setupKovalAIWidget(aiWidget) {
    // ✅ SET WIDGET PROPERTIES
    aiWidget.style = {
        width: "100%",
        height: "600px",
        border: "1px solid #e1e5e9",
        borderRadius: "12px",
        overflow: "hidden"
    };

    // ✅ LOAD USER DATA WITH TIMEOUT
    const userData = await Promise.race([
        loadUserData(),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('User data load timeout')), 10000)
        )
    ]);

    console.log("📊 Loaded user data:", userData);

    // ✅ SEND INITIAL DATA TO WIDGET
    try {
        aiWidget.postMessage({
            type: 'USER_AUTH',
            data: {
                userId: userData.userId,
                profile: userData.profile,
                diveLogs: userData.userDiveLogs,
                memories: userData.userMemories,
                connectionStatus: await testBackendConnection()
            }
        });
    } catch (msgError) {
        console.error("❌ Failed to send initial data to widget:", msgError);
    }

    // ✅ SETUP MESSAGE LISTENER WITH SPECIFIC WIDGET REFERENCE
    try {
        if (typeof aiWidget.onMessage === 'function') {
            aiWidget.onMessage((event) => {
                try {
                    console.log("📨 Message received from Koval AI widget:", event.data?.type);
                    handleWidgetMessage(event.data, aiWidget);
                } catch (handlerError) {
                    console.error("❌ Widget message handler error:", handlerError);
                }
            });
            console.log("✅ Message listener attached to Koval AI widget");
        } else {
            console.warn("⚠️ Widget does not support onMessage - using global listener");
            // Fallback to global message listener
            if (typeof window !== 'undefined') {
                window.addEventListener('message', (event) => {
                    if (event.data?.source === 'koval-ai' || event.data?.type) {
                        handleWidgetMessage(event.data, aiWidget);
                    }
                });
            }
        }
    } catch (msgError) {
        console.error("❌ Failed to setup message listener:", msgError);
    }

    console.log("✅ Koval-AI widget initialized successfully");
}

/**
 * ✅ TEST BACKEND CONNECTION
 */
async function testBackendConnection() {
    try {
        console.log("🔍 Testing backend connection...");
        
        const response = await fetch(TEST_CONNECTION_API, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            timeout: 5000
        });

        const data = await safeJson(response);
        
        return {
            wix: response.ok ? "✅ Connected" : "❌ Failed",
            status: response.status,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.warn("⚠️ Backend connection test failed:", error);
        return {
            wix: "❌ Failed",
            status: 0,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * ✅ HANDLE MESSAGES FROM KOVAL AI WIDGET
 */
async function handleWidgetMessage(data, widgetRef = null) {
    if (!data || !data.type) return;

    console.log("📨 Koval AI widget message received:", data.type);

    // ✅ GET WIDGET REFERENCE - PRIORITIZE PASSED REFERENCE
    const widget = widgetRef || $w('#koval-ai') || $w('#KovalAIFrame');
    
    if (!widget) {
        console.error("❌ No widget reference available for message handling");
        return;
    }

    try {
        switch (data.type) {
            case 'CHAT_MESSAGE':
                const response = await sendChatMessage(data.message, data.userId);
                widget.postMessage({
                    type: 'AI_RESPONSE',
                    data: response
                });
                break;

            case 'SAVE_DIVE_LOG':
                const saveResult = await saveDiveLog(data.diveLog);
                if (saveResult) {
                    const updatedData = await loadUserData();
                    widget.postMessage({
                        type: 'DATA_UPDATE',
                        data: updatedData
                    });
                }
                break;

            case 'SAVE_MEMORY':
                await saveUserMemory(data.memory);
                break;

            case 'WIDGET_RESIZE':
                if (data.height && data.height > 200 && data.height < 1000) {
                    widget.style.height = `${data.height}px`;
                }
                break;

            case 'REQUEST_USER_DATA':
                const userData = await loadUserData();
                widget.postMessage({
                    type: 'USER_DATA_UPDATE',
                    data: userData
                });
                break;

            default:
                if (DEBUG_MODE) console.log("🔄 Unhandled Koval AI widget message:", data.type);
        }
    } catch (error) {
        console.error(`❌ Error handling Koval AI widget message ${data.type}:`, error);
        
        // ✅ TRY MULTIPLE WIDGET REFERENCES FOR ERROR REPORTING
        const errorWidget = widgetRef || $w('#koval-ai') || $w('#KovalAIFrame');
        if (errorWidget && typeof errorWidget.postMessage === 'function') {
            errorWidget.postMessage({
                type: 'ERROR',
                data: {
                    message: `Failed to handle ${data.type}`,
                    error: error.message
                }
            });
        }
    }
}

/**
 * ✅ ENHANCED USER DATA LOADING
 */
async function loadUserData() {
    const defaultUser = {
        userId: 'guest-' + Date.now(),
        profile: { 
            nickname: 'Guest User', 
            totalDives: 0,
            pb: 0,
            isGuest: true
        },
        userMemories: [],
        userDiveLogs: [],
        totalDives: 0,
        lastDive: null
    };

    try {
        // ✅ SIMPLIFIED: GET REAL MEMBER ID DIRECTLY FROM WIX USERS
        let realUserId = null;
        let userProfile = {};
        
        // ✅ CHECK WIX USER LOGIN STATUS FIRST (This is the real member ID)
        if (wixUsers.currentUser.loggedIn) {
            realUserId = wixUsers.currentUser.id; // This IS the real Wix member ID
            console.log("✅ Widget got authenticated member ID:", realUserId);
            
            userProfile = {
                loginEmail: wixUsers.currentUser.loginEmail || 'unknown@email.com',
                displayName: wixUsers.currentUser.displayName || 'Authenticated User',
                nickname: wixUsers.currentUser.displayName || 'Diver',
                isGuest: false
            };

            // ✅ PROFILE DATA: Using wixUsers only (no direct wix-data access from frontend)
            // Additional profile data should be fetched via backend HTTP functions if needed
        } else {
            console.log("👤 Widget: No authenticated user found, using guest data");
            return defaultUser;
        }

        console.log(`👤 Widget loading data for authenticated user: ${userProfile.displayName} (${realUserId})`);

        // ✅ VALIDATE THAT WE HAVE A REAL WIX MEMBER ID
        if (!realUserId || realUserId.startsWith('guest-') || realUserId.startsWith('wix-guest-')) {
            console.warn("⚠️ Widget: Invalid or guest userId detected:", realUserId);
            return defaultUser;
        }

        // ✅ LOG THE MEMBER ID FORMAT FOR DEBUGGING
        console.log("🔍 Widget member ID format check:", {
            userId: realUserId,
            isValidFormat: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(realUserId),
            loginStatus: wixUsers.currentUser.loggedIn,
            displayName: userProfile.displayName
        });

        // ✅ LOAD USER MEMORIES USING REAL USER ID
        const memoriesResponse = await fetch(`${USER_MEMORY_API}?userId=${realUserId}&limit=50`, { 
            method: "GET",
            credentials: "include",
            headers: { 'Content-Type': 'application/json' }
        });

        const memoriesData = await safeJson(memoriesResponse);
        const userMemories = memoriesData.data || [];

        // ✅ SEPARATE DIVE LOGS FROM MEMORIES
        const diveLogs = userMemories.filter(item => 
            item.discipline || item.targetDepth || item.reachedDepth
        );
        const memories = userMemories.filter(item => 
            item.memoryContent || item.logEntry
        );

        const personalBest = diveLogs.length > 0 
            ? Math.max(...diveLogs.map(d => d.reachedDepth || d.targetDepth || 0))
            : 0;

        return {
            userId: realUserId, // ✅ NOW USING REAL MEMBER ID
            profile: {
                ...userProfile,
                totalDives: diveLogs.length,
                pb: personalBest,
                currentDepth: personalBest || 20,
                isInstructor: false,
                isGuest: false
            },
            userMemories: memories,
            userDiveLogs: diveLogs,
            totalDives: diveLogs.length,
            lastDive: diveLogs[0] || null
        };

    } catch (err) {
        console.error("❌ Error loading user data:", err);
        return { 
            ...defaultUser, 
            userId: realUserId || (wixUsers.currentUser.loggedIn ? wixUsers.currentUser.id : defaultUser.userId),
            profile: {
                ...defaultUser.profile,
                isGuest: !wixUsers.currentUser.loggedIn
            }
        };
    }
}

/**
 * ✅ IMPROVED CHAT MESSAGE FUNCTION
 */
async function sendChatMessage(message, userId) {
    try {
        console.log("🤖 Sending chat message:", message);

        // Load user data to get dive logs
        const userData = await loadUserData();

        // ✅ TRY WIX BACKEND FIRST
        let response = await fetch(CHAT_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ 
                userMessage: message,  // ✅ Using userMessage for Wix backend
                userId: userId || userData.userId || 'guest',
                profile: userData.profile,
                diveLogs: userData.userDiveLogs || []  // ✅ Include dive logs
            })
        });

        // ✅ FALLBACK TO NEXT.JS BACKEND IF WIX FAILS
        if (!response.ok) {
            console.warn("⚠️ Wix backend failed, trying Next.js backup...");
            response = await fetch(BACKUP_CHAT_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    message: message,  // ✅ Using message for Next.js backend
                    userId: userId || userData.userId || 'guest',
                    profile: userData.profile,
                    diveLogs: userData.userDiveLogs || []  // ✅ Include dive logs for backup too
                })
            });
        }

        if (!response.ok) {
            throw new Error(`Both backends failed. Status: ${response.status}`);
        }

        const data = await safeJson(response);
        console.log("✅ Chat response received");

        return {
            success: true,
            aiResponse: data.aiResponse || data.assistantMessage?.content || "I received your message!",
            metadata: data.metadata || {},
            source: response.url.includes('deepfreediving.com') ? 'wix' : 'nextjs'
        };

    } catch (err) {
        console.error("❌ Chat message failed:", err);
        return {
            success: false,
            aiResponse: "I'm having trouble responding right now. Please try again in a moment.",
            error: err.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * ✅ SAVE DIVE LOG (using user memory API)
 */
async function saveDiveLog(diveLog) {
    try {
        if (!wixUsers.currentUser.loggedIn) {
            console.warn("⚠️ Cannot save dive log - user not logged in");
            return false;
        }

        const userId = wixUsers.currentUser.id;
        console.log("💾 Saving dive log for user:", userId);

        const response = await fetch(USER_MEMORY_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ 
                userId, 
                diveLog: {
                    ...diveLog,
                    timestamp: new Date().toISOString(),
                    source: 'wix-widget'
                },
                type: 'diveLog'
            })
        });

        const data = await safeJson(response);
        if (data.success) {
            console.log("✅ Dive log saved successfully");
            return true;
        } else {
            throw new Error(data.error || 'Save failed');
        }

    } catch (err) {
        console.error("❌ Error saving dive log:", err);
        return false;
    }
}

/**
 * ✅ SAVE USER MEMORY
 */
async function saveUserMemory(memory) {
    try {
        if (!wixUsers.currentUser.loggedIn) return false;

        const userId = wixUsers.currentUser.id;
        const response = await fetch(USER_MEMORY_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ 
                userId, 
                memoryContent: memory.content || memory.memoryContent,
                logEntry: memory.logEntry || '',
                sessionName: memory.sessionName || 'Chat Session',
                timestamp: new Date().toISOString(),
                type: 'memory'
            })
        });

        const data = await safeJson(response);
        console.log("✅ Memory saved:", data.success);
        return data.success;

    } catch (err) {
        console.error("❌ Error saving memory:", err);
        return false;
    }
}

/**
 * ✅ SHOW FALLBACK UI IF WIDGET FAILS
 */
function showFallbackUI() {
    const fallbackHTML = `
        <div style="
            padding: 40px 20px; 
            text-align: center; 
            color: #333;
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            margin: 20px;
        ">
            <h2>🤿 Koval AI Freediving Coach</h2>
            <p style="margin: 20px 0; opacity: 0.9;">
                I'm having trouble loading right now, but I'm here to help with your freediving journey!
            </p>
            <button onclick="location.reload()" style="
                background: rgba(255,255,255,0.2);
                color: white;
                border: 2px solid rgba(255,255,255,0.3);
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                margin: 10px;
            ">
                🔄 Try Again
            </button>
            <div style="margin-top: 30px; font-size: 14px; opacity: 0.7;">
                <p>📧 Contact support if this persists</p>
                <p>Looking for: #koval-ai or #KovalAIFrame</p>
            </div>
        </div>
    `;

    try {
        // ✅ TRY MULTIPLE WIDGET IDS FOR FALLBACK
        const fallbackWidget = $w('#koval-ai') || $w('#KovalAIFrame') || $w('#kovalAIWidget');
        if (fallbackWidget) {
            fallbackWidget.html = fallbackHTML;
        } else {
            console.error("❌ Could not find any widget element for fallback UI");
        }
    } catch (error) {
        console.error("❌ Could not show fallback UI:", error);
    }
}

/**
 * ✅ SAFE JSON PARSER WITH BETTER ERROR HANDLING
 */
async function safeJson(response) {
    try {
        if (!response.ok) {
            console.warn(`⚠️ Response not OK: ${response.status} ${response.statusText}`);
            return { 
                data: null, 
                error: `HTTP ${response.status}: ${response.statusText}`,
                success: false 
            };
        }
        
        const text = await response.text();
        if (!text.trim()) {
            return { data: null, error: 'Empty response', success: false };
        }
        
        const json = JSON.parse(text);
        return { ...json, success: json.success !== false };
        
    } catch (err) {
        console.warn("⚠️ JSON parse failed:", err);
        return { 
            data: null, 
            error: 'Invalid JSON response: ' + err.message,
            success: false 
        };
    }
}

/**
 * ✅ PERIODIC CONNECTION CHECK (optional)
 */
setInterval(async () => {
    if (DEBUG_MODE) {
        const status = await testBackendConnection();
        console.log("🔄 Periodic connection check:", status);
    }
}, 60000); // Check every minute
