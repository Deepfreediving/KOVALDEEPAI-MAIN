// ===== 🎯 wix-widget-loader-v4.js - ROBUST VERSION =====
// This file loads the Koval AI widget with enhanced user detection and communication

(function() {
  'use strict';
  
  if (window.KovalAIWidgetLoaded) {
    console.log('✅ Koval AI Widget already loaded');
    return;
  }
  
  window.KovalAIWidgetLoaded = true;
  console.log('🚀 Loading Koval AI Widget v4...');

  // ✅ CONFIGURATION
  const CONFIG = {
    WIDGET_URL: 'https://kovaldeepai-main.vercel.app/public/bot-widget.js',
    API_BASE: 'https://kovaldeepai-main.vercel.app',
    EMBED_URL: 'https://kovaldeepai-main.vercel.app/embed',
    DEBUG: true
  };

  // ✅ ENHANCED WIX USER DETECTION
  async function getWixUserData() {
    const userData = {
      userId: 'wix-guest-' + Date.now(),
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
      // Method 1: Check $w.user API (Wix Blocks/Editor)
      if (typeof $w !== 'undefined' && $w && $w.user) {
        console.log('📱 Wix Editor available, checking user status...');
        
        try {
          const user = await $w.user.currentUser;
          if (user && user.loggedIn && user.id) {
            console.log('✅ Wix user found via $w.user:', user);
            
            userData.userId = 'wix-' + user.id;
            userData.userName = user.nickname || user.displayName || user.loginEmail || 'Wix User';
            userData.userEmail = user.loginEmail || '';
            userData.wixId = user.id;
            userData.source = 'wix-user-api';
            userData.isGuest = false;
            
            // Try to get rich profile data from backend
            try {
              const profileResponse = await fetch('/_functions/getUserProfile', {
                method: 'GET',
                credentials: 'include'
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
          console.warn('⚠️ $w.user API error:', userError.message);
        }
      }

      // Method 2: Check window.wixUsers
      if (typeof window !== 'undefined' && window.wixUsers) {
        console.log('🌐 Checking window.wixUsers...');
        
        const currentUser = window.wixUsers.currentUser;
        if (currentUser && currentUser.loggedIn && currentUser.id) {
          console.log('✅ Wix user found via window.wixUsers:', currentUser);
          
          userData.userId = 'wix-' + currentUser.id;
          userData.userName = currentUser.displayName || currentUser.nickname || currentUser.loginEmail || 'Wix User';
          userData.userEmail = currentUser.loginEmail || '';
          userData.wixId = currentUser.id;
          userData.source = 'wix-window-api';
          userData.isGuest = false;
          
          return userData;
        }
      }

      // Method 3: Try backend connection test
      try {
        console.log('🔗 Testing backend connection...');
        const testResponse = await fetch('/_functions/wixConnection', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log('✅ Backend connection successful:', testData);
          
          if (testData.services && testData.services.users && testData.services.users.userLoggedIn) {
            userData.userId = 'wix-' + testData.services.users.userId;
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

      // Method 4: Check for Wix session cookies/tokens
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
    return userData;
  }

  // ✅ PERIODIC CONNECTION TESTING
  function startConnectionMonitoring() {
    const checkConnection = async () => {
      try {
        const response = await fetch('/_functions/wixConnection', {
          method: 'GET',
          credentials: 'include'
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

      // Load the widget script
      const script = document.createElement('script');
      script.src = CONFIG.WIDGET_URL;
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Widget script loaded successfully');
        
        // Create the widget element
        const widget = document.createElement('koval-ai');
        widget.style.cssText = `
          width: 100%; 
          height: 100%; 
          min-height: 600px; 
          display: block;
        `;
        
        // Pass user data to widget
        widget.setAttribute('data-user', JSON.stringify(userData));
        
        // Add to container
        container.appendChild(widget);
        
        console.log('🎉 Koval AI Widget initialized successfully!');
        
        // Optional: Test communication
        setTimeout(() => {
          if (widget.postMessage) {
            widget.postMessage('USER_AUTH', userData);
            console.log('📤 Sent initial user data to widget');
          }
        }, 1000);
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load widget script');
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
      };
      
      document.head.appendChild(script);
      
    } catch (error) {
      console.error('❌ Widget initialization failed:', error);
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
    version: '4.0.0'
  };

  console.log('✅ Koval AI Widget Loader v4 ready');

})();
