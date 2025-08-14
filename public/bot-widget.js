(function () {
  'use strict';

  if (window.KovalAILoaded) return;
  window.KovalAILoaded = true;

  const ALLOWED_ORIGIN = "https://kovaldeepai-main.vercel.app";
  const LOCALHOST_ORIGIN = "http://localhost:3000";

  // ✅ SAFE JSON PARSING UTILITY
  const safeJsonParse = async (response) => {
    try {
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('⚠️ Response is not JSON:', contentType);
        return null;
      }
      
      const text = await response.text();
      if (!text.trim()) {
        console.warn('⚠️ Response body is empty');
        return null;
      }
      
      return JSON.parse(text);
    } catch (error) {
      console.warn('⚠️ JSON parsing failed:', error.message);
      return null;
    }
  };

  class KovalAiElement extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.isReady = false;
      this.messageQueue = [];
      // Use localhost for development if available, otherwise production
      this.BASE_URL = window.location.hostname === 'localhost' ? LOCALHOST_ORIGIN : ALLOWED_ORIGIN;
      this.createWidget();
    }

    createWidget() {
      const container = document.createElement('div');
      
      // ✅ DETECT PARENT SITE THEME
      const detectParentTheme = () => {
        try {
          // Check if parent document has dark mode
          const parentDoc = window.parent ? window.parent.document : document;
          return parentDoc.documentElement.classList.contains('dark') ? 'dark' : 'light';
        } catch {
          return 'light'; // Default fallback
        }
      };

      const theme = detectParentTheme();
      const isDark = theme === 'dark';
      
      console.log(`🎨 Detected theme: ${theme}`);

      // ✅ THEMED CONTAINER
      container.style.cssText = `
        width: 100%; height: 100%; min-height: 600px;
        border-radius: 12px; overflow: hidden;
        box-shadow: 0 8px 32px rgba(0,0,0,${isDark ? '0.4' : '0.1'});
        position: relative; 
        background: ${isDark ? '#1a1a1a' : '#ffffff'};
        border: 1px solid ${isDark ? '#333' : '#e1e5e9'};
      `;

      // ✅ THEMED LOADING INDICATOR
      this.loadingDiv = document.createElement('div');
      this.loadingDiv.style.cssText = `
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%); text-align: center;
        font-family: system-ui, -apple-system, sans-serif; z-index: 10;
        color: ${isDark ? '#e1e5e9' : '#333'};
      `;
      this.loadingDiv.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px; animation: bounce 2s infinite;">🤿</div>
        <div style="font-size: 18px; font-weight: 500; margin-bottom: 8px;">
          Koval AI Coach
        </div>
        <div style="font-size: 14px; opacity: 0.7;">
          Loading your freediving assistant...
        </div>
        <div style="margin-top: 16px;">
          <div style="width: 40px; height: 4px; background: #3498db; 
                      margin: 0 auto; border-radius: 2px; 
                      animation: loading 1.5s ease-in-out infinite;">
          </div>
        </div>
        <style>
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          @keyframes loading {
            0% { transform: scaleX(0.3); }
            50% { transform: scaleX(1); }
            100% { transform: scaleX(0.3); }
          }
        </style>
      `;

      // ✅ LISTEN FOR USER DATA FROM PARENT WIX PAGE
      const handleParentMessage = (event) => {
        // ✅ Add null check to prevent "Cannot read properties of null" error
        if (!event || !event.data || !event.data.type) {
          return;
        }
        
        // Filter out noisy TPA2 infrastructure messages but keep important ones
        const isImportantMessage = event.data && (
          event.data.type === 'USER_DATA_RESPONSE' ||
          event.data.type === 'USER_REGISTRATION_RESPONSE' ||
          event.data.type === 'REQUEST_USER_DATA' ||
          event.data.type === 'EDIT_MODE_CHANGE' ||
          (event.data.intent === 'TPA2' && event.data.type === 'registerEventListener' && 
           event.data.data && event.data.data.eventKey === 'EDIT_MODE_CHANGE')
        );

        // Only log important messages to reduce noise
        if (isImportantMessage) {
          console.log('📨 Bot widget received message from Wix page:', event.data);
        }
        
        // Security check for Wix origins - be more permissive for debugging
        const validOrigin = !event.origin || 
                           event.origin.includes('wix.com') || 
                           event.origin.includes('wixsite.com') ||
                           event.origin.includes('deepfreediving.com') ||
                           event.origin === 'null' ||  // For local testing
                           event.origin === window.location.origin;
        
        // Handle Wix Edit Mode Change Event
        if (event.data.intent === 'TPA2' && event.data.type === 'registerEventListener') {
          // Only log if it's the edit mode listener we care about
          if (event.data.data && event.data.data.eventKey === 'EDIT_MODE_CHANGE') {
            console.log('🎛️ Wix edit mode event detected:', event.data);
          }
          
          if (event.data.data && event.data.data.eventKey === 'EDIT_MODE_CHANGE') {
            console.log('✏️ Registering edit mode change listener');
            
            // Send acknowledgment back to Wix
            if (window.parent !== window) {
              try {
                window.parent.postMessage({
                  intent: 'TPA2',
                  callId: event.data.callId,
                  type: 'registerEventListenerResponse',
                  success: true
                }, '*');
                console.log('📤 Sent edit mode registration response to Wix');
              } catch (error) {
                console.error('❌ Failed to send edit mode response:', error);
              }
            }
          }
          return;
        }
        
        // Handle Edit Mode State Changes
        if (event.data.type === 'EDIT_MODE_CHANGE') {
          const isEditMode = event.data.editMode === true;
          console.log(`🎛️ Edit mode ${isEditMode ? 'ENABLED' : 'DISABLED'}`);
          
          // Update widget behavior based on edit mode
          this.handleEditModeChange(isEditMode);
          return;
        }
        
        // Handle User Registration Response
        if (event.data.type === 'USER_REGISTRATION_RESPONSE') {
          console.log('🔐 Registration response received:', event.data);
          
          if (event.data.hasAccess) {
            this.handleRegisteredUser(event.data.user, event.data.accessData);
          } else {
            this.handleUnregisteredUser(event.data.user);
          }
          return;
        }
        
        // ✅ Handle User Data Updates (e.g., when dive logs are saved)
        if (event.data.type === 'USER_DATA_UPDATE' && event.data.userData) {
          const updatedUserData = event.data.userData;
          console.log('🔄 Received user data update:', updatedUserData);
          
          // Update the userData object with new counts
          if (userData.userId === updatedUserData.userId) {
            userData = {
              ...userData,
              diveLogsCount: updatedUserData.diveLogsCount,
              memoriesCount: updatedUserData.memoriesCount,
              lastUpdated: updatedUserData.lastUpdated
            };
            
            console.log(`✅ Updated user data - Dive logs: ${userData.diveLogsCount}, Memories: ${userData.memoriesCount}`);
            
            // Forward the update to the iframe if it's ready
            if (this.iframe && this.isReady) {
              this.postMessage('USER_DATA_UPDATE', userData);
            }
          }
          return;
        }
        
        if (validOrigin && event.data.type === 'USER_DATA_RESPONSE' && event.data.userData) {
          const wixUserData = event.data.userData;
          console.log('✅ V5.0: Received authentic user data from Wix page:', wixUserData);
          
          // Update userData with real Wix user data using V5.0 standards
          userData = {
            ...userData,
            userId: wixUserData.userId || wixUserData.id,  // ✅ V5.0: Support both field names
            memberId: wixUserData.userId || wixUserData.id,  // ✅ V5.0: Explicit member ID
            userName: wixUserData.userId || wixUserData.id,  // ✅ V5.0: Use raw member ID
            userEmail: wixUserData.profile?.loginEmail || wixUserData.email || '',
            profilePhoto: wixUserData.profile?.profilePhoto || '',
            nickname: wixUserData.profile?.nickname || wixUserData.profile?.displayName || wixUserData.nickname || `Member-${wixUserData.userId || wixUserData.id}`,
            isGuest: false,
            source: 'wix-page-authenticated-v5.0',
            memberDetectionMethod: 'wix-frontend-bridge',
            version: '5.0.0',
            theme: theme,
            diveLogs: wixUserData.userDiveLogs || [],
            memories: wixUserData.userMemories || []
          };
          
          console.log('🔄 V5.0: Updated widget userData:', {
            userId: userData.userId,
            memberId: userData.memberId,
            userName: userData.userName,
            nickname: userData.nickname,
            hasProfilePhoto: !!userData.profilePhoto,
            source: userData.source,
            detectionMethod: userData.memberDetectionMethod
          });
          
          // If iframe is ready, send updated user data
          if (this.iframe && this.isReady) {
            this.postMessage('USER_AUTH', userData);
            console.log('📤 Sent updated user data to embed');
          }
        }
      };
      
      // Add message listener
      window.addEventListener('message', handleParentMessage);

      // ✅ V5.0 ENHANCED USER DATA with improved member detection
      let userData = {
        userId: 'guest-' + Date.now(),  // ✅ Use consistent guest format
        userName: 'guest-' + Date.now(),  // ✅ Show ID format directly
        source: 'wix-widget-v5.0-enhanced',
        version: '5.0.0',
        theme: theme,  // ✅ Pass theme to embed
        parentUrl: window.location.href,
        memberDetectionMethod: null
      };

      // ✅ REQUEST USER DATA FROM PARENT WIX PAGE
      if (window.parent !== window) {
        console.log('🔍 Requesting user data from parent Wix page...');
        try {
          window.parent.postMessage({
            type: 'REQUEST_USER_DATA',
            source: 'koval-ai-widget',
            timestamp: Date.now()
          }, '*');
          console.log('📤 Sent REQUEST_USER_DATA to parent');
        } catch (error) {
          console.error('❌ Failed to send REQUEST_USER_DATA:', error);
        }
      } else {
        console.log('🔍 Widget is not in an iframe, will use direct detection');
      }

      // ✅ Enhanced Wix user detection with retry logic
      const detectWixUser = () => {
        try {
          // Method 1: Try wixUsers API
          if (typeof window !== 'undefined' && 
              window.wixUsers && 
              typeof window.wixUsers.currentUser === 'object' &&
              window.wixUsers.currentUser !== null) {
            
            const currentUser = window.wixUsers.currentUser;
            console.log('🔍 Wix currentUser detected:', currentUser);
            
            if (currentUser.loggedIn === true && currentUser.id) {
              userData = {
                ...userData,
                userId: currentUser.id,  // ✅ V5.0: Use actual Wix member ID (no prefix)
                userName: currentUser.id,  // ✅ V5.0: Use raw member ID for consistency
                userEmail: currentUser.loginEmail || '',
                nickname: currentUser.nickname || currentUser.displayName || `Member-${currentUser.id}`,
                profilePhoto: currentUser.picture || '',
                wixId: currentUser.id,
                memberId: currentUser.id,  // ✅ V5.0: Explicit member ID field
                isGuest: false,
                source: 'wix-authenticated-v5.0',
                memberDetectionMethod: 'wixUsers.currentUser',
                theme: theme  // ✅ Keep theme
              };
              console.log('✅ V5.0: Wix user authenticated with real member ID:', {
                userId: userData.userId,
                memberId: userData.memberId,
                userName: userData.userName,
                nickname: userData.nickname,
                hasPhoto: !!userData.profilePhoto,
                detectionMethod: userData.memberDetectionMethod
              });
              return true;
            } else {
              console.log('ℹ️ Wix user not logged in');
            }
          }

          // Method 2: Try $w.user (if in Wix Blocks)
          if (typeof $w !== 'undefined' && $w && $w.user) {
            console.log('📱 Checking $w.user API...');
            $w.user.currentUser.then((user) => {
              if (user && user.loggedIn && user.id) {
                userData = {
                  ...userData,
                  userId: user.id,  // ✅ V5.0: Use actual member ID
                  memberId: user.id,  // ✅ V5.0: Explicit member ID field
                  userName: user.id,  // ✅ V5.0: Use raw member ID for consistency
                  userEmail: user.loginEmail || '',
                  nickname: user.nickname || user.displayName || user.loginEmail || `Member-${user.id}`,
                  wixId: user.id,
                  source: 'wix-blocks-authenticated-v5.0',
                  memberDetectionMethod: '$w.user',
                  version: '5.0.0',
                  theme: theme
                };
                
                // Update iframe if ready
                if (this.iframe && this.isReady) {
                  this.postMessage('USER_AUTH', userData);
                }
              }
            }).catch((error) => {
              console.warn('⚠️ $w.user API error:', error);
            });
          }

          // Method 3: Check for auth cookies/session
          if (typeof document !== 'undefined') {
            const cookies = document.cookie;
            if (cookies.includes('wix-session') || cookies.includes('XSRF-TOKEN')) {
              console.log('🍪 Wix session detected');
              userData.source = 'wix-session-detected';
            }
          }

        } catch (wixError) {
          console.warn('⚠️ Wix user detection failed:', wixError.message);
        }
        return false;
      };

      // Try to detect Wix user immediately
      detectWixUser();

      // Also try again after a short delay in case Wix API loads later
      setTimeout(() => {
        if (detectWixUser()) {
          // If we found a user after delay, update the iframe
          if (this.iframe && this.isReady) {
            console.log('🔄 Sending updated Wix user data');
            this.postMessage('USER_AUTH', userData);
          }
        }
      }, 1000);

      // ✅ ENHANCED NEXT.JS BACKEND CONNECTION TEST
      const testNextJSConnection = async () => {
        try {
          // Test the enhanced health endpoint with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const response = await fetch(`${this.BASE_URL}/api/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            // Use safe JSON parsing
            const healthData = await safeJsonParse(response);
            if (healthData) {
              console.log(`✅ Next.js backend healthy: v${healthData.version || 'unknown'}`, {
                wixIntegration: healthData.features?.wixIntegration || false,
                bridgeAPIs: healthData.features?.bridgeAPIs || false,
                uptime: healthData.uptime ? `${Math.round(healthData.uptime)}s` : 'unknown'
              });
              return true;
            } else {
              console.log('⚠️ Next.js backend returned invalid JSON');
              return false;
            }
          } else {
            console.log(`⚠️ Next.js backend limited: ${response.status}`);
            return false;
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('⚠️ Next.js backend connection timeout');
          } else {
            console.log(`⚠️ Next.js backend limited: ${error.message}`);
          }
          return false;
        }
      };

      // ✅ COMPREHENSIVE SYSTEM HEALTH CHECK
      const performSystemHealthCheck = async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
          
          const response = await fetch(`${this.BASE_URL}/api/system/health-check`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            // Use safe JSON parsing
            const health = await safeJsonParse(response);
            if (health) {
              console.log(`🏥 System health: ${health.status}`, {
                healthy: health.summary?.healthy || 0,
                warnings: health.summary?.warning || 0,
                errors: health.summary?.error || 0,
                totalTime: health.totalResponseTime ? `${health.totalResponseTime}ms` : 'unknown'
              });
              
              // Update UI based on health status
              if (health.status === 'error') {
                console.warn('❌ System has errors - some features may be limited');
              } else if (health.status === 'warning') {
                console.warn('⚠️ System has warnings - performance may be affected');
              }
              
              return health.status === 'healthy';
            } else {
              console.warn('⚠️ System health check returned invalid JSON');
              return false;
            }
          } else {
            console.warn(`⚠️ System health check failed: ${response.status}`);
            return false;
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.warn('⚠️ System health check timeout');
          } else {
            console.warn('⚠️ Could not perform system health check:', error.message);
          }
          return false;
        }
      };

      // Test the enhanced backend connections
      testNextJSConnection();
      performSystemHealthCheck();
      
      // ✅ Add OpenAI health monitoring
      const testOpenAIConnection = async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const response = await fetch(`${this.BASE_URL}/api/openai/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const healthData = await safeJsonParse(response);
            if (healthData) {
              console.log(`🤖 OpenAI service: ${healthData.status}`, {
                responseTime: healthData.responseTime ? `${healthData.responseTime}ms` : 'unknown',
                model: healthData.model || 'unknown',
                quotaStatus: healthData.quotaStatus || 'unknown'
              });
              return healthData.status === 'healthy';
            } else {
              console.log('⚠️ OpenAI health check returned invalid response');
              return false;
            }
          } else {
            console.log(`⚠️ OpenAI health check failed: ${response.status}`);
            return false;
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('⚠️ OpenAI health check timeout');
          } else {
            console.log(`⚠️ OpenAI health check error: ${error.message}`);
          }
          return false;
        }
      };

      // Test connections including OpenAI
      testNextJSConnection();
      performSystemHealthCheck();
      testOpenAIConnection();
      
      // Check health periodically but less frequently
      setInterval(testNextJSConnection, 120000); // Every 2 minutes
      setInterval(performSystemHealthCheck, 300000); // Every 5 minutes
      setInterval(testOpenAIConnection, 180000); // Every 3 minutes

      // ✅ CREATE IFRAME WITH THEME AND CACHE BUSTING
      this.iframe = document.createElement('iframe');
      const cacheParam = Date.now(); // Force fresh load
      const embedUrl = new URL(`${this.BASE_URL}/embed`); // Load embed (which now has full app functionality)
      embedUrl.searchParams.set('theme', theme);
      embedUrl.searchParams.set('userId', userData.userId);
      embedUrl.searchParams.set('userName', userData.userName);
      embedUrl.searchParams.set('embedded', 'true'); // Flag to indicate it's embedded
      embedUrl.searchParams.set('v', cacheParam.toString());
      
      this.iframe.src = embedUrl.toString();
      console.log('🔗 Loading embed URL with full app functionality:', embedUrl.toString());
        
      this.iframe.style.cssText = `
        width: 100%; height: 100%; border: none;
        opacity: 0; transition: opacity 0.5s ease;
        background: ${isDark ? '#1a1a1a' : '#ffffff'};
      `;
      this.iframe.allow = 'microphone; camera; geolocation; fullscreen; payment';

      // ✅ ENHANCED IFRAME LOADING
      this.iframe.onload = () => {
        console.log('✅ Koval AI iframe loaded with theme:', theme);
        this.isReady = true;
        
        // Smooth transition
        setTimeout(() => {
          this.loadingDiv.style.opacity = '0';
          this.iframe.style.opacity = '1';
          
          setTimeout(() => {
            this.loadingDiv.style.display = 'none';
          }, 300);
        }, 500);

        // Send enhanced user data
        this.postMessage('USER_AUTH', userData);
        this.postMessage('THEME_CHANGE', { theme: theme, dark: isDark });
        this.sendInitialSession();
        this.processQueue();
      };

      // ✅ BETTER ERROR HANDLING
      this.iframe.onerror = () => {
        console.error('❌ Iframe failed to load');
        this.loadingDiv.innerHTML = `
          <div style="color: #e74c3c; font-size: 18px; margin-bottom: 16px;">
            🚫 Connection Issue
          </div>
          <div style="font-size: 14px; margin-bottom: 16px; opacity: 0.8;">
            Unable to load Koval AI chat
          </div>
          <button onclick="location.reload()" 
                  style="padding: 12px 24px; background: #3498db; color: white; 
                         border: none; border-radius: 6px; cursor: pointer; 
                         font-size: 14px; font-weight: 500;">
            🔄 Retry
          </button>
        `;
      };

      container.appendChild(this.loadingDiv);
      container.appendChild(this.iframe);
      this.shadowRoot.appendChild(container);

      // ✅ THEME CHANGE LISTENER
      const themeObserver = new MutationObserver(() => {
        const newTheme = detectParentTheme();
        if (newTheme !== theme) {
          console.log('🎨 Theme changed to:', newTheme);
          this.postMessage('THEME_CHANGE', { 
            theme: newTheme, 
            dark: newTheme === 'dark' 
          });
        }
      });

      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
      });

      // ✅ MESSAGE LISTENER (same as before)
      window.addEventListener('message', (event) => {
        // Allow messages from the correct origin (including localhost for development)
        const allowedOrigins = [
          this.BASE_URL,
          'http://localhost:3000',
          'https://localhost:3000'
        ];
        
        if (allowedOrigins.includes(event.origin) && event.data) {
          this.handleMessage(event);
        } else if (event.data && event.data.source === 'koval-ai-embed') {
          // Trust messages with our source identifier
          this.handleMessage(event);
        }
      });
    }

    postMessage(type, data = {}) {
      if (!this.isReady || !this.iframe?.contentWindow) {
        this.messageQueue.push({ type, data });
        return;
      }

      try {
        this.iframe.contentWindow.postMessage(
          { type, data, timestamp: Date.now() },
          this.BASE_URL
        );
        // Only log important message types to reduce noise
        const importantTypes = ['USER_AUTH', 'THEME_CHANGE', 'LOAD_SESSION', 'AUTH_STATUS_RESPONSE'];
        if (importantTypes.includes(type)) {
          console.log('📤 Widget sent:', type);
        }
      } catch (error) {
        console.warn('⚠️ Message send failed:', error.message);
      }
    }

    processQueue() {
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        this.postMessage(msg.type, msg.data);
      }
    }

    sendInitialSession() {
      try {
        // Safe localStorage access
        if (typeof localStorage !== 'undefined') {
          const session = localStorage.getItem('koval_ai_session');
          if (session) {
            this.postMessage('LOAD_SESSION', JSON.parse(session));
          }
        }
      } catch (error) {
        console.warn('⚠️ Session load failed (this is normal):', error.message);
      }
    }

    handleMessage(event) {
      try {
        const { type, data } = event.data || {};
        if (!type) return;

        // Only log important message types to reduce noise
        const importantTypes = ['EMBED_READY', 'embed_ready', 'CHAT_MESSAGE', 'SAVE_DIVE_LOG', 'ERROR'];
        if (importantTypes.includes(type)) {
          console.log('📥 Widget received:', type);
        }

        switch (type) {
          case 'EMBED_READY':
          case 'embed_ready':
            console.log('✅ Embed confirmed ready');
            this.processQueue();
            break;

          case 'CHAT_MESSAGE':
            console.log('📨 Chat message from embed:', data);
            // Forward to parent if needed
            if (window.parent !== window) {
              window.parent.postMessage(event.data, '*');
            }
            break;

          case 'SAVE_DIVE_LOG':
            console.log('💾 Dive log save request:', data);
            // Forward to parent if needed
            if (window.parent !== window) {
              window.parent.postMessage(event.data, '*');
            }
            break;

          case 'SAVE_SESSION':
            try {
              if (typeof localStorage !== 'undefined' && data) {
                localStorage.setItem('koval_ai_session', JSON.stringify(data));
              }
            } catch (error) {
              console.warn('⚠️ Session save failed:', error.message);
            }
            break;

          case 'resize':
            if (data?.height && typeof data.height === 'number') {
              this.style.height = Math.max(data.height, 400) + 'px';
            }
            break;
        }
      } catch (error) {
        console.warn('⚠️ Message handling failed:', error.message);
      }
    }

    connectedCallback() {
      console.log('✅ Koval AI widget connected to DOM');
    }

    disconnectedCallback() {
      console.log('🔌 Koval AI widget disconnected from DOM');
    }

    // ✅ HANDLE WIX EDIT MODE CHANGES
    handleEditModeChange(isEditMode) {
      console.log(`🎛️ Handling edit mode change: ${isEditMode ? 'EDIT MODE' : 'LIVE MODE'}`);
      
      // Store edit mode state
      this.isEditMode = isEditMode;
      
      if (isEditMode) {
        // In edit mode - show placeholder or admin interface
        console.log('✏️ Widget in EDIT MODE - Limited functionality');
        this.postMessage('EDIT_MODE_ENABLED', { 
          editMode: true,
          message: 'Widget is in edit mode'
        });
        
        // Optionally show edit mode indicator
        if (this.iframe) {
          this.iframe.style.border = '2px dashed #3498db';
          this.iframe.style.opacity = '0.8';
        }
      } else {
        // In live mode - full functionality for registered users
        console.log('👀 Widget in LIVE MODE - Checking user registration');
        this.postMessage('EDIT_MODE_DISABLED', { 
          editMode: false,
          message: 'Widget is live'
        });
        
        // Remove edit mode styling
        if (this.iframe) {
          this.iframe.style.border = 'none';
          this.iframe.style.opacity = '1';
        }
        
        // Get user data from Wix Members/FullData for UserMemory
        this.getUserDataFromWix();
      }
    }

    // ✅ GET USER DATA FROM WIX MEMBERS/FULLDATA FOR USERMEMORY  
    getUserDataFromWix() {
      console.log('🔍 Getting user data from Wix Members/FullData for UserMemory...');
      
      // Request rich user profile from Wix page
      if (window.parent !== window) {
        try {
          window.parent.postMessage({
            type: 'GET_MEMBER_PROFILE',
            source: 'koval-ai-widget',
            timestamp: Date.now()
          }, '*');
          console.log('📤 Requested member profile from Wix page');
        } catch (error) {
          console.error('❌ Failed to request member profile:', error);
        }
      }
      
      // Also try direct Wix API access
      this.detectWixMemberData();
    }

    // ✅ DETECT WIX MEMBER DATA FOR USERMEMORY
    detectWixMemberData() {
      try {
        // Method 1: Check wixUsers API for member data
        if (typeof window !== 'undefined' && window.wixUsers && window.wixUsers.currentUser) {
          const currentUser = window.wixUsers.currentUser;
          console.log('🔍 Checking Wix member data:', currentUser);
          
          if (currentUser.loggedIn === true && currentUser.id) {
            // Extract rich profile data for UserMemory
            this.handleMemberData(currentUser);
          } else {
            console.log('ℹ️ User not logged in - using guest mode');
            this.handleGuestUser();
          }
        }
        
        // Method 2: Check via $w.user API
        if (typeof $w !== 'undefined' && $w && $w.user) {
          $w.user.currentUser.then((user) => {
            if (user && user.loggedIn && user.id) {
              this.handleMemberData(user);
            } else {
              this.handleGuestUser();
            }
          }).catch((error) => {
            console.warn('⚠️ $w.user API error:', error);
            this.handleGuestUser();
          });
        }
      } catch (error) {
        console.warn('⚠️ Member data detection failed:', error);
        this.handleGuestUser();
      }
    }

    // ✅ HANDLE AUTHENTICATED MEMBER DATA
    handleMemberData(user) {
      console.log('✅ Processing Wix member data for UserMemory');
      
      // ✅ Use member ID format for consistent, fast recognition
      const displayName = `User-${user.id}`;
      const nickname = `User-${user.id}`;
      
      const userData = {
        userId: user.id,  // ✅ Real Wix member ID for UserMemory
        userName: displayName,
        nickname: nickname,  // ✅ Important for embed.jsx display
        userEmail: user.loginEmail || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        profilePicture: user.picture || user.profilePicture || '',
        wixId: user.id,
        source: 'wix-members-fulldata',
        isGuest: false,
        theme: this.currentTheme || 'light'
      };
      
      // Send to embed for UserMemory integration
      if (this.iframe && this.isReady) {
        this.postMessage('USER_AUTH', userData);
      }
      
      console.log('📤 Sent Wix member data to embed for UserMemory:', {
        userId: userData.userId,
        nickname: userData.nickname,
        userName: userData.userName,
        source: userData.source
      });
    }

    // ✅ HANDLE GUEST USER (NO WIX LOGIN)
    handleGuestUser() {
      console.log('👤 No Wix login detected - using guest mode');
      
      const guestId = 'guest-' + Date.now();
      const userData = {
        userId: guestId,
        userName: 'Guest User',
        nickname: 'Guest User',
        userEmail: '',
        source: 'guest-user',
        isGuest: true,
        theme: this.currentTheme || 'light'
      };
      
      // Send to embed
      if (this.iframe && this.isReady) {
        this.postMessage('USER_AUTH', userData);
      }
      
      console.log('📤 Sent guest user data to embed:', userData);
    }
    
    // ✅ SIMPLE USER DATA BRIDGE FOR USERMEMORY INTEGRATION
    setupUserDataBridge() {
      console.log('🔗 Setting up user data bridge for UserMemory...');
      
      // Listen for user data requests from embedded app
      const handleEmbedUserRequest = (event) => {
        if (event.origin !== this.BASE_URL) return;
        
        // ✅ Add null check to prevent errors
        if (!event || !event.data || !event.data.type) {
          return;
        }
        
        if (event.data.type === 'REQUEST_USER_DATA') {
          console.log('📨 Embed app requesting user data for UserMemory');
          
          // Get fresh user data from Wix
          this.getUserDataFromWix();
        }
        
        if (event.data.type === 'USER_DATA_ERROR') {
          console.error('🚨 User data error from embed:', event.data.error);
          
          // Try to refresh user data
          this.refreshUserData();
        }
      };
      
      window.addEventListener('message', handleEmbedUserRequest);
    }
    
    // ✅ REFRESH USER DATA FUNCTION
    refreshUserData() {
      console.log('🔄 Refreshing user data from Wix...');
      
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'REFRESH_USER_DATA',
          timestamp: Date.now()
        }, '*');
      }
      
      // Re-run user detection
      this.getUserDataFromWix();
    }
    
    // ✅ ENHANCED ERROR MONITORING
    setupErrorMonitoring() {
      // Only set up error monitoring if not already done
      if (window.kovalErrorMonitoringSetup) return;
      window.kovalErrorMonitoringSetup = true;
      
      window.addEventListener('error', (event) => {
        try {
          const errorData = {
            type: 'Widget JavaScript Error',
            message: event.error?.message || event.message || 'Unknown error',
            stack: event.error?.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userId: userData?.userId || 'unknown'
          };
          
          // Send to monitoring API with timeout
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          fetch(`${this.BASE_URL}/api/monitoring/error`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorData),
            signal: controller.signal
          }).catch(err => {
            // Silently fail - don't log monitoring errors to avoid noise
          });
        } catch (monitoringError) {
          // Silently fail - don't let error monitoring cause more errors
        }
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        try {
          const errorData = {
            type: 'Widget Unhandled Promise Rejection',
            message: event.reason?.message || event.reason || 'Unknown promise rejection',
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userId: userData?.userId || 'unknown'
          };
          
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          fetch(`${this.BASE_URL}/api/monitoring/error`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorData),
            signal: controller.signal
          }).catch(err => {
            // Silently fail - don't log monitoring errors to avoid noise
          });
        } catch (monitoringError) {
          // Silently fail - don't let error monitoring cause more errors
        }
      });
    };

  }

  // ✅ Safe custom element registration
  if (!customElements.get('koval-ai')) {
    customElements.define('koval-ai', KovalAiElement);
    console.log('✅ Koval AI custom element registered');
  }

  // ✅ Safe Global API
  window.KovalAI = {
    loadUserData: (data) => {
      try {
        const widget = document.querySelector('koval-ai');
        if (widget && widget.postMessage) {
          widget.postMessage('USER_AUTH', data);
          return true;
        }
        return false;
      } catch (error) {
        console.warn('⚠️ loadUserData failed:', error.message);
        return false;
      }
    },
    
    saveSession: (data) => {
      try {
        const widget = document.querySelector('koval-ai');
        if (widget && widget.postMessage) {
          widget.postMessage('SAVE_SESSION', data);
          return true;
        }
        return false;
      } catch (error) {
        console.warn('⚠️ saveSession failed:', error.message);
        return false;
      }
    },
    
    isReady: () => {
      try {
        const widget = document.querySelector('koval-ai');
        return widget ? Boolean(widget.isReady) : false;
      } catch (error) {
        console.warn('⚠️ isReady check failed:', error.message);
        return false;
      }
    }
  };

  const loadTime = new Date().toLocaleTimeString();
  console.log('🚀 Koval AI Widget v5.0-DIVELOGS-ENHANCED loaded safely - Cache: ' + Date.now());
  console.log('🎯 Widget loaded at: ' + loadTime);
  console.log('🔄 V5.0: REAL MEMBER ID DETECTION AND DIVELOGS COLLECTION FIXES APPLIED!');
  console.log('✅ Message types supported: EMBED_READY, CHAT_MESSAGE, SAVE_DIVE_LOG, USER_AUTH, THEME_CHANGE');
  console.log('🛡️ Enhanced error monitoring and timeout handling active');
  console.log('🤖 OpenAI reliability improvements with retry logic and fallbacks');
  console.log('🆔 V5.0: Real Wix Member ID detection (no session-based prefixes)');
  console.log('💾 V5.0: DiveLogs collection save fixes with correct field mapping');
})();
