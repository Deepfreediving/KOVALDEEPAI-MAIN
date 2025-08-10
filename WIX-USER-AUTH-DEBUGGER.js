// 🔥 WIX USER AUTHENTICATION DEBUGGER
// Copy this into the browser console on your Wix page to debug user authentication

console.log('🔥 DEBUGGING WIX USER AUTHENTICATION...');
console.log('=' .repeat(60));

async function debugWixAuth() {
    console.log('🔍 Step 1: Checking wixUsers.currentUser...');
    
    try {
        const wixUser = wixUsers.currentUser;
        console.log('👤 wixUsers.currentUser:', {
            exists: !!wixUser,
            loggedIn: wixUser?.loggedIn,
            id: wixUser?.id,
            nickname: wixUser?.nickname,
            displayName: wixUser?.displayName,
            loginEmail: wixUser?.loginEmail,
            raw: wixUser
        });
    } catch (e) {
        console.error('❌ wixUsers.currentUser error:', e);
    }
    
    console.log('\n🔍 Step 2: Checking currentMember.getMember()...');
    
    try {
        const member = await currentMember.getMember();
        console.log('👤 currentMember.getMember():', {
            exists: !!member,
            _id: member?._id,
            loggedIn: member?.loggedIn,
            nickname: member?.nickname,
            loginEmail: member?.loginEmail,
            profile: member?.profile,
            raw: member
        });
    } catch (e) {
        console.error('❌ currentMember.getMember() error:', e);
    }
    
    console.log('\n🔍 Step 3: Testing loadComprehensiveUserData()...');
    
    try {
        if (typeof loadComprehensiveUserData === 'function') {
            const userData = await loadComprehensiveUserData();
            console.log('📊 loadComprehensiveUserData result:', {
                userId: userData?.userId,
                isGuest: userData?.isGuest,
                displayName: userData?.profile?.displayName,
                loggedIn: userData?.profile?.loggedIn,
                raw: userData
            });
        } else {
            console.error('❌ loadComprehensiveUserData function not available');
        }
    } catch (e) {
        console.error('❌ loadComprehensiveUserData error:', e);
    }
    
    console.log('\n🔍 Step 4: Checking widget messages...');
    
    // Listen for widget messages
    let messageCount = 0;
    const messageListener = (event) => {
        if (event.data?.source === 'koval-ai-widget') {
            messageCount++;
            console.log(`📨 Widget Message #${messageCount}:`, event.data);
        }
    };
    
    window.addEventListener('message', messageListener);
    
    // Remove listener after 10 seconds
    setTimeout(() => {
        window.removeEventListener('message', messageListener);
        console.log(`\n📊 Captured ${messageCount} widget messages in 10 seconds`);
    }, 10000);
    
    console.log('\n🔍 Step 5: Triggering manual user data send...');
    
    try {
        // Find the widget
        const possibleIds = ['#koval-ai', '#KovalAiWidget', '#kovalAIWidget', '#KovalAIWidget', '#htmlComponent1', '#html1', '#customElement1'];
        let widget = null;
        
        for (const id of possibleIds) {
            try {
                widget = $w(id);
                if (widget) {
                    console.log(`✅ Found widget: ${id}`);
                    break;
                }
            } catch (e) {
                // Continue
            }
        }
        
        if (widget && typeof loadComprehensiveUserData === 'function') {
            const userData = await loadComprehensiveUserData();
            
            // Try to send data to widget
            setTimeout(() => {
                try {
                    if (widget.contentWindow) {
                        widget.contentWindow.postMessage({
                            type: 'USER_AUTH',
                            data: userData
                        }, '*');
                        console.log('📤 Sent user data via contentWindow');
                    }
                } catch (e) {
                    console.warn('⚠️ contentWindow failed:', e);
                }
                
                try {
                    if (typeof widget.postMessage === 'function') {
                        widget.postMessage({
                            type: 'USER_AUTH',
                            data: userData
                        });
                        console.log('📤 Sent user data via widget.postMessage');
                    }
                } catch (e) {
                    console.warn('⚠️ widget.postMessage failed:', e);
                }
            }, 1000);
        }
    } catch (e) {
        console.error('❌ Manual send failed:', e);
    }
    
    console.log('\n✅ Debug complete! Watch console for widget messages...');
}

// Auto-run the debug
debugWixAuth();
