// ===== 🎯 wix-widget-loader-v4.js - OPTIMIZED FOR @deepfreediving/kovaldeepai-app =====
// This file loads the Koval AI widget with enhanced user detection and communication
// Version: 4.x - Dynamic versioning for 4.0 release compatibility

(function() {
  'use strict';
  
  if (window.KovalAIWidgetLoaded) {
    console.log('✅ Koval AI Widget already loaded');
    return;
  }
  
  // ✅ PURE WIX APP APPROACH: Using only iframe, no external widget conflicts
  console.log('� Loading Koval AI Wix App Widget v4...');
  
  window.KovalAIWidgetLoaded = true;

  // ✅ CONFIGURATION - Pure Wix App approach
  const CONFIG = {
    API_BASE: 'https://kovaldeepai-main.vercel.app',
    EMBED_URL: 'https://kovaldeepai-main.vercel.app/embed',
    DEBUG: true
  };

  // ✅ ENHANCED WIX USER DETECTION
  async function getWixUserData() {
    const userData = {
      userId: 'guest-' + Date.now(),  // ✅ Use consistent guest format
      userName: 'Guest User',
      userEmail: '',
      firstName: '',
      lastName: '',
      profilePicture: '',
      phone: '',
      bio: '',
      location: '',
      source: 'wix-widget-enhanced',
      isGuest: true,
      wixId: null
    };

    console.log('🔍 Detecting Wix user...');

    try {
      // Method 1: Check wixUsers from 'wix-users' module (most reliable)
      if (typeof wixUsers !== 'undefined' && wixUsers && wixUsers.currentUser) {
        console.log('📱 wixUsers API available, checking user status...');
        
        try {
          const user = wixUsers.currentUser;
          if (user && user.loggedIn && user.id) {
            console.log('✅ Wix user found via wixUsers:', user);
            
            userData.userId = user.id;  // ✅ Use the actual Wix member ID (no prefix)
            userData.userName = user.nickname || user.displayName || user.loginEmail || 'Wix User';
            userData.userEmail = user.loginEmail || '';
            userData.wixId = user.id;
            userData.source = 'wix-users-api';
            userData.isGuest = false;
            
            // Try to get rich profile data from backend
            try {
              const profileResponse = await fetch('/_functions/memberProfile', {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Wix-App-ID': '@deepfreediving/kovaldeepai-app',
                  'X-App-Version': '4.x'
                }
              });
              
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                console.log('✅ Rich profile data fetched:', profileData);
                
                if (profileData.success && profileData.user) {
                  Object.assign(userData, {
                    firstName: profileData.user.firstName || '',
                    lastName: profileData.user.lastName || '',
                    profilePicture: profileData.user.profilePicture || '',
                    phone: profileData.user.phone || '',
                    bio: profileData.user.bio || '',
                    location: profileData.user.location || '',
                    customFields: profileData.user.customFields || {}
                  });
                }
              } else {
                console.warn('⚠️ Profile fetch failed:', profileResponse.status);
              }
            } catch (profileError) {
              console.warn('⚠️ Could not fetch rich profile:', profileError.message);
            }
            
            return userData;
          }
        } catch (userError) {
          console.warn('⚠️ wixUsers API error:', userError.message);
        }
      }

      // Method 2: Check $w.user API (Wix Blocks/Editor) as fallback
      if (typeof $w !== 'undefined' && $w && $w.user) {
        console.log('🔄 Trying $w.user as fallback...');
        
        try {
          const user = await $w.user.currentUser;
          if (user && user.loggedIn && user.id) {
            console.log('✅ Wix user found via $w.user:', user);
            
            userData.userId = user.id;
            userData.userName = user.nickname || user.displayName || user.loginEmail || 'Wix User';
            userData.userEmail = user.loginEmail || '';
            userData.wixId = user.id;
            userData.source = 'wix-blocks-api';
            userData.isGuest = false;
            
            return userData;
          }
        } catch (userError) {
          console.warn('⚠️ $w.user API error:', userError.message);
        }
      }

      // Method 3: Check window.wixUsers
      if (typeof window !== 'undefined' && window.wixUsers) {
        console.log('🌐 Checking window.wixUsers...');
        
        const currentUser = window.wixUsers.currentUser;
        if (currentUser && currentUser.loggedIn && currentUser.id) {
          console.log('✅ Wix user found via window.wixUsers:', currentUser);
          
          userData.userId = currentUser.id;  // ✅ Use the actual Wix member ID (no prefix)
          userData.userName = currentUser.displayName || currentUser.nickname || currentUser.loginEmail || 'Wix User';
          userData.userEmail = currentUser.loginEmail || '';
          userData.wixId = currentUser.id;
          userData.source = 'wix-window-api';
          userData.isGuest = false;
          
          return userData;
        }
      }

      // Method 4: Try backend connection test
      try {
        console.log('🔗 Testing backend connection...');
        const testResponse = await fetch('/_functions/wixConnection', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Wix-App-ID': '@deepfreediving/kovaldeepai-app',
            'X-App-Version': '4.x'
          }
        });
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log('✅ Backend connection successful:', testData);
          
          if (testData.services && testData.services.users && testData.services.users.userLoggedIn) {
            userData.userId = testData.services.users.userId;  // ✅ Use raw user ID consistently
            userData.source = 'wix-backend-detected';
            userData.isGuest = false;
            console.log('✅ User detected via backend:', userData);
          }
        } else {
          console.warn('⚠️ Backend connection failed:', testResponse.status);
        }
      } catch (backendError) {
        console.warn('⚠️ Backend connection error:', backendError.message);
      }

      // Method 5: Check for Wix session cookies/tokens
      if (typeof document !== 'undefined') {
        const cookies = document.cookie;
        if (cookies.includes('wix-session') || cookies.includes('XSRF-TOKEN')) {
          console.log('🍪 Wix session detected, but no user API available');
          userData.source = 'wix-session-detected';
        }
      }

    } catch (error) {
      console.error('❌ Error detecting Wix user:', error);
    }

    console.log('🔄 Final user data:', userData);
    
    // ✅ CRITICAL: Store user data globally for bot-widget access
    if (typeof window !== 'undefined') {
      window.wixUserId = userData.userId;
      window.wixUserName = userData.userName;
      window.KOVAL_USER_DATA = userData;
      console.log('✅ Stored user data globally - wixUserId:', userData.userId);
    }
    
    return userData;
  }

  // ✅ PERIODIC CONNECTION TESTING
  function startConnectionMonitoring() {
    const checkConnection = async () => {
      try {
        const response = await fetch('/_functions/wixConnection', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Wix-App-ID': '@deepfreediving/kovaldeepai-app',
            'X-App-Version': '4.x'
          }
        });
        
        const status = response.ok ? '✅ Connected' : '❌ Failed';
        console.log(`🔄 Periodic connection check: {wix: '${status}', status: ${response.status}, timestamp: '${new Date().toISOString()}'}`);
        
        return response.ok;
      } catch (error) {
        console.log(`🔄 Periodic connection check: {wix: '❌ Failed', status: 'network-error', timestamp: '${new Date().toISOString()}'}`);
        return false;
      }
    };

    // Check every 30 seconds
    setInterval(checkConnection, 30000);
    
    // Initial check
    checkConnection();
  }

  // ✅ LOAD AND INITIALIZE WIDGET
  async function initializeWidget() {
    try {
      console.log('🎯 Initializing Koval AI Widget...');
      
      // Start connection monitoring
      startConnectionMonitoring();
      
      // Get user data first
      const userData = await getWixUserData();
      console.log('👤 User data for widget:', userData);

      // Find the widget container
      const container = document.getElementById('koval-ai-widget');
      if (!container) {
        console.error('❌ Widget container #koval-ai-widget not found');
        return;
      }

      // Create iframe-based widget (no need to load bot-widget.js separately)
      const iframe = document.createElement('iframe');
      iframe.src = `${CONFIG.EMBED_URL}?userId=${encodeURIComponent(userData.userId)}&userName=${encodeURIComponent(userData.userName)}`;
      iframe.style.cssText = `
        width: 100%; 
        height: 100%; 
        min-height: 600px; 
        border: none;
        border-radius: 8px;
        background: #f8f9fa;
      `;
      iframe.allowFullscreen = true;
      iframe.allow = "microphone; camera; autoplay";
      
      // Add to container
      container.appendChild(iframe);
      
      console.log('🎉 Koval AI Widget (iframe-only) initialized successfully!');
      
      // Set up message listener for iframe communication
      window.addEventListener('message', (event) => {
        try {
          // ✅ Multiple layers of null checking
          if (!event) {
            console.warn('⚠️ Null event received');
            return;
          }
          
          if (!event.origin) {
            console.warn('⚠️ Event missing origin');
            return;
          }
          
          if (event.origin !== CONFIG.API_BASE) {
            return;
          }
          
          if (!event.data) {
            console.warn('⚠️ Event missing data');
            return;
          }
          
          if (typeof event.data !== 'object') {
            console.warn('⚠️ Event data is not an object:', typeof event.data);
            return;
          }
          
          if (!event.data || !event.data.hasOwnProperty('type') || !event.data.type) {
            console.warn('⚠️ Event data missing type property');
            return;
          }
          
          console.log('📨 Message from widget:', event.data);
          
          // Handle widget messages - with additional null check
          const messageType = event.data?.type;
          if (messageType === 'WIDGET_READY') {
            // Send user data when widget is ready
            try {
              if (iframe && iframe.contentWindow && !iframe.contentWindow.closed) {
                iframe.contentWindow.postMessage({
                  type: 'USER_AUTH',
                  data: userData
                }, CONFIG.API_BASE);
                console.log('📤 Sent user data to widget');
              } else {
                console.warn('⚠️ Iframe not available for USER_AUTH message');
              }
            } catch (authError) {
              console.error('❌ Failed to send USER_AUTH:', authError);
            }
          }
        } catch (error) {
          console.error('❌ Error in message listener:', error);
        }
      });
      
      // Send initial data after iframe loads with better error handling
      setTimeout(() => {
        try {
          if (iframe && iframe.contentWindow && !iframe.contentWindow.closed) {
            iframe.contentWindow.postMessage({
              type: 'INIT_USER_DATA',
              data: {
                ...userData,
                diveLogs: []  // Widget loader doesn't have access to dive logs, let the iframe fetch them
              }
            }, CONFIG.API_BASE);
            console.log('📤 Sent initial user data to widget');
          } else {
            console.warn('⚠️ Iframe not ready for message');
          }
        } catch (messageError) {
          console.error('❌ Failed to send initial data:', messageError);
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Widget initialization failed:', error);
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #e74c3c; 
                    font-family: system-ui, sans-serif; border: 1px solid #e74c3c; 
                    border-radius: 8px; background: #fdf2f2;">
          <h3>🚫 Widget Loading Error</h3>
          <p>Unable to load Koval AI chat widget.</p>
          <button onclick="location.reload()" 
                  style="padding: 8px 16px; background: #3498db; color: white; 
                         border: none; border-radius: 4px; cursor: pointer;">
            🔄 Retry
          </button>
        </div>
      `;
    }
    }
  }

  // ✅ WAIT FOR DOM AND INITIALIZE
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
  } else {
    initializeWidget();
  }

  // ✅ EXPORT FOR DEBUGGING
  window.KovalAI = {
    getWixUserData,
    initializeWidget,
    config: CONFIG,
    version: '4.x'
  };

  console.log('✅ Koval AI Widget Loader v4 ready');

})();
