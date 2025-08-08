import wixUsers from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { currentMember } from 'wix-members-frontend';
// Note: Using HTTP endpoint instead of direct import for Wix pages
// import { checkUserAccess } from 'backend/checkUserAccess.jsw';

// ===== 🔄 Enhanced Widget Communication & Entitlement Logic =====
// (Merged from koval-ai-page.js)

// ✅ CORRECTED API ENDPOINTS TO MATCH YOUR DEPLOYED BACKEND FUNCTIONS
const CHAT_API = "/_functions/chat";  // ✅ Your http-chat.jsw function
const USER_MEMORY_API = "/_functions/userMemory";  // ✅ Your http-userMemory.jsw
const DIVE_LOGS_API = "/_functions/diveLogs";  // ✅ Your http-diveLogs.jsw
const LOAD_MEMORIES_API = "/_functions/loadMemories";  // ✅ DEPRECATED - Use userMemory instead
const WIX_CONNECTION_API = "/_functions/wixConnection";  // ✅ Your http-wixConnection.jsw
const GET_USER_MEMORY_API = "/_functions/userMemory";  // ✅ UNIFIED - Use userMemory for all memory operations
const SAVE_TO_USER_MEMORY_API = "/_functions/userMemory";  // ✅ UNIFIED - Use userMemory for all memory operations
const MEMBER_PROFILE_API = "/_functions/memberProfile";  // ✅ NEW - Get complete member profile data

// ✅ BACKUP: Direct to Next.js backend if Wix functions fail
const BACKUP_CHAT_API = "https://kovaldeepai-main.vercel.app/api/openai/chat";

const DEBUG_MODE = true;

