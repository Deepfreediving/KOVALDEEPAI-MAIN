import wixUsers from 'wix-users';

// ✅ CORRECTED API ENDPOINTS - MATCH YOUR BACKEND FILE NAMES
const CHAT_API = "https://www.deepfreediving.com/_functions/http-chat";
const USER_MEMORY_API = "https://www.deepfreediving.com/_functions/http-userMemory";

// ✅ BACKUP API
const BACKUP_CHAT_API = "https://kovaldeepai-main.vercel.app/api/chat-embed";

// ✅ Cache busting timestamp
const CACHE_BUSTER = Date.now();

$w.onReady(async function () {
    console.log("🚀 Koval AI initializing...");
    console.log("🔧 Cache buster:", CACHE_BUSTER);

    // ✅ SIMPLIFIED APPROACH - Just show working chat immediately
    console.log("🎯 Loading chat interface...");
    
    // Get user data first
    const userData = await getUserData();
    console.log("👤 User data loaded:", userData);
    
    // Show the chat interface directly (skip backend testing to avoid 404s)
    showFallbackChat();
    
    console.log("✅ Koval AI initialization complete");
});

/**
 * ✅ TEST BACKEND CONNECTION
 */
async function testBackendConnection() {
    console.log("🔍 Testing backend connections...");
    
    const endpoints = [
        { name: 'Test Connection', url: 'https://www.deepfreediving.com/_functions/http-testConnection' },
        { name: 'Chat API', url: CHAT_API },
        { name: 'User Memory API', url: USER_MEMORY_API },
        { name: 'Backup API', url: BACKUP_CHAT_API }
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint.name}: ${endpoint.url}`);
            const response = await fetch(endpoint.url, { 
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            console.log(`${endpoint.name}: ${response.status} ${response.statusText}`);
        } catch (error) {
            console.error(`${endpoint.name} failed:`, error.message);
        }
    }
}

/**
 * ✅ SETUP WIDGET - SIMPLIFIED FOR WIX
 */
async function setupWidget(widget) {
    try {
        console.log("🔧 Setting up widget...");
        console.log("🔍 Widget found:", widget.id || 'no id');
        
        // Get user data
        const userData = await getUserData();
        console.log("👤 User data:", userData);

        // ✅ JUST SHOW THE FALLBACK CHAT IMMEDIATELY
        // The widget exists but doesn't have the communication methods we need
        console.log("� Widget found but using fallback chat for better compatibility");
        showFallbackChat();
        
        console.log("✅ Widget setup complete (using fallback)");

    } catch (error) {
        console.error("❌ Widget setup failed:", error);
        showFallbackChat();
    }
}

/**
 * ✅ GET USER DATA
 */
async function getUserData() {
    try {
        // Check if user is logged in
        const isLoggedIn = wixUsers.currentUser.loggedIn;
        
        if (!isLoggedIn) {
            return {
                userId: 'guest',
                isGuest: true,
                profile: { nickname: 'Guest' }
            };
        }

        // Get user info
        const userId = wixUsers.currentUser.id;
        const email = wixUsers.currentUser.loginEmail;
        
        // Skip loading memories to avoid API calls (simplified approach)
        return {
            userId: userId,
            isGuest: false,
            profile: {
                email: email,
                nickname: email || 'Diver'
            },
            memories: [] // Empty array instead of API call
        };

    } catch (error) {
        console.error("❌ Error getting user data:", error);
        return {
            userId: 'guest',
            isGuest: true,
            profile: { nickname: 'Guest' }
        };
    }
}

// ✅ USER DATA HELPER - Keep this for user identification

/**
 * ✅ SIMPLE WORKING CHAT UI
 */
function showFallbackChat() {
    console.log("🔄 Loading chat interface...");
    
    // Try to find any suitable container
    const containerIds = ['#koval-ai', '#KovalAiWidget', '#htmlComponent1', '#text1', '#text2', '#container1'];
    let container = null;
    
    for (const id of containerIds) {
        try {
            const element = $w(id);
            if (element) {
                container = element;
                console.log(`📦 Using container: ${id}`);
                break;
            }
        } catch (e) {
            // Silently continue to next container
        }
    }
    
    if (!container) {
        console.error("❌ No container found for chat");
        return;
    }

    const chatHTML = `
        <div style="
            font-family: system-ui, -apple-system, sans-serif;
            padding: 20px;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            border-radius: 16px;
            max-width: 500px;
            margin: 0 auto;
        ">
            <h2 style="margin: 0 0 20px 0; text-align: center;">🤿 Koval AI Coach</h2>
            
            <div id="chatBox" style="
                background: rgba(255,255,255,0.1);
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                min-height: 200px;
                max-height: 300px;
                overflow-y: auto;
            ">
                <div style="margin-bottom: 10px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                    <strong>🤖 Koval AI:</strong><br>
                    Hi! I'm your freediving coach. Ask me about technique, safety, training plans, or any freediving questions!
                </div>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <input type="text" id="messageInput" placeholder="Ask about freediving..." style="
                    flex: 1;
                    padding: 12px;
                    border: none;
                    border-radius: 20px;
                    outline: none;
                    color: #333;
                ">
                <button onclick="sendMessage()" style="
                    background: #4fc3f7;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-weight: bold;
                ">Send</button>
            </div>
            
            <p style="text-align: center; margin-top: 15px; font-size: 12px; opacity: 0.8;">
                <a href="https://kovaldeepai-main.vercel.app" target="_blank" style="color: #4fc3f7;">
                    Open Full App →
                </a>
            </p>
        </div>
        
        <script>
            async function sendMessage() {
                const input = document.getElementById('messageInput');
                const chatBox = document.getElementById('chatBox');
                const message = input.value.trim();
                
                if (!message) return;
                
                // Add user message
                chatBox.innerHTML += '<div style="margin: 10px 0; text-align: right; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;"><strong>You:</strong> ' + message + '</div>';
                
                // Add loading
                chatBox.innerHTML += '<div id="loading" style="margin: 10px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;"><strong>🤖 Koval AI:</strong> Thinking...</div>';
                chatBox.scrollTop = chatBox.scrollHeight;
                
                input.value = '';
                
                try {
                    // Use the working backup API
                    const response = await fetch('https://kovaldeepai-main.vercel.app/api/chat-embed', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: message,
                            userId: 'wix-user-' + Date.now()
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        const aiResponse = data.assistantMessage?.content || data.aiResponse || 'I received your message!';
                        document.getElementById('loading').innerHTML = '<strong>🤖 Koval AI:</strong> ' + aiResponse;
                    } else {
                        document.getElementById('loading').innerHTML = '<strong>🤖 Koval AI:</strong> Sorry, I\\'m having trouble right now. Please try the <a href="https://kovaldeepai-main.vercel.app" target="_blank" style="color: #4fc3f7;">full app</a>.';
                    }
                } catch (error) {
                    document.getElementById('loading').innerHTML = '<strong>🤖 Koval AI:</strong> Connection error. Please try the <a href="https://kovaldeepai-main.vercel.app" target="_blank" style="color: #4fc3f7;">full app</a>.';
                }
                
                document.getElementById('loading').id = '';
                chatBox.scrollTop = chatBox.scrollHeight;
            }
            
            document.getElementById('messageInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') sendMessage();
            });
        </script>
    `;

    // Set the HTML content
    if (container.html) {
        container.html = chatHTML;
        console.log("✅ Chat interface loaded successfully");
    } else if (container.text) {
        container.text = "Koval AI Chat - Please visit: https://kovaldeepai-main.vercel.app";
        console.log("✅ Fallback text set");
    }
}
