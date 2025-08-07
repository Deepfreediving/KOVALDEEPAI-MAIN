import wixUsers from 'wix-users';
import wixData from 'wix-data';

// ✅ CORRECTED API ENDPOINTS TO MATCH YOUR DEPLOYED BACKEND FUNCTIONS
const CHAT_API = "/_functions/chat";  // ✅ Your http-chat.jsw function
const USER_MEMORY_API = "/_functions/userMemory";  // ✅ Your http-userMemory.jsw
const DIVE_LOGS_API = "/_functions/diveLogs";  // ✅ Your http-diveLogs.jsw
const LOAD_MEMORIES_API = "/_functions/loadMemories";  // ✅ Your http-loadMemories.jsw
const WIX_CONNECTION_API = "/_functions/wixConnection";  // ✅ Your http-wixConnection.jsw
const GET_USER_MEMORY_API = "/_functions/getUserMemory";  // ✅ Your http-getUserMemory.jsw
const SAVE_TO_USER_MEMORY_API = "/_functions/saveToUserMemory";  // ✅ Your http-saveToUserMemory.jsw

// ✅ BACKUP: Direct to Next.js backend if Wix functions fail
const BACKUP_CHAT_API = "https://kovaldeepai-main.vercel.app/api/chat-embed";

const DEBUG_MODE = true;

$w.onReady(async function () {
    console.log("✅ Koval-AI widget initializing...");

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
        aiWidget.setProperty("loading", true);
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
    } catch (dataError) {
        console.error("❌ Failed to load user data:", dataError);
        userData = getGuestUserData();
    }

    // ✅ SEND INITIAL DATA TO WIDGET
    try {
        aiWidget.setProperty("userData", userData);
        aiWidget.setProperty("loading", false);
    } catch (propError) {
        console.warn("⚠️ Could not set widget properties");
    }

    // ✅ SETUP EVENT HANDLERS WITH ERROR PROTECTION
    setupWidgetEventHandlers(aiWidget);

    console.log("✅ Koval-AI widget initialized successfully");
}

/**
 * ✅ SETUP WIDGET EVENT HANDLERS
 */
function setupWidgetEventHandlers(aiWidget) {
    try {
        // ✅ Handle AI query event from widget
        aiWidget.on("userQuery", async (event) => {
            await handleUserQuery(aiWidget, event);
        });

        // ✅ Handle dive log save event
        aiWidget.on("saveDiveLog", async (event) => {
            await handleDiveLogSave(aiWidget, event);
        });

        // ✅ Handle memory save event
        aiWidget.on("saveMemory", async (event) => {
            await handleMemorySave(aiWidget, event);
        });

        // ✅ Handle user data refresh request
        aiWidget.on("refreshUserData", async (event) => {
            await handleUserDataRefresh(aiWidget);
        });

    } catch (eventError) {
        console.error("❌ Failed to setup event handlers:", eventError);
    }
}

/**
 * ✅ HANDLE USER QUERY
 */
async function handleUserQuery(aiWidget, event) {
    try {
        aiWidget.setProperty("loading", true);
        if (DEBUG_MODE) console.log("📩 AI query received from widget:", event.query);

        const aiResponse = await sendChatMessage(event.query);
        aiWidget.setProperty("aiResponse", aiResponse);

    } catch (error) {
        console.error("❌ Query handling failed:", error);
        aiWidget.setProperty("aiResponse", {
            answer: "I'm having trouble processing your question. Please try again.",
            model: "error",
            metadata: { error: true }
        });
    } finally {
        aiWidget.setProperty("loading", false);
    }
}

/**
 * ✅ HANDLE DIVE LOG SAVE
 */
