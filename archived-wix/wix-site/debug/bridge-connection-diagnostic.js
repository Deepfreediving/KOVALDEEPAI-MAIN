// ===== 🌉 BRIDGE CONNECTION DIAGNOSTIC =====
// Run this in browser console on: https://www.deepfreediving.com/large-koval-deep-ai-page
// This diagnostic focuses on the message bridge between Wix page and iframe widget
/* eslint-disable no-undef */

function runBridgeConnectionDiagnostic() {
    console.log('🌉 Bridge Connection Diagnostic Starting...');
    console.log('==============================================');
    
    // 1. Check Wix APIs availability
    console.log('\n1. 🔍 Wix APIs Availability:');
    checkWixAPIs();
    
    // 2. Check iframe presence and connectivity
    console.log('\n2. 🖼️ Iframe Connectivity:');
    checkIframeConnectivity();
    
    // 3. Test message passing
    console.log('\n3. 📨 Message Bridge Test:');
    testMessageBridge();
    
    // 4. Check user data flow
    console.log('\n4. 👤 User Data Flow Test:');
    testUserDataFlow();
    
    // 5. Check COEP headers
    console.log('\n5. 🔒 COEP Headers Check:');
    checkCOEPHeaders();
}

function checkWixAPIs() {
    const apis = {
        '$w': typeof $w !== 'undefined',
        'wixData': typeof wixData !== 'undefined',
        'wixStorage': typeof wixStorage !== 'undefined',
        'currentMember': typeof currentMember !== 'undefined',
        'wixLocation': typeof wixLocation !== 'undefined',
        'wixUsers': typeof wixUsers !== 'undefined'
    };
    
    console.log('   📊 Wix APIs Status:');
    Object.entries(apis).forEach(([name, available]) => {
        console.log(`      ${available ? '✅' : '❌'} ${name}: ${available ? 'Available' : 'Not Available'}`);
    });
    
    // Check if we're in Wix environment
    const isWixEnvironment = apis['$w'] || apis['wixData'] || window.location.hostname.includes('wix');
    console.log(`   🏠 Environment: ${isWixEnvironment ? 'Wix Site' : 'External Site'}`);
    
    // Check session management state
    if (typeof window !== 'undefined' && typeof window.globalSessionData !== 'undefined') {
        console.log('   📋 Session Data:', {
            userId: window.globalSessionData.userId ? 'Set' : 'Not Set',
            connectionStatus: window.globalSessionData.connectionStatus,
            isAuthenticated: window.globalSessionData.isAuthenticated,
            widgetReady: window.globalSessionData.widgetReady
        });
    } else if (typeof globalSessionData !== 'undefined') {
        console.log('   📋 Session Data:', {
            userId: globalSessionData.userId ? 'Set' : 'Not Set',
            connectionStatus: globalSessionData.connectionStatus,
            isAuthenticated: globalSessionData.isAuthenticated,
            widgetReady: globalSessionData.widgetReady
        });
    } else {
        console.log('   ❌ globalSessionData not found');
    }
}

function checkIframeConnectivity() {
    const iframes = document.querySelectorAll('iframe');
    const kovalIframes = Array.from(iframes).filter(iframe => 
        iframe.src && iframe.src.includes('kovaldeepai-main.vercel.app')
    );
    
    console.log(`   📊 Total iframes: ${iframes.length}`);
    console.log(`   🎯 Koval AI iframes: ${kovalIframes.length}`);
    
    if (kovalIframes.length === 0) {
        console.log('   ❌ No Koval AI iframe found!');
        return null;
    }
    
    kovalIframes.forEach((iframe, index) => {
        console.log(`   🖼️ Iframe #${index + 1}:`);
        console.log(`      🔗 URL: ${iframe.src}`);
        console.log(`      📐 Size: ${iframe.offsetWidth}x${iframe.offsetHeight}`);
        console.log(`      👁️ Visible: ${iframe.offsetWidth > 0 && iframe.offsetHeight > 0}`);
        console.log(`      🔄 Content Window: ${iframe.contentWindow ? 'Available' : 'Blocked'}`);
        
        // Check iframe load state
        try {
            if (iframe.contentDocument) {
                console.log(`      📄 Content Document: Accessible`);
                console.log(`      🔄 Ready State: ${iframe.contentDocument.readyState}`);
            } else {
                console.log(`      📄 Content Document: Blocked (CORS/COEP)`);
            }
        } catch (e) {
            console.log(`      📄 Content Document: Blocked (${e.message})`);
        }
    });
    
    return kovalIframes[0]; // Return first iframe for testing
}

