// ===== 📄 wix-direct-user-fix.js =====
// Add this code to your Wix page as a temporary fix for user authentication

import wixUsers from 'wix-users';

// ✅ API ENDPOINTS
const DIVE_LOGS_API = "/_functions/diveLogs";
const LOAD_MEMORIES_API = "/_functions/loadMemories";

$w.onReady(async function () {
    console.log("🔧 Direct user fix initializing...");
    
    try {
        // Load user data
        const userData = await loadUserData();
        console.log("👤 Loaded user data:", userData);
        
        // Store user data globally for widget access
        window.KOVAL_USER_DATA = userData;
        
        // Also try direct iframe communication
        setTimeout(() => {
            const widget = $w('#koval-ai') || document.querySelector('koval-ai');
            if (widget) {
                console.log("🎯 Found widget, attempting direct communication");
                
                // Try multiple communication methods
                
                // Method 1: Direct iframe access
                try {
                    const iframe = widget.querySelector ? widget.querySelector('iframe') : widget.iframe;
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage({
                            type: 'USER_AUTH',
                            data: {
                                userId: userData.userId,
                                userName: userData.profile?.displayName || 'Authenticated User',
                                userEmail: userData.profile?.loginEmail || '',
                                profile: userData.profile,
                                diveLogs: userData.userDiveLogs || [],
                                memories: userData.userMemories || []
                            }
                        }, '*');
                        console.log("📤 Method 1: Sent via iframe.contentWindow");
                    }
                } catch (error) {
                    console.warn("⚠️ Method 1 failed:", error);
                }
                
                // Method 2: Widget postMessage (if available)
                try {
                    if (widget.postMessage) {
                        widget.postMessage('USER_AUTH', {
                            userId: userData.userId,
                            userName: userData.profile?.displayName || 'Authenticated User',
                            profile: userData.profile,
                            diveLogs: userData.userDiveLogs || [],
                            memories: userData.userMemories || []
                        });
                        console.log("📤 Method 2: Sent via widget.postMessage");
                    }
                } catch (error) {
                    console.warn("⚠️ Method 2 failed:", error);
                }
                
                // Method 3: Global broadcast
                try {
                    window.postMessage({
                        type: 'KOVAL_USER_AUTH',
                        userId: userData.userId,
                        profile: userData.profile,
                        diveLogs: userData.userDiveLogs || [],
                        memories: userData.userMemories || []
                    }, '*');
                    console.log("📤 Method 3: Global broadcast sent");
                } catch (error) {
                    console.warn("⚠️ Method 3 failed:", error);
                }
                
            } else {
                console.error("❌ Widget not found");
            }
        }, 2000);
        
    } catch (error) {
        console.error("❌ Direct user fix failed:", error);
    }
});

/**
 * ✅ LOAD USER DATA WITH COMPREHENSIVE ERROR HANDLING
 */
async function loadUserData() {
    try {
        const currentUser = wixUsers.currentUser;
        
        // ✅ Check if user is logged in
        if (!currentUser.loggedIn) {
            console.warn("⚠️ User not logged in, returning guest data");
            return getGuestUserData();
        }

        const userId = currentUser.id;
        
        // ✅ Validate user ID format
        if (!userId || userId.startsWith('guest-') || userId.startsWith('wix-guest-')) {
            console.warn("⚠️ Invalid or guest user ID:", userId);
            return getGuestUserData();
        }

        // ✅ Build user profile
        const profile = {
            id: userId,
            loginEmail: currentUser.loginEmail,
            displayName: currentUser.displayName || 'User',
            loggedIn: true
        };

        console.log("👤 Loading data for authenticated user:", userId);

        // ✅ Load user dive logs and memories in parallel
        const [userDiveLogs, userMemories] = await Promise.allSettled([
            loadUserDiveLogs(userId),
            loadUserMemories(userId)
        ]);

        const userData = {
            userId: userId,
            profile: profile,
            userDiveLogs: userDiveLogs.status === 'fulfilled' ? userDiveLogs.value : [],
            userMemories: userMemories.status === 'fulfilled' ? userMemories.value : []
        };

        console.log("✅ User data loaded successfully:", {
            userId: userData.userId,
            diveLogsCount: userData.userDiveLogs.length,
            memoriesCount: userData.userMemories.length
        });

        return userData;

    } catch (error) {
        console.error("❌ Error loading user data:", error);
        return getGuestUserData();
    }
}

/**
 * ✅ GET GUEST USER DATA
 */
function getGuestUserData() {
    return {
        userId: 'guest-' + Date.now(),
        profile: {
            id: 'guest-' + Date.now(),
            displayName: 'Guest User',
            loggedIn: false
        },
        userDiveLogs: [],
        userMemories: []
    };
}

/**
 * ✅ LOAD USER DIVE LOGS
 */
async function loadUserDiveLogs(userId) {
    try {
        console.log("🏊 Loading dive logs for user:", userId);
        
        const response = await fetch(DIVE_LOGS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && Array.isArray(result.logs)) {
            console.log(`✅ Loaded ${result.logs.length} dive logs`);
            return result.logs;
        } else {
            console.warn("⚠️ No dive logs found or invalid response");
            return [];
        }

    } catch (error) {
        console.error("❌ Error loading dive logs:", error);
        return [];
    }
}

/**
 * ✅ LOAD USER MEMORIES
 */
async function loadUserMemories(userId) {
    try {
        console.log("🧠 Loading memories for user:", userId);
        
        const response = await fetch(LOAD_MEMORIES_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && Array.isArray(result.memories)) {
            console.log(`✅ Loaded ${result.memories.length} memories`);
            return result.memories;
        } else {
            console.warn("⚠️ No memories found or invalid response");
            return [];
        }

    } catch (error) {
        console.error("❌ Error loading memories:", error);
        return [];
    }
}

// ✅ USAGE: Copy this code into your Wix page's code section
// This provides multiple fallback methods to send user data to the widget
