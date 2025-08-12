// ===== 🎯 wix-widget-loader-v4.js - OPTIMIZED FOR @deepfreediving/kovaldeepai-app =====
// This file loads the Koval AI widget with enhanced user detection and communication
// Version: 4.x - Clean version without syntax errors

(function() {
  'use strict';
  
  if (window.KovalAIWidgetLoaded) {
    console.log('✅ Koval AI Widget already loaded');
    return;
  }
  
  // ✅ PURE WIX APP APPROACH: Using only iframe, no external widget conflicts
  console.log('🎯 Loading Koval AI Wix App Widget v4...');
  
  window.KovalAIWidgetLoaded = true;

  // ✅ CONFIGURATION - Pure Wix App approach
  const CONFIG = {
    API_BASE: 'https://kovaldeepai-main.vercel.app',
    EMBED_URL: 'https://kovaldeepai-main.vercel.app/embed',
    DEBUG: true
  };

  // 🔒 ENHANCED WIX USER DETECTION - MEMBERS ONLY PLATFORM
  async function getWixUserData() {
    const userData = {
      userId: null,  // 🔒 No default guest - authentication required
      userName: null,
      userEmail: '',
      firstName: '',
      lastName: '',
      profilePicture: '',
      phone: '',
      bio: '',
      location: '',
      source: 'wix-widget-members-only',
      isGuest: false,  // 🔒 No guest access allowed
      wixId: null,
      requiresAuth: true  // 🔒 Flag that authentication is required
    };

    console.log('🔍 Detecting Wix user...');

    try {
      // Method 1: Check wixUsers from 'wix-users' module (most reliable)
      if (typeof wixUsers !== 'undefined' && wixUsers && wixUsers.currentUser) {
        console.log('📱 wixUsers API available, checking user status...');
        
        try {
          const loggedInUser = await wixUsers.currentUser.loggedIn();
          
          if (loggedInUser) {
            console.log('✅ User is logged in via wixUsers');
            
            // Get detailed member info
            const memberInfo = await wixUsers.currentUser.getMember();
            
            userData.userId = memberInfo.id || memberInfo._id;
            userData.wixId = userData.userId;
            userData.userName = memberInfo.profile?.nickname || memberInfo.profile?.firstName || 'Member';
            userData.userEmail = memberInfo.loginEmail || '';
            userData.firstName = memberInfo.profile?.firstName || '';
            userData.lastName = memberInfo.profile?.lastName || '';
            userData.profilePicture = memberInfo.profile?.profilePhoto?.url || '';
            userData.phone = memberInfo.profile?.phones?.[0] || '';
            userData.bio = memberInfo.profile?.bio || '';
            userData.location = memberInfo.profile?.location?.city || '';
            userData.source = 'wix-users-api';
            userData.isGuest = false;
            userData.requiresAuth = false;  // ✅ Successfully authenticated
            
            console.log('👤 Full user data via wixUsers:', {
              userId: userData.userId,
              userName: userData.userName,
              email: userData.userEmail
            });
            
            return userData;
          } else {
            console.log('🔒 User not logged in via wixUsers - requires authentication');
            return userData; // Return with requiresAuth: true
          }
        } catch (wixUsersError) {
          console.warn('⚠️ wixUsers API error:', wixUsersError.message);
        }
      }

      // Method 2: Check wixMembers from 'wix-members-frontend' (alternative)
      if (typeof wixMembers !== 'undefined' && wixMembers && wixMembers.authentication) {
        console.log('📱 wixMembers API available, checking authentication...');
        
        try {
          const memberData = await wixMembers.authentication.loggedInMember();
          
          if (memberData && memberData.member) {
            console.log('✅ User authenticated via wixMembers');
            
            userData.userId = memberData.member.id || memberData.member._id;
            userData.wixId = userData.userId;
            userData.userName = memberData.member.profile?.nickname || memberData.member.profile?.firstName || 'Member';
            userData.userEmail = memberData.member.loginEmail || '';
            userData.firstName = memberData.member.profile?.firstName || '';
            userData.lastName = memberData.member.profile?.lastName || '';
            userData.profilePicture = memberData.member.profile?.profilePhoto?.url || '';
            userData.source = 'wix-members-api';
            userData.isGuest = false;
            userData.requiresAuth = false;  // ✅ Successfully authenticated
            
            console.log('👤 User data via wixMembers:', {
              userId: userData.userId,
              userName: userData.userName,
              email: userData.userEmail
            });
            
            return userData;
          } else {
            console.log('🔒 User not authenticated via wixMembers - requires authentication');
            return userData; // Return with requiresAuth: true
          }
        } catch (wixMembersError) {
          console.warn('⚠️ wixMembers API error:', wixMembersError.message);
        }
      }

      // Method 3: Check global $w state (legacy support)
      if (typeof $w !== 'undefined' && $w && $w.site && $w.site.currentMember) {
        console.log('📱 $w API available, checking member...');
        
        try {
          const member = await $w.site.currentMember.getMember();
          
          if (member && member.id) {
            console.log('✅ User found via $w API');
            
            userData.userId = member.id;
            userData.wixId = userData.userId;
            userData.userName = member.profile?.nickname || member.profile?.firstName || 'Member';
            userData.userEmail = member.loginEmail || '';
            userData.firstName = member.profile?.firstName || '';
            userData.lastName = member.profile?.lastName || '';
            userData.source = 'wix-dollar-w-api';
            userData.isGuest = false;
            userData.requiresAuth = false;  // ✅ Successfully authenticated
            
            console.log('👤 User data via $w:', {
              userId: userData.userId,
              userName: userData.userName,
              email: userData.userEmail
            });
            
            return userData;
          }
        } catch (dollarWError) {
          console.warn('⚠️ $w API error:', dollarWError.message);
        }
      }

      // 🔒 NO GUEST FALLBACK - Member authentication required
      console.log('🔒 No authenticated user found - authentication required for this members-only platform');
      
      return userData; // Returns with requiresAuth: true
      
    } catch (error) {
      console.error('❌ Error detecting Wix user:', error);
      return userData; // Returns with requiresAuth: true
    }
  }

  // ✅ CONNECTION MONITORING
  function startConnectionMonitoring() {
    console.log('📊 Starting connection monitoring...');
    
    // Simple online/offline detection
    window.addEventListener('online', () => {
      console.log('📶 Connection restored');
    });
    
    window.addEventListener('offline', () => {
      console.log('📵 Connection lost');
    });
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
      iframe.src = `${CONFIG.EMBED_URL}?userId=${encodeURIComponent(userData.userId || '')}&userName=${encodeURIComponent(userData.userName || '')}`;
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
          if (!event || !event.origin) {
            return;
          }
          
          // Only accept messages from our domain
          if (!event.origin.includes('kovaldeepai-main.vercel.app') && 
              !event.origin.includes('localhost')) {
            return;
          }
          
          console.log('📨 Message from widget:', event.data);
          
          // Handle widget messages
          const messageType = event.data?.type;
          if (messageType === 'WIDGET_READY') {
            // Send user data when widget is ready
            try {
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                  type: 'USER_AUTH',
                  data: userData
                }, CONFIG.API_BASE);
                console.log('📤 Sent user data to widget');
              }
            } catch (authError) {
              console.error('❌ Failed to send USER_AUTH:', authError);
            }
          }
        } catch (error) {
          console.error('❌ Error in message listener:', error);
        }
      });
      
      // Send initial data after iframe loads
      setTimeout(() => {
        try {
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'INIT_USER_DATA',
              data: {
                ...userData,
                diveLogs: []  // Widget loader doesn't have access to dive logs, let the iframe fetch them
              }
            }, CONFIG.API_BASE);
            console.log('📤 Sent initial user data to widget');
          }
        } catch (messageError) {
          console.error('❌ Failed to send initial data:', messageError);
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Widget initialization failed:', error);
      
      const container = document.getElementById('koval-ai-widget');
      if (container) {
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