function testMessageBridge() {
    const iframe = document.querySelector('iframe[src*="kovaldeepai-main.vercel.app"]');
    
    if (!iframe) {
        console.log('   ❌ No iframe found for message testing');
        return;
    }
    
    console.log('   📤 Attempting to send test message to iframe...');
    
    // Set up message listener first
    const messageListener = (event) => {
        if (event.origin.includes('kovaldeepai-main.vercel.app')) {
            console.log('   📥 Received response from iframe:', event.data);
            window.removeEventListener('message', messageListener);
        }
    };
    
    window.addEventListener('message', messageListener);
    
    // Send test message
    const testMessage = {
        type: 'BRIDGE_TEST',
        source: 'wix-page-diagnostic',
        timestamp: Date.now(),
        data: {
            message: 'Bridge connection test from Wix page'
        }
    };
    
    try {
        iframe.contentWindow.postMessage(testMessage, 'https://kovaldeepai-main.vercel.app');
        console.log('   ✅ Test message sent successfully');
        
        // Clean up listener after 5 seconds if no response
        setTimeout(() => {
            window.removeEventListener('message', messageListener);
            console.log('   ⏰ Message test timeout - no response received');
        }, 5000);
        
    } catch (error) {
        console.log('   ❌ Failed to send test message:', error.message);
        window.removeEventListener('message', messageListener);
    }
}

function testUserDataFlow() {
    console.log('   🔍 Testing user data flow...');
    
    // Try to get user data from Wix APIs
    if (typeof currentMember !== 'undefined') {
        currentMember.getMember()
            .then(member => {
                if (member) {
                    console.log('   ✅ Wix member data found:', {
                        id: member._id,
                        email: member.loginEmail,
                        loggedIn: member.loggedIn || 'unknown'
                    });
                    
                    // Test sending this data to iframe
                    sendUserDataToIframe(member);
                } else {
                    console.log('   ℹ️ No authenticated Wix member');
                    testGuestUserFlow();
                }
            })
            .catch(error => {
                console.log('   ⚠️ Error getting Wix member:', error.message);
                testGuestUserFlow();
            });
    } else {
        console.log('   ❌ currentMember API not available');
        testGuestUserFlow();
    }
}

function sendUserDataToIframe(memberData) {
    const iframe = document.querySelector('iframe[src*="kovaldeepai-main.vercel.app"]');
    
    if (!iframe) {
        console.log('   ❌ No iframe to send user data to');
        return;
    }
    
    const userData = {
        type: 'USER_AUTH',
        source: 'wix-page-diagnostic',
        timestamp: Date.now(),
        data: {
            userId: memberData._id,
            userName: memberData.profile?.nickname || memberData.loginEmail || 'User',
            userEmail: memberData.loginEmail,
            isWixMember: true,
            source: 'diagnostic-test'
        }
    };
    
    try {
        iframe.contentWindow.postMessage(userData, 'https://kovaldeepai-main.vercel.app');
        console.log('   📤 Sent user data to iframe:', userData.data.userId);
    } catch (error) {
        console.log('   ❌ Failed to send user data:', error.message);
    }
}