async function handleDiveLogSave(aiWidget, event) {
    try {
        aiWidget.setProperty("loading", true);
        if (DEBUG_MODE) console.log("📥 Dive log received from widget:", event.diveLog);

        const saveResult = await saveDiveLog(event.diveLog);
        
        if (saveResult.success) {
            // Refresh user data to show new dive log
            const updatedUserData = await loadUserData();
            aiWidget.setProperty("userData", updatedUserData);
            aiWidget.setProperty("saveResult", { success: true, message: "Dive log saved successfully!" });
        } else {
            aiWidget.setProperty("saveResult", { success: false, message: "Failed to save dive log" });
        }

    } catch (error) {
        console.error("❌ Dive log save failed:", error);
        aiWidget.setProperty("saveResult", { success: false, message: "Error saving dive log" });
    } finally {
        aiWidget.setProperty("loading", false);
    }
}

/**
 * ✅ HANDLE MEMORY SAVE
 */
async function handleMemorySave(aiWidget, event) {
    try {
        if (DEBUG_MODE) console.log("💭 Memory save received from widget:", event.memory);
        
        const saveResult = await saveUserMemory(event.memory);
        aiWidget.setProperty("memorySaveResult", saveResult);

    } catch (error) {
        console.error("❌ Memory save failed:", error);
        aiWidget.setProperty("memorySaveResult", { success: false, error: error.message });
    }
}

/**
 * ✅ HANDLE USER DATA REFRESH
 */
async function handleUserDataRefresh(aiWidget) {
    try {
        aiWidget.setProperty("loading", true);
        const updatedUserData = await loadUserData();
        aiWidget.setProperty("userData", updatedUserData);
    } catch (error) {
        console.error("❌ User data refresh failed:", error);
    } finally {
        aiWidget.setProperty("loading", false);
    }
}

/**
 * ✅ ENHANCED USER DATA LOADING
 */
async function loadUserData() {
    // ✅ FIRST: GET REAL MEMBER ID FROM DATA HOOKS
    let realUserId = null;
    let userProfile = {};
    
    try {
        // Query PrivateMembersData to trigger data hooks and get real member ID
        console.log("🔍 Querying PrivateMembersData to get real member ID...");
        const memberDataResults = await wixData.query("Members/PrivateMembersData")
            .limit(1)
            .find();
            
        if (memberDataResults.items.length > 0) {
            const memberData = memberDataResults.items[0];
            realUserId = memberData.currentMemberId;
            
            if (realUserId) {
                console.log("✅ Got REAL member ID from data hooks:", realUserId);
                
                // Extract profile info if available
                userProfile = {
                    loginEmail: memberData.currentMemberEmail || 'unknown@email.com',
                    displayName: memberData.firstName || memberData.lastName ? 
                        `${memberData.firstName || ''} ${memberData.lastName || ''}`.trim() : 
                        'Authenticated User',
                    firstName: memberData.firstName,
                    lastName: memberData.lastName,
                    nickname: memberData.nickname || memberData.firstName || 'Diver',
                    isGuest: false
                };
            }
        }
    } catch (hookError) {
        console.warn("⚠️ Data hooks query failed:", hookError);
    }

    // ✅ FALLBACK: CHECK WIX USER LOGIN STATUS
    if (!realUserId && wixUsers.currentUser.loggedIn) {
        console.log("🔄 Falling back to wixUsers.currentUser...");
        realUserId = wixUsers.currentUser.id;
        userProfile = {
            loginEmail: wixUsers.currentUser.loginEmail,
            displayName: wixUsers.currentUser.displayName,
            nickname: wixUsers.currentUser.displayName || 'Diver',
            isGuest: false
        };
    }

    // ✅ FINAL FALLBACK: GUEST USER
    if (!realUserId) {
        console.log("👤 No authenticated user found, using guest data");
        return getGuestUserData();
    }

    try {
        console.log(`👤 Loading data for authenticated user: ${userProfile.displayName} (${realUserId})`);

        // ✅ LOAD DATA FROM BOTH ENDPOINTS USING REAL USER ID
        const [memoriesRes, diveLogsRes] = await Promise.all([
            fetch(`${LOAD_MEMORIES_API}?userId=${realUserId}&limit=50`, { 
                credentials: "include",
                headers: { 'Content-Type': 'application/json' }
            }).catch(err => {
                console.warn("⚠️ Load memories API failed:", err);
                return null;
            }),
            fetch(`${DIVE_LOGS_API}?userId=${realUserId}&limit=50`, { 
                credentials: "include",
                headers: { 'Content-Type': 'application/json' }
            }).catch(err => {
                console.warn("⚠️ Dive logs API failed:", err);
                return null;
            })
        ]);

        const memoriesData = memoriesRes ? await safeJson(memoriesRes) : { data: [] };
        const diveLogsData = diveLogsRes ? await safeJson(diveLogsRes) : { data: [] };

        const userMemories = memoriesData.data || [];
        const userDiveLogs = diveLogsData.data || [];

        // ✅ CALCULATE PROFILE STATISTICS
        const personalBest = userDiveLogs.length > 0 
            ? Math.max(...userDiveLogs.map(d => d.reachedDepth || d.targetDepth || 0))
            : 0;

        const recentDives = userDiveLogs.slice(0, 5);
        const avgDepth = userDiveLogs.length > 0
            ? Math.round(userDiveLogs.reduce((sum, d) => sum + (d.reachedDepth || d.targetDepth || 0), 0) / userDiveLogs.length)
            : 0;

        return {
            userId: realUserId, // ✅ NOW USING REAL MEMBER ID
            profile: {
                ...userProfile,
                totalDives: userDiveLogs.length,
                pb: personalBest,
                avgDepth: avgDepth,
                isInstructor: false, // Set based on your user data
                isGuest: false
            },
            userMemories,
            userDiveLogs,
            recentDives,
            totalDives: userDiveLogs.length,
            lastDive: userDiveLogs[0] || null,
            // ✅ Stats for widget
            stats: {
                totalMemories: userMemories.length,
                totalDiveLogs: userDiveLogs.length,
                personalBest,
                avgDepth,
                lastDiveDate: userDiveLogs[0]?.timestamp || null
            }
        };

    } catch (err) {
        console.error("❌ Error loading user data:", err);
        return {
            ...getGuestUserData(),
            userId: wixUsers.currentUser.id || 'guest'
        };
    }
}

