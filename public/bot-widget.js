(function () {
  'use strict';

  if (window.KovalAILoaded) return;
  window.KovalAILoaded = true;

  const ALLOWED_ORIGIN = "https://kovaldeepai-main.vercel.app";
  const LOCALHOST_ORIGIN = "http://localhost:3000";

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
        // Log ALL messages for debugging
        console.log('📨 Bot widget received message from Wix page:', event.data);
        
        // Security check for Wix origins - be more permissive for debugging
        const validOrigin = !event.origin || 
                           event.origin.includes('wix.com') || 
                           event.origin.includes('wixsite.com') ||
                           event.origin.includes('deepfreediving.com') ||
                           event.origin === 'null' ||  // For local testing
                           event.origin === window.location.origin;
        
        // Handle Wix Edit Mode Change Event
        if (event.data.intent === 'TPA2' && event.data.type === 'registerEventListener') {
          console.log('🎛️ Wix edit mode event detected:', event.data);
          
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
        
        if (validOrigin && event.data.type === 'USER_DATA_RESPONSE' && event.data.userData) {
          const wixUserData = event.data.userData;
          console.log('✅ Received authentic user data from Wix page:', wixUserData);
          
          // Update userData with real Wix user data
          userData = {
            ...userData,
            userId: wixUserData.userId,
            userName: wixUserData.profile?.displayName || wixUserData.profile?.nickname || 'Authenticated User',
            userEmail: wixUserData.profile?.loginEmail || '',
            profilePhoto: wixUserData.profile?.profilePhoto || '',
            nickname: wixUserData.profile?.nickname || wixUserData.profile?.displayName,
            isGuest: false,
            source: 'wix-page-authenticated',
            theme: theme,
            diveLogs: wixUserData.userDiveLogs || [],
            memories: wixUserData.userMemories || []
          };
          
          console.log('🔄 Updated widget userData:', {
            userId: userData.userId,
            userName: userData.userName,
            nickname: userData.nickname,
            hasProfilePhoto: !!userData.profilePhoto,
            source: userData.source
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

      // ✅ ENHANCED USER DATA with better defaults
      let userData = {
        userId: 'guest-' + Date.now(),  // ✅ Use consistent guest format
        userName: 'Guest User',
        source: 'wix-widget-enhanced',
        theme: theme,  // ✅ Pass theme to embed
        parentUrl: window.location.href
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
                userId: currentUser.id,  // ✅ Use the actual Wix member ID (no prefix)
                userName: currentUser.displayName || currentUser.nickname || currentUser.loginEmail?.split('@')[0] || 'Wix User',
                userEmail: currentUser.loginEmail || '',
                nickname: currentUser.nickname || currentUser.displayName,
                profilePhoto: currentUser.picture || '',
                wixId: currentUser.id,
                isGuest: false,
                source: 'wix-authenticated',
                theme: theme  // ✅ Keep theme
              };
              console.log('✅ Wix user authenticated with real member ID:', {
                userId: userData.userId,
                userName: userData.userName,
                nickname: userData.nickname,
                hasPhoto: !!userData.profilePhoto
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
                  userId: 'wix-' + user.id,
                  userName: user.nickname || user.displayName || user.loginEmail || 'Wix User',
                  userEmail: user.loginEmail || '',
                  wixId: user.id,
                  source: 'wix-blocks-authenticated',
                  theme: theme
                };
                console.log('✅ Wix Blocks user authenticated:', userData);
                
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

      // ✅ TEST NEXT.JS BACKEND CONNECTION (CORRECT BACKEND)
      const testNextJSConnection = async () => {
        try {
          // Test the actual Next.js backend that the widget uses
          const response = await fetch(`${this.BASE_URL}/api/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          const status = response.ok ? '✅ Connected' : '⚠️ Limited';
          console.log(`🔍 Next.js backend connection: ${status} (${response.status})`);
          
          return response.ok;
        } catch (error) {
          console.log(`🔍 Next.js backend connection: ⚠️ Limited (${error.message})`);
          return false;
        }
      };

      // Test the correct backend connection (Next.js, not Wix)
      testNextJSConnection();
      // Check periodically but less frequently
      setInterval(testNextJSConnection, 120000); // Every 2 minutes

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
        console.log('📤 Widget sent:', type);
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

        console.log('📥 Widget received:', type);

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
        
        // Re-check user registration status
        this.checkUserRegistration();
      }
    }

    // ✅ CHECK USER REGISTRATION STATUS
    checkUserRegistration() {
      console.log('🔍 Checking user registration status...');
      
      // Check if user is registered for your program
      if (window.parent !== window) {
        try {
          window.parent.postMessage({
            type: 'CHECK_USER_REGISTRATION',
            source: 'koval-ai-widget',
            timestamp: Date.now()
          }, '*');
          console.log('📤 Sent registration check to parent');
        } catch (error) {
          console.error('❌ Failed to check registration:', error);
        }
      }
      
      // Also check via Wix Members API
      this.detectRegisteredWixUser();
    }

    // ✅ ENHANCED USER DETECTION FOR REGISTERED USERS
    detectRegisteredWixUser() {
      try {
        // Method 1: Check if user is logged in and has access
        if (typeof window !== 'undefined' && window.wixUsers && window.wixUsers.currentUser) {
          const currentUser = window.wixUsers.currentUser;
          console.log('🔍 Checking registered user status:', currentUser);
          
          if (currentUser.loggedIn === true && currentUser.id) {
            // User is logged in, now check if they're registered for your program
            this.verifyUserAccess(currentUser);
          } else {
            console.log('ℹ️ User not logged in - showing guest interface');
            this.handleUnregisteredUser();
          }
        }
        
        // Method 2: Check via $w.user API
        if (typeof $w !== 'undefined' && $w && $w.user) {
          $w.user.currentUser.then((user) => {
            if (user && user.loggedIn && user.id) {
              this.verifyUserAccess(user);
            }
          }).catch((error) => {
            console.warn('⚠️ $w.user API error:', error);
          });
        }
      } catch (error) {
        console.warn('⚠️ User detection failed:', error);
      }
    }

    // ✅ VERIFY USER HAS ACCESS TO YOUR PROGRAM
    async verifyUserAccess(user) {
      console.log('🔐 Verifying user access for:', user.id);
      
      try {
        // Check via your Wix backend function
        const response = await fetch('/_functions/checkUserAccess', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user.id,
            userEmail: user.loginEmail
          }),
          credentials: 'include'
        });
        
        if (response.ok) {
          const accessData = await response.json();
          console.log('✅ Access verification result:', accessData);
          
          if (accessData.hasAccess) {
            // User has paid/registered access
            this.handleRegisteredUser(user, accessData);
          } else {
            // User is logged in but hasn't paid/registered
            this.handleUnregisteredUser(user);
          }
        } else {
          console.warn('⚠️ Access check failed:', response.status);
          this.handleUnregisteredUser(user);
        }
      } catch (error) {
        console.warn('⚠️ Access verification error:', error);
        // Fallback - allow access but log the issue
        this.handleRegisteredUser(user, { hasAccess: true, source: 'fallback' });
      }
    }

    // ✅ HANDLE REGISTERED USER WITH ACCESS
    handleRegisteredUser(user, accessData) {
      console.log('✅ User has access - enabling full functionality');
      
      // ✅ Prioritize specific user data over generic "Authenticated User"
      let displayName = 'Registered User';
      if (user.nickname && user.nickname !== 'Authenticated User') {
        displayName = user.nickname;
      } else if (user.loginEmail) {
        displayName = user.loginEmail.split('@')[0]; // Use email prefix as name
      } else if (user.displayName && user.displayName !== 'Authenticated User') {
        displayName = user.displayName;
      }
      
      const userData = {
        userId: user.id,
        userName: displayName,
        userEmail: user.loginEmail || '',
        wixId: user.id,
        source: 'wix-registered-user',
        hasAccess: true,
        accessLevel: accessData.accessLevel || 'standard',
        registrationDate: accessData.registrationDate,
        theme: this.currentTheme || 'light'
      };
      
      // Send to embed
      if (this.iframe && this.isReady) {
        this.postMessage('USER_AUTH', userData);
        this.postMessage('ACCESS_GRANTED', accessData);
      }
      
      console.log('📤 Sent registered user data to embed:', userData);
    }

    // ✅ HANDLE UNREGISTERED USER
    handleUnregisteredUser(user = null) {
      console.log('❌ User does not have access - showing registration prompt');
      
      const userData = {
        userId: user ? user.id : 'guest-' + Date.now(),
        userName: user ? (user.displayName || user.nickname || 'User') : 'Guest User',
        userEmail: user ? user.loginEmail || '' : '',
        source: 'wix-unregistered-user',
        hasAccess: false,
        needsRegistration: true,
        theme: this.currentTheme || 'light'
      };
      
      // Send to embed
      if (this.iframe && this.isReady) {
        this.postMessage('USER_AUTH', userData);
        this.postMessage('ACCESS_DENIED', { 
          message: 'Registration required',
          registrationUrl: '/_functions/registerForProgram' 
        });
      }
      
      console.log('📤 Sent unregistered user data to embed:', userData);
    }
    
    // ✅ ENHANCED AUTHENTICATION COMMUNICATION
    setupAuthenticationBridge() {
      console.log('🔐 Setting up enhanced authentication bridge...');
      
      // Listen for authentication requests from embedded app
      const handleEmbedAuthRequest = (event) => {
        if (event.origin !== this.BASE_URL) return;
        
        if (event.data.type === 'REQUEST_AUTH_STATUS') {
          console.log('📨 Embed app requesting auth status');
          
          // Send current authentication data
          const authData = {
            type: 'AUTH_STATUS_RESPONSE',
            authenticated: userData.userId && !userData.userId.startsWith('guest'),
            user: userData,
            timestamp: Date.now()
          };
          
          this.iframe.contentWindow.postMessage(authData, this.BASE_URL);
          console.log('📤 Sent auth status to embed:', authData);
        }
        
        if (event.data.type === 'AUTH_ERROR') {
          console.error('🚨 Authentication error from embed:', event.data.error);
          
          // Try to refresh authentication
          this.refreshAuthentication();
        }
      };
      
      window.addEventListener('message', handleEmbedAuthRequest);
    };
    
    // ✅ REFRESH AUTHENTICATION FUNCTION
    refreshAuthentication() {
      console.log('🔄 Refreshing authentication...');
      
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'REFRESH_USER_DATA',
          timestamp: Date.now()
        }, '*');
      }
      
      // Re-run user detection
      detectWixUser();
    };
    
    // ✅ ENHANCED ERROR MONITORING
    setupErrorMonitoring() {
      window.addEventListener('error', (event) => {
        const errorData = {
          type: 'Widget JavaScript Error',
          message: event.error?.message || 'Unknown error',
          stack: event.error?.stack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userId: userData?.userId
        };
        
        // Send to monitoring API
        fetch(`${this.BASE_URL}/api/monitoring/error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorData)
        }).catch(err => console.warn('Failed to send error report:', err));
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        const errorData = {
          type: 'Widget Unhandled Promise Rejection',
          message: event.reason?.message || event.reason || 'Unknown promise rejection',
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userId: userData?.userId
        };
        
        fetch(`${this.BASE_URL}/api/monitoring/error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorData)
        }).catch(err => console.warn('Failed to send error report:', err));
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
  console.log('🚀 Koval AI Widget v3.1-FIXED loaded safely - Cache: ' + Date.now());
  console.log('🎯 Widget loaded at: ' + loadTime);
  console.log('🔄 EMBED COMMUNICATION FIXES APPLIED!');
  console.log('✅ Message types supported: EMBED_READY, CHAT_MESSAGE, SAVE_DIVE_LOG, USER_AUTH, THEME_CHANGE');
})();