$w.onReady(async function () {
    console.log("🚀 Koval-AI widget initializing...");

    // ===== 🔄 Enhanced Widget Communication (from koval-ai-page.js) =====
    
    // Setup enhanced message listener for widget communication
    if (typeof window !== 'undefined') {
        window.addEventListener('message', handleEnhancedWidgetMessage);
        console.log('👂 Enhanced widget message listener active');
    }

    // ===== User Authentication & Entitlement Check =====
    await initializeUserAuthAndEntitlement();

    // ===== Original Widget Setup Logic =====

    // ✅ SETUP MESSAGE LISTENER FOR WIDGET COMMUNICATION (with safety check)
    if (typeof window !== 'undefined') {
        window.addEventListener('message', async (event) => {
            if (event.data?.type === 'REQUEST_USER_DATA' && event.data?.source === 'koval-ai-widget') {
                console.log('📨 Widget requesting user data, sending authenticated user info...');
                
                try {
                    // Load current user data
                    const userData = await loadUserData();
                    
                    // Send user data back to widget with more detailed logging
                    console.log('🔍 Sending user data:', {
                        userId: userData.userId,
                        hasProfile: !!userData.profile,
                        diveLogsCount: userData.userDiveLogs?.length || 0
                    });
                    
                    event.source.postMessage({
                        type: 'USER_DATA_RESPONSE',
                        userData: userData
                    }, event.origin);
                    
                    console.log('📤 Sent authenticated user data to widget:', userData.userId);
                } catch (error) {
                    console.error('❌ Failed to send user data to widget:', error);
                    
                    // Send guest data as fallback
                    const guestData = getGuestUserData();
                    event.source.postMessage({
                        type: 'USER_DATA_RESPONSE',
                        userData: guestData
                    }, event.origin);
                    console.log('📤 Sent guest data as fallback');
                }
            }
        });
    }

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
        aiWidget.setProperty("userData", userData);
        aiWidget.setProperty("loading", false);
        
        // ✅ ALSO SEND USER DATA VIA POST MESSAGE FOR EMBEDDED WIDGETS
        setTimeout(() => {
            try {
                if (aiWidget.postMessage && userData) {
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
                    
                    aiWidget.postMessage(postMessageData);
                    console.log("📤 Sent authentic user data to widget via postMessage:", {
                        userId: userData.userId,
                        userName: postMessageData.data.userName,
                        nickname: postMessageData.data.nickname,
                        isGuest: postMessageData.data.isGuest,
                        hasProfilePhoto: !!postMessageData.data.profilePicture,
                        profileSource: userData.profile?.source,
                        fullProfileData: userData.profile  // ✅ Debug: log full profile
                    });
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
                console.log('🔍 Widget requesting user data via enhanced handler');
                await sendEnhancedUserDataToWidget();
                break;
                
            case 'CHECK_USER_REGISTRATION':
                console.log('🔐 Widget checking user registration via enhanced handler');
                await checkAndSendUserAccess();
                break;
                
            case 'CHAT_MESSAGE':
                console.log('💬 Chat message from widget:', event.data.data);
                // Handle chat messages if needed
                break;
                
            case 'SAVE_DIVE_LOG':
                console.log('💾 Saving dive log from widget via enhanced handler:', event.data.data);
                await saveDiveLogFromWidget(event.data.data);
                break;
                
            default:
                console.log('❓ Unknown enhanced message type:', type);
        }
    } catch (error) {
        console.error('❌ Error in enhanced widget message handler:', error);
    }
}

/**
 * ✅ Initialize User Authentication and Entitlement
 */
async function initializeUserAuthAndEntitlement() {
    try {
        console.log('🔄 Initializing user authentication and entitlement...');
        
        // 1. Check if user is logged in
        if (!wixUsers.currentUser.loggedIn) {
            console.log('👤 User not logged in, prompting login...');
            await wixUsers.promptLogin();
        }
        
        const member = await currentMember.getMember();
        if (!member || !member.loggedIn) {
            console.warn('⚠️ User login failed or cancelled');
            return;
        }
        
        // 2. Check entitlement (Registration/Access)
        try {
            const accessResponse = await fetch('/_functions/checkUserAccess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: member._id,
                    userEmail: member.loginEmail
                })
            });
            const accessResult = await accessResponse.json();
            
            if (!accessResult || !accessResult.hasAccess) {
                console.log('❌ User not entitled, redirecting to pricing...');
                wixLocation.to('/plans-pricing');
                return;
            }
            console.log('✅ User has valid access:', accessResult);
        } catch (entitlementError) {
            console.warn('⚠️ Access check failed:', entitlementError);
            // Continue anyway - might be a backend issue
        }
        
        // 3. Find and update widget with user data
        await updateWidgetWithUserData(member);
        
        // 4. Send initial user data
        setTimeout(async () => {
            await sendEnhancedUserDataToWidget();
        }, 1000);
        
        // 5. Check and send user access status
        setTimeout(async () => {
            await checkAndSendUserAccess();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error initializing user auth/entitlement:', error);
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
        // ✅ Use the same enhanced loadUserData function that loads rich profile data
        const fullUserData = await loadUserData();
        
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
        
        // Check access via backend
        const accessResponse = await fetch('/_functions/checkUserAccess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: member._id,
                userEmail: member.loginEmail
            })
        });
        const accessResult = await accessResponse.json();
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

// ===== Original Widget Setup Functions Continue Below =====

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
    // ✅ SIMPLIFIED: GET REAL MEMBER ID DIRECTLY FROM WIX USERS
    let realUserId = null;
    let userProfile = {};
    
    // ✅ CHECK WIX USER LOGIN STATUS FIRST (This is the real member ID)
    if (wixUsers.currentUser.loggedIn) {
        realUserId = wixUsers.currentUser.id; // This IS the real Wix member ID
        console.log("✅ Got authenticated member ID:", realUserId);
        
        userProfile = {
            loginEmail: wixUsers.currentUser.loginEmail || 'unknown@email.com',
            displayName: wixUsers.currentUser.displayName || 'Authenticated User',
            nickname: wixUsers.currentUser.displayName || 'Diver',
            isGuest: false
        };

        // ✅ PROFILE DATA: Using wixUsers only (no direct wix-data access from frontend)
        // Additional profile data should be fetched via backend HTTP functions if needed
    } else {
        console.log("👤 No authenticated user found, using guest data");
        return getGuestUserData();
    }

    try {
        console.log(`👤 Loading data for authenticated user: ${userProfile.displayName} (${realUserId})`);

        // ✅ VALIDATE THAT WE HAVE A REAL WIX MEMBER ID
        if (!realUserId || realUserId.startsWith('guest-') || realUserId.startsWith('wix-guest-')) {
            console.warn("⚠️ Invalid or guest userId detected:", realUserId);
            return getGuestUserData();
        }

        // ✅ LOG THE MEMBER ID FORMAT FOR DEBUGGING
        console.log("🔍 Member ID format check:", {
            userId: realUserId,
            isValidFormat: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(realUserId),
            loginStatus: wixUsers.currentUser.loggedIn,
            displayName: userProfile.displayName
        });

        // ✅ FIRST: Load complete member profile data from Members/FullData
        console.log("🔍 Loading enhanced profile data from Members/FullData...");
        let profileData = null;
        try {
            const profileRes = await fetch(`${MEMBER_PROFILE_API}?userId=${realUserId}`, {
                credentials: "include",
                headers: { 'Content-Type': 'application/json' }
            });
            
            profileData = await safeJson(profileRes);
            
            if (profileData && profileData.success && profileData.profile) {
                console.log(`✅ Enhanced profile data loaded:`, {
                    displayName: profileData.profile.displayName,
                    nickname: profileData.profile.nickname,
                    hasPhoto: !!profileData.profile.profilePhoto,
                    email: profileData.profile.loginEmail
                });
                
                // Update userProfile with rich data from Members/FullData
                userProfile = {
                    ...userProfile,
                    displayName: profileData.profile.displayName || profileData.profile.nickname || userProfile.displayName,
                    nickname: profileData.profile.nickname || profileData.profile.displayName || userProfile.nickname,
                    loginEmail: profileData.profile.loginEmail || userProfile.loginEmail,
                    profilePhoto: profileData.profile.profilePhoto,
                    about: profileData.profile.about,
                    firstName: profileData.profile.firstName,
                    lastName: profileData.profile.lastName,
                    phone: profileData.profile.phone,
                    contactId: profileData.profile.contactId,
                    isActive: profileData.profile.isActive,
                    source: 'Members/FullData'
                };
                
                console.log(`🎯 Enhanced user profile updated:`, {
                    displayName: userProfile.displayName,
                    nickname: userProfile.nickname,
                    hasPhoto: !!userProfile.profilePhoto,
                    source: userProfile.source
                });
            } else {
                console.log(`⚠️ Could not load enhanced profile data, using basic wixUsers data`);
                console.log(`🔍 Profile response:`, profileData);
            }
        } catch (profileError) {
            console.warn("⚠️ Member profile API failed:", profileError);
        }

        // ✅ FALLBACK: Try to get richer profile data using currentMember if backend failed
        if (!userProfile.source || userProfile.source !== 'Members/FullData') {
            try {
                console.log("🔄 Backend failed, trying currentMember.getMember() for richer data...");
                const member = await currentMember.getMember();
                if (member && member.profile) {
                    console.log("✅ Got member profile from currentMember:", {
                        nickname: member.profile.nickname,
                        displayName: member.profile.displayName,
                        hasPhoto: !!member.profile.profilePhoto
                    });
                    
                    // Enhance userProfile with currentMember data
                    userProfile = {
                        ...userProfile,
                        displayName: member.profile.displayName || member.profile.nickname || userProfile.displayName,
                        nickname: member.profile.nickname || member.profile.displayName || userProfile.nickname,
                        firstName: member.profile.firstName || userProfile.firstName,
                        lastName: member.profile.lastName || userProfile.lastName,
                        profilePhoto: member.profile.profilePhoto || userProfile.profilePhoto,
                        about: member.profile.about || userProfile.about,
                        phone: member.profile.phone || userProfile.phone,
                        source: 'currentMember-fallback'
                    };
                    
                    console.log(`📈 User profile enhanced with currentMember data:`, {
                        displayName: userProfile.displayName,
                        nickname: userProfile.nickname,
                        hasPhoto: !!userProfile.profilePhoto,
                        source: userProfile.source
                    });
                }
            } catch (memberError) {
                console.warn("⚠️ currentMember.getMember() also failed:", memberError);
                userProfile.source = 'basic-wixUsers-only';
            }
        }

        // ✅ THEN: Load other data (memories, dive logs, etc.)
        console.log("📊 Loading user memories and dive logs...");
        const [memoriesRes, diveLogsRes, localDiveLogsRes] = await Promise.all([
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
            }),
            // ✅ ALSO TRY TO LOAD LOCAL DIVE LOGS FROM NEXT.JS BACKEND
            fetch(`https://kovaldeepai-main.vercel.app/api/analyze/dive-logs?userId=${realUserId}`, {
                headers: { 'Content-Type': 'application/json' }
            }).catch(err => {
                console.warn("⚠️ Local dive logs API failed:", err);
                return null;
            }),
        ]);

        const memoriesData = memoriesRes ? await safeJson(memoriesRes) : { data: [] };
        const diveLogsData = diveLogsRes ? await safeJson(diveLogsRes) : { data: [] };
        const localDiveLogsData = localDiveLogsRes ? await safeJson(localDiveLogsRes) : { data: [] };

        const userMemories = memoriesData.data || [];
        let userDiveLogs = diveLogsData.data || [];
        
        // ✅ MERGE LOCAL AND WIX DIVE LOGS, PRIORITIZE LOCAL
        const localDiveLogs = localDiveLogsData.data || localDiveLogsData.diveLogs || [];
        if (localDiveLogs.length > 0) {
            console.log(`✅ Found ${localDiveLogs.length} local dive logs, merging with Wix data`);
            
            // Combine and deduplicate dive logs
            const allDiveLogs = [...localDiveLogs, ...userDiveLogs];
            const uniqueDiveLogs = allDiveLogs.filter((dive, index, self) => 
                index === self.findIndex(d => d.id === dive.id || 
                    (d.date === dive.date && d.discipline === dive.discipline && d.reachedDepth === dive.reachedDepth))
            );
            
            userDiveLogs = uniqueDiveLogs;
            console.log(`✅ Merged dive logs: ${uniqueDiveLogs.length} total (${localDiveLogs.length} local + ${diveLogsData.data?.length || 0} Wix)`);
            
            // ✅ SYNC LOCAL DIVE LOGS TO WIX DATABASE FOR AI ACCESS
            if (localDiveLogs.length > 0) {
                syncLocalDiveLogsToWix(realUserId, localDiveLogs).catch(err => {
                    console.warn("⚠️ Could not sync local dive logs to Wix:", err);
                });
            }
        }

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
                profile: userData.profile,
                diveLogs: userData.userDiveLogs || []  // ✅ Include dive logs
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
                    userMessage: query,  // ✅ Using unified parameter for Next.js backend too
                    userId: userData.userId,
                    profile: userData.profile,
                    diveLogs: userData.userDiveLogs || [],  // ✅ Include dive logs for backup too
                    embedMode: true  // ✅ Indicate this is from embed/widget
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

