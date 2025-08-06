// 🚀 UPDATED Koval AI Widget Loader for Wix Blocks v3.0
// This script should be used in your Wix Blocks Custom Element
// Copy this ENTIRE code into your Wix Blocks Custom Element

$w.onReady(async function () {
    console.log("🚀 Koval AI Widget Loader v3.0 initializing...");
    
    try {
        // Find the iframe element
        const iframe = $w('#KovalAIFrame');
        
        if (!iframe) {
            console.error("❌ KovalAIFrame not found in Wix Blocks");
            console.log("🔍 Available elements:", Object.keys($w).filter(k => k.startsWith('#')));
            return;
        }

        console.log("✅ Found KovalAIFrame element");

        // ✅ DETECT USER THEME
        const detectTheme = () => {
            try {
                const isDark = document.documentElement.classList.contains('dark') || 
                              document.body.classList.contains('dark') ||
                              window.getComputedStyle(document.body).backgroundColor.includes('rgb(0, 0, 0)');
                return isDark ? 'dark' : 'light';
            } catch {
                return 'light';
            }
        };

        // ✅ GET USER DATA
        const getUserData = async () => {
            try {
                if (typeof wixUsers !== 'undefined' && wixUsers.currentUser?.loggedIn) {
                    return {
                        userId: wixUsers.currentUser.id,
                        userName: wixUsers.currentUser.displayName || 'User',
                        userEmail: wixUsers.currentUser.loginEmail || '',
                        isGuest: false
                    };
                }
            } catch (error) {
                console.log("Using guest user:", error);
            }
            
            return {
                userId: 'guest-' + Date.now(),
                userName: 'Guest User',
                isGuest: true
            };
        };

        const userData = await getUserData();
        const theme = detectTheme();
        const cacheParam = Date.now();

        // ✅ LOAD EMBED WITH PROPER PARAMETERS
        const embedUrl = new URL("https://kovaldeepai-main.vercel.app/embed");
        embedUrl.searchParams.set('theme', theme);
        embedUrl.searchParams.set('userId', userData.userId);
        embedUrl.searchParams.set('userName', encodeURIComponent(userData.userName));
        embedUrl.searchParams.set('v', cacheParam);
        
        iframe.src = embedUrl.toString();
        
        console.log("✅ Koval AI embed loaded:", embedUrl.toString());
        console.log("👤 User data:", userData);
        console.log("🎨 Theme:", theme);

        // ✅ SETUP MESSAGE HANDLING BETWEEN IFRAME AND WIX
        let embedReady = false;
        
        // Helper function to get the correct target origin
        const getTargetOrigin = () => {
            return iframe.src.includes('localhost') ? 'http://localhost:3000' : 'https://kovaldeepai-main.vercel.app';
        };

        // Listen for messages from the embed
        const handleEmbedMessage = async (event) => {
            // Security check - be more permissive for development
            if (!event.data || (!event.origin.includes("kovaldeepai-main.vercel.app") && !event.origin.includes("localhost"))) {
                console.log("🚫 Ignoring message from:", event.origin);
                return;
            }
            
            console.log("📨 Message from embed:", event.data.type, event.data);

            switch (event.data.type) {
                case 'EMBED_READY':
                    embedReady = true;
                    console.log("✅ Embed is ready for communication");
                    
                    // Send initial user data to embed immediately
                    const targetOrigin = getTargetOrigin();
                    
                    iframe.contentWindow.postMessage({
                        type: 'USER_AUTH',
                        data: {
                            userId: userData.userId,
                            profile: { ...userData, userName: userData.userName },
                            diveLogs: [],
                            memories: []
                        }
                    }, targetOrigin);
                    
                    console.log("👤 User data sent to embed:", userData);
                    break;

                case 'CHAT_MESSAGE':
                    console.log("🤖 Processing chat message:", event.data.message);
                    
                    // Send to AI API directly from Wix
                    try {
                        const apiUrl = iframe.src.includes('localhost') 
                            ? "http://localhost:3000/api/chat-embed"
                            : "https://kovaldeepai-main.vercel.app/api/chat-embed";
                            
                        const response = await fetch(apiUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                message: event.data.message,
                                userId: event.data.userId || userData.userId,
                                profile: { ...userData, userName: userData.userName }
                            })
                        });

                        const data = await response.json();
                        const targetOrigin = getTargetOrigin();
                        
                        // Send AI response back to embed
                        iframe.contentWindow.postMessage({
                            type: 'AI_RESPONSE',
                            data: {
                                aiResponse: data.assistantMessage?.content || data.aiResponse || "I received your message!",
                                success: response.ok
                            }
                        }, targetOrigin);
                        
                        console.log("✅ AI response sent to embed");
                        
                    } catch (error) {
                        console.error("❌ Chat API error:", error);
                        
                        const targetOrigin = getTargetOrigin();
                        iframe.contentWindow.postMessage({
                            type: 'AI_RESPONSE',
                            data: {
                                aiResponse: "I'm having trouble responding right now. Please try again in a moment.",
                                success: false,
                                error: error.message
                            }
                        }, targetOrigin);
                    }
                    break;

                case 'SAVE_DIVE_LOG':
                    console.log("💾 Saving dive log:", event.data.diveLog);
                    
                    // Here you could integrate with Wix Data Collections if needed
                    // For now, just acknowledge the save
                    const targetOrigin = getTargetOrigin();
                    iframe.contentWindow.postMessage({
                        type: 'DATA_UPDATE',
                        data: {
                            success: true,
                            message: "Dive log saved locally"
                        }
                    }, targetOrigin);
                    break;

                default:
                    console.log("🔄 Unhandled message type:", event.data.type);
            }
        };

        // Add message listener for the entire window
        window.addEventListener('message', handleEmbedMessage);

        // ✅ THEME CHANGE DETECTION
        const themeObserver = new MutationObserver(() => {
            const newTheme = detectTheme();
            if (embedReady) {
                iframe.contentWindow.postMessage({
                    type: 'THEME_CHANGE',
                    data: { dark: newTheme === 'dark' }
                }, getTargetOrigin());
            }
        });

        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        // ✅ CLEANUP ON PAGE UNLOAD
        window.addEventListener('beforeunload', () => {
            themeObserver.disconnect();
            window.removeEventListener('message', handleEmbedMessage);
        });

        console.log("✅ Koval AI Widget Loader setup complete");

    } catch (error) {
        console.error("❌ Error initializing Koval AI widget:", error);
        
        // Show fallback UI in iframe
        try {
            const iframe = $w('#KovalAIFrame');
            if (iframe) {
                const fallbackHtml = `
                    <div style="
                        padding: 20px; 
                        text-align: center; 
                        font-family: Arial, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border-radius: 8px;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    ">
                        <h3>🤿 Koval AI Freediving Coach</h3>
                        <p>I'm having trouble loading right now.</p>
                        <button onclick="parent.location.reload()" style="
                            padding: 10px 20px; 
                            background: rgba(255,255,255,0.2); 
                            color: white; 
                            border: 2px solid rgba(255,255,255,0.3); 
                            border-radius: 5px; 
                            cursor: pointer;
                            font-size: 16px;
                        ">
                            🔄 Try Again
                        </button>
                        <div style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
                            Error: ${error.message || 'Unknown error'}
                        </div>
                    </div>
                `;
                iframe.src = "data:text/html;charset=utf-8," + encodeURIComponent(fallbackHtml);
            }
        } catch (fallbackError) {
            console.error("❌ Could not show fallback UI:", fallbackError);
        }
    }
});