/**
 * ✅ GET GUEST USER DATA
 */
function getGuestUserData() {
    return {
        userId: 'guest-' + Date.now(),
        profile: {
            nickname: 'Guest User',
            totalDives: 0,
            pb: 0,
            avgDepth: 0,
            isGuest: true
        },
        userMemories: [],
        userDiveLogs: [],
        recentDives: [],
        totalDives: 0,
        lastDive: null,
        stats: {
            totalMemories: 0,
            totalDiveLogs: 0,
            personalBest: 0,
            avgDepth: 0,
            lastDiveDate: null
        }
    };
}

/**
 * ✅ IMPROVED CHAT MESSAGE FUNCTION
 */
async function sendChatMessage(query) {
    try {
        if (DEBUG_MODE) console.log("🤖 Sending chat message:", query);

        const userData = await loadUserData();
        
        // ✅ TRY WIX BACKEND FIRST
        let response = await fetch(CHAT_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ 
                userMessage: query,  // ✅ Using userMessage for Wix backend
                userId: userData.userId,
                profile: userData.profile
            })
        }).catch(err => {
            console.warn("⚠️ Wix chat API failed:", err);
            return null;
        });

        // ✅ FALLBACK TO NEXT.JS BACKEND IF WIX FAILS
        if (!response || !response.ok) {
            console.warn("⚠️ Wix backend failed, trying Next.js backup...");
            response = await fetch(BACKUP_CHAT_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    message: query,  // ✅ Using message for Next.js backend
                    userId: userData.userId,
                    profile: userData.profile
                })
            });
        }

        if (!response.ok) {
            throw new Error(`Both backends failed. Status: ${response.status}`);
        }

        const data = await safeJson(response);
        if (DEBUG_MODE) console.log("✅ Chat response received:", data);

        return {
            answer: data.aiResponse || data.assistantMessage?.content || "I received your message!",
            model: data.metadata?.model || "gpt-4o-mini",
            metadata: {
                ...data.metadata,
                source: response.url.includes('deepfreediving.com') ? 'wix' : 'nextjs',
                userProfile: userData.profile
            }
        };

    } catch (err) {
        console.error("❌ Chat message failed:", err);
        return {
            answer: "I'm having trouble connecting right now. Please try again in a moment.",
            model: "error",
            metadata: { error: true, errorMessage: err.message }
        };
    }
}