// ===== 📊 DATASET INTEGRATION FUNCTIONS =====

/**
 * ✅ Initialize UserMemory Dataset with proper filtering
 */
function initializeUserMemoryDataset() {
    try {
        // ✅ Set up dataset filtering by current user
        if (wixUsers.currentUser.loggedIn) {
            const userId = wixUsers.currentUser.id;
            console.log('🔍 Filtering UserMemory dataset for user:', userId);
            
            // Check if dataset exists
            if ($w('#dataset1')) {
                // Filter dataset to show only current user's memories
                $w('#dataset1').setFilter(wixData.filter()
                    .eq('userId', userId)
                );
                
                // ✅ Load the data
                $w('#dataset1').loadPage()
                    .then(() => {
                        console.log('✅ UserMemory dataset loaded successfully');
                        console.log('📊 Loaded items:', $w('#dataset1').getTotalCount());
                    })
                    .catch((error) => {
                        console.error('❌ Error loading UserMemory dataset:', error);
                    });
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
        if (!wixUsers.currentUser.loggedIn) {
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

/**
 * ✅ Setup dataset event handlers
 */
function setupDatasetEventHandlers() {
    try {
        if ($w('#dataset1')) {
            // Handle dataset ready
            $w('#dataset1').onReady(() => {
                console.log('📊 UserMemory dataset is ready');
            });
            
            // Handle dataset errors
            $w('#dataset1').onError((error) => {
                console.error('❌ Dataset error:', error);
            });
            
            // Handle data changes
            $w('#dataset1').onCurrentItemChanged(() => {
                console.log('🔄 Dataset current item changed');
            });
        }
    } catch (error) {
        console.error('❌ Error setting up dataset handlers:', error);
    }
}

// ✅ Initialize dataset integration
setTimeout(() => {
    initializeUserMemoryDataset();
    setupDatasetEventHandlers();
}, 1000); // Give page time to load

/**
 * ✅ SYNC LOCAL DIVE LOGS TO WIX DATABASE
 */
async function syncLocalDiveLogsToWix(userId, localDiveLogs) {
    console.log(`🔄 Syncing ${localDiveLogs.length} local dive logs to Wix for user: ${userId}`);
    
    for (const diveLog of localDiveLogs) {
        try {
            // Convert local dive log format to Wix format
            const wixDiveLog = {
                userId: userId,
                ...diveLog,
                type: 'dive-log',
                source: 'local-sync',
                timestamp: diveLog.timestamp || new Date().toISOString(),
                memoryContent: `Dive Log: ${diveLog.discipline} at ${diveLog.location}, reached ${diveLog.reachedDepth}m (target: ${diveLog.targetDepth}m). ${diveLog.notes || 'No additional notes.'}`,
                logEntry: `${diveLog.date}: ${diveLog.discipline} dive at ${diveLog.location}`
            };
            
            // Save to Wix database via API
            const response = await fetch(DIVE_LOGS_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    userId: userId,
                    diveLog: wixDiveLog
                })
            });
            
            if (response.ok) {
                console.log(`✅ Synced dive log ${diveLog.id} to Wix`);
            } else {
                console.warn(`⚠️ Failed to sync dive log ${diveLog.id}:`, response.status);
            }
        } catch (error) {
            console.warn(`⚠️ Error syncing dive log ${diveLog.id}:`, error.message);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Local dive logs sync completed');
}