function testGuestUserFlow() {
    console.log('   👤 Testing guest user flow...');
    
    const iframe = document.querySelector('iframe[src*="kovaldeepai-main.vercel.app"]');
    
    if (!iframe) {
        console.log('   ❌ No iframe to send guest data to');
        return;
    }
    
    const guestData = {
        type: 'USER_AUTH',
        source: 'wix-page-diagnostic',
        timestamp: Date.now(),
        data: {
            userId: 'guest_' + Date.now(),
            userName: 'Guest User',
            userEmail: '',
            isWixMember: false,
            isGuest: true,
            source: 'diagnostic-guest-test'
        }
    };
    
    try {
        iframe.contentWindow.postMessage(guestData, 'https://kovaldeepai-main.vercel.app');
        console.log('   📤 Sent guest user data to iframe');
    } catch (error) {
        console.log('   ❌ Failed to send guest data:', error.message);
    }
}

function checkCOEPHeaders() {
    console.log('   🔍 Checking COEP headers...');
    
    // Test fetch to iframe URL to check headers
    fetch('https://kovaldeepai-main.vercel.app/embed', {
        method: 'HEAD'
    })
    .then(response => {
        console.log('   📊 Response Headers:');
        console.log(`      🔒 Cross-Origin-Embedder-Policy: ${response.headers.get('Cross-Origin-Embedder-Policy') || 'Not Set'}`);
        console.log(`      🔐 Cross-Origin-Opener-Policy: ${response.headers.get('Cross-Origin-Opener-Policy') || 'Not Set'}`);
        console.log(`      🛡️ Cross-Origin-Resource-Policy: ${response.headers.get('Cross-Origin-Resource-Policy') || 'Not Set'}`);
        console.log(`      🚫 X-Frame-Options: ${response.headers.get('X-Frame-Options') || 'Not Set'}`);
        console.log(`      🔧 Content-Security-Policy: ${response.headers.get('Content-Security-Policy') ? 'Present' : 'Not Set'}`);
    })
    .catch(error => {
        console.log('   ❌ Could not check headers:', error.message);
    });
}

// Auto-fix function
function autoFixBridgeConnection() {
    console.log('🔧 Attempting to auto-fix bridge connection...');
    
    // 1. Check if widget exists
    const iframe = document.querySelector('iframe[src*="kovaldeepai-main.vercel.app"]');
    
    if (!iframe) {
        console.log('❌ No iframe found - cannot auto-fix');
        return;
    }
    
    // 2. Send EMBED_READY message to trigger initialization
    const readyMessage = {
        type: 'EMBED_READY',
        source: 'wix-page-autofix',
        timestamp: Date.now()
    };
    
    try {
        iframe.contentWindow.postMessage(readyMessage, 'https://kovaldeepai-main.vercel.app');
        console.log('✅ Sent EMBED_READY message');
    } catch (error) {
        console.log('❌ Failed to send EMBED_READY:', error.message);
    }
    
    // 3. Wait 2 seconds then send user data
    setTimeout(() => {
        if (typeof getUserDataWithFallback === 'function') {
            getUserDataWithFallback()
                .then(userData => {
                    const userMessage = {
                        type: 'USER_AUTH',
                        source: 'wix-page-autofix',
                        timestamp: Date.now(),
                        data: userData
                    };
                    
                    iframe.contentWindow.postMessage(userMessage, 'https://kovaldeepai-main.vercel.app');
                    console.log('✅ Sent user auth data');
                })
                .catch(error => {
                    console.log('❌ Failed to get user data:', error.message);
                });
        }
    }, 2000);
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.runBridgeConnectionDiagnostic = runBridgeConnectionDiagnostic;
    window.autoFixBridgeConnection = autoFixBridgeConnection;
}

console.log('🌉 Bridge Connection Diagnostic loaded!');
console.log('📋 Available commands:');
console.log('   runBridgeConnectionDiagnostic() - Full bridge diagnostic');
console.log('   autoFixBridgeConnection() - Attempt to auto-fix connection');
console.log('');
console.log('🚀 Start with: runBridgeConnectionDiagnostic()');