/**
 * ✅ SAVE DIVE LOG (using correct endpoint)
 */
async function saveDiveLog(diveLog) {
    try {
        if (!wixUsers.currentUser.loggedIn) {
            console.warn("⚠️ Cannot save dive log - user not logged in");
            return { success: false, error: "User not logged in" };
        }

        const userId = wixUsers.currentUser.id;
        if (DEBUG_MODE) console.log("💾 Saving dive log for user:", userId);

        const response = await fetch(DIVE_LOGS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ 
                userId, 
                diveLog: {
                    ...diveLog,
                    timestamp: new Date().toISOString(),
                    source: 'wix-widget'
                }
            })
        });

        const data = await safeJson(response);
        
        if (data.success) {
            if (DEBUG_MODE) console.log("✅ Dive log saved successfully:", data);
            return { success: true, data: data.data };
        } else {
            throw new Error(data.error || 'Save failed');
        }

    } catch (err) {
        console.error("❌ Error saving dive log:", err);
        return { success: false, error: err.message };
    }
}

/**
 * ✅ SAVE USER MEMORY (using correct endpoint)
 */
async function saveUserMemory(memory) {
    try {
        if (!wixUsers.currentUser.loggedIn) {
            return { success: false, error: "User not logged in" };
        }

        const userId = wixUsers.currentUser.id;
        
        const response = await fetch(USER_MEMORY_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ 
                userId, 
                memoryContent: memory.content || memory.memoryContent,
                logEntry: memory.logEntry || '',
                sessionName: memory.sessionName || 'Widget Session',
                timestamp: new Date().toISOString(),
                metadata: memory.metadata || {}
            })
        });

        const data = await safeJson(response);
        
        if (DEBUG_MODE) console.log("💭 Memory save result:", data);
        return { success: data.success, data: data.data };

    } catch (err) {
        console.error("❌ Error saving memory:", err);
        return { success: false, error: err.message };
    }
}

/**
 * ✅ SHOW FALLBACK MESSAGE IF WIDGET FAILS
 */
