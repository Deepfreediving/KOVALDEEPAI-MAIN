// ✅ KOVAL AI WIDGET LOADER FOR WIX BLOCKS
// This file should be used in your Wix Blocks Custom Element

$w.onReady(function () {
    console.log("🚀 Koval AI Widget Loader initializing...");
    
    try {
        // ✅ LOOK FOR IFRAME ELEMENT (KovalAIFrame from Wix Blocks)
        const iframe = $w('#KovalAIFrame');

        if (iframe) {
            // ✅ DETECT THEME FROM PARENT SITE
            const detectTheme = () => {
                try {
                    const parentDoc = window.parent ? window.parent.document : document;
                    const isDark = parentDoc.documentElement.classList.contains('dark') || 
                                  parentDoc.body.classList.contains('dark') ||
                                  window.getComputedStyle(parentDoc.body).backgroundColor.includes('rgb(0, 0, 0)');
                    return isDark ? 'dark' : 'light';
                } catch {
                    return 'light'; // Default fallback
                }
            };

            // ✅ GET USER DATA FROM WIX
            const getUserId = () => {
                try {
                    if (wixUsers && wixUsers.currentUser && wixUsers.currentUser.loggedIn) {
                        return wixUsers.currentUser.id;
                    }
                    return 'guest-' + Date.now();
                } catch {
                    return 'guest-' + Date.now();
                }
            };

            const theme = detectTheme();
            const userId = getUserId();
            const cacheParam = Date.now();

            // ✅ LOAD KOVAL AI EMBED WITH PROPER PARAMETERS
            const embedUrl = `https://kovaldeepai-main.vercel.app/embed?theme=${theme}&userId=${userId}&v=${cacheParam}`;
            
            iframe.src = embedUrl;
            
            // ✅ SET IFRAME PROPERTIES FOR BETTER DISPLAY
            iframe.style = {
                width: "100%",
                height: "600px",
                border: "1px solid #e1e5e9",
                borderRadius: "12px",
                overflow: "hidden"
            };

            console.log("✅ Koval AI embed loaded successfully");
            console.log(`🎨 Theme: ${theme}, User: ${userId}`);
            console.log(`🔗 Embed URL: ${embedUrl}`);

            // ✅ LISTEN FOR MESSAGES FROM IFRAME (optional)
            window.addEventListener('message', (event) => {
                if (event.origin === 'https://kovaldeepai-main.vercel.app') {
                    console.log('📨 Message from Koval AI:', event.data);
                    
                    // Handle specific message types if needed
                    if (event.data.type === 'WIDGET_RESIZE' && event.data.height) {
                        iframe.style.height = `${Math.min(event.data.height, 800)}px`;
                    }
                }
            });

        } else {
            console.error("❌ KovalAIFrame not found in this widget.");
            console.log("🔍 Available elements:", Object.keys($w).filter(k => k.startsWith('#')));
            
            // ✅ SHOW FALLBACK MESSAGE
            showFallbackMessage();
        }
        
    } catch (error) {
        console.error("❌ Error initializing Koval AI widget:", error);
        showFallbackMessage();
    }
});

// ✅ FALLBACK MESSAGE FUNCTION
function showFallbackMessage() {
    try {
        // Try to find any element to show error message
        const elements = ['#KovalAIFrame', '#koval-ai', '#htmlComponent1'];
        let targetElement = null;
        
        for (const id of elements) {
            try {
                targetElement = $w(id);
                if (targetElement) break;
            } catch (e) {
                // Continue to next element
            }
        }
        
        if (targetElement) {
            targetElement.html = `
                <div style="
                    padding: 20px; 
                    text-align: center; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 8px;
                    font-family: Arial, sans-serif;
                ">
                    <h3>🤿 Koval AI Loading...</h3>
                    <p>If this persists, please refresh the page.</p>
                    <button onclick="location.reload()" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                    ">🔄 Refresh</button>
                </div>
            `;
        }
    } catch (error) {
        console.error("❌ Could not show fallback message:", error);
    }
}

// ✅ OPTIONAL: PERIODIC HEALTH CHECK
setInterval(() => {
    const iframe = $w('#KovalAIFrame');
    if (iframe && !iframe.src) {
        console.warn("⚠️ Iframe src lost, reloading...");
        iframe.src = `https://kovaldeepai-main.vercel.app/embed?theme=light&userId=guest-${Date.now()}&v=${Date.now()}`;
    }
}, 30000); // Check every 30 seconds