function showFallbackMessage() {
    try {
        console.log("🔍 Available page elements:", Object.keys($w));
        
        // Try to find any element to show message
        const fallbackElement = $w('#koval-ai') || $w('#KovalAiWidget') || $w('#htmlComponent1') || $w('#html1') || $w('#text1') || null;
        
        if (fallbackElement) {
            // ✅ SHOW PROPER KOVAL AI INTERFACE IN HTML
            const kovalAIHTML = `
                <div style="
                    font-family: Arial, sans-serif; 
                    padding: 20px; 
                    background: #f8f9fa; 
                    border-radius: 12px; 
                    max-width: 800px; 
                    margin: 0 auto;
                ">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #2c3e50; margin: 0 0 10px 0;">🤿 Koval AI Freediving Coach</h2>
                        <p style="color: #666; margin: 0;">Your personal freediving training assistant</p>
                    </div>
                    
                    <div id="chatMessages" style="
                        background: white; 
                        border-radius: 8px; 
                        padding: 20px; 
                        margin-bottom: 15px; 
                        min-height: 300px;
                        border: 1px solid #e9ecef;
                    ">
                        <div style="
                            background: #e8f5e8; 
                            padding: 15px; 
                            border-radius: 8px; 
                            margin-bottom: 15px;
                        ">
                            <strong>Koval AI:</strong><br>
                            Hi! I'm Koval AI, your freediving coach. How can I help you today?
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="userInput" placeholder="Ask me about freediving techniques, safety, or training..." style="
                            flex: 1; 
                            padding: 12px; 
                            border: 1px solid #ddd; 
                            border-radius: 6px; 
                            font-size: 14px;
                        ">
                        <button onclick="sendMessage()" style="
                            background: #007bff; 
                            color: white; 
                            border: none; 
                            padding: 12px 20px; 
                            border-radius: 6px; 
                            cursor: pointer;
                            font-size: 14px;
                        ">Send</button>
                    </div>
                    
                    <div style="margin-top: 15px; font-size: 12px; color: #666; text-align: center;">
                        <a href="https://kovaldeepai-main.vercel.app" target="_blank" style="color: #007bff;">
                            Open Full Application →
                        </a>
                    </div>
                </div>
                
                <script>
                    function sendMessage() {
                        const input = document.getElementById('userInput');
                        const messages = document.getElementById('chatMessages');
                        const message = input.value.trim();
                        
                        if (!message) return;
                        
                        // Add user message
                        messages.innerHTML += \`
                            <div style="background: #f1f3f4; padding: 10px; border-radius: 6px; margin-bottom: 10px; text-align: right;">
                                <strong>You:</strong> \${message}
                            </div>
                        \`;
                        
                        // Add loading message
                        messages.innerHTML += \`
                            <div id="loading" style="background: #e8f5e8; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                                <strong>Koval AI:</strong> Thinking...
                            </div>
                        \`;
                        
                        input.value = '';
                        messages.scrollTop = messages.scrollHeight;
                        
                        // Send to backend
                        sendToBackend(message);
                    }
                    
                    async function sendToBackend(message) {
                        try {
                            const response = await fetch('https://www.deepfreediving.com/_functions/chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userMessage: message,
                                    userId: 'widget-user',
                                    profile: { nickname: 'Diver' }
                                })
                            });
                            
                            const data = await response.json();
                            const aiResponse = data.aiResponse || 'Sorry, I could not process your request.';
                            
                            // Replace loading message
                            document.getElementById('loading').innerHTML = \`
                                <strong>Koval AI:</strong> \${aiResponse}
                            \`;
                            document.getElementById('loading').id = '';
                            
                        } catch (error) {
                            document.getElementById('loading').innerHTML = \`
                                <strong>Koval AI:</strong> I'm having trouble connecting. Please try the <a href="https://kovaldeepai-main.vercel.app" target="_blank">full application</a>.
                            \`;
                            document.getElementById('loading').id = '';
                        }
                    }
                    
                    document.getElementById('userInput').addEventListener('keypress', function(e) {
                        if (e.key === 'Enter') sendMessage();
                    });
                </script>
            `;
            
            fallbackElement.html = kovalAIHTML;
        }
        
        console.log("📢 Fallback Koval AI interface displayed");
    } catch (error) {
        console.error("❌ Could not show fallback message:", error);
    }
}

/**
 * ✅ ENHANCED SAFE JSON PARSER
 */
async function safeJson(response) {
    try {
        if (!response.ok) {
            console.warn(`⚠️ Response not OK: ${response.status} ${response.statusText}`);
            return { 
                success: false, 
                error: `HTTP ${response.status}: ${response.statusText}`,
                data: null 
            };
        }
        
        const text = await response.text();
        if (!text.trim()) {
            return { success: false, error: 'Empty response', data: null };
        }
        
        const json = JSON.parse(text);
        return { ...json, success: json.success !== false };
        
    } catch (err) {
        console.warn("⚠️ JSON parse failed:", err);
        return { 
            success: false, 
            error: 'Invalid JSON response: ' + err.message,
            data: null 
        };
    }
}

/**
 * ✅ PERIODIC CONNECTION CHECK (optional)
 */
if (DEBUG_MODE) {
    setInterval(async () => {
        try {
            const testResponse = await fetch(`${USER_MEMORY_API}?userId=test&limit=1`, {
                method: 'GET',
                credentials: 'include'
            });
            console.log("🔄 Backend connection check:", testResponse.ok ? "✅ OK" : "❌ Failed");
        } catch (error) {
            console.log("🔄 Backend connection check: ❌ Failed -", error.message);
        }
    }, 60000); // Check every minute
}
