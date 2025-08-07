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
        // Security check for Wix origins
        if (event.origin && (
          event.origin.includes('wix.com') || 
          event.origin.includes('wixsite.com') ||
          event.origin.includes('deepfreediving.com')
        )) {
          console.log('📨 Bot widget received message from Wix page:', event.data);
          
          if (event.data.type === 'USER_DATA_RESPONSE' && event.data.userData) {
            const wixUserData = event.data.userData;
            console.log('✅ Received authentic user data from Wix page:', wixUserData);
            
            // Update userData with real Wix user data
            userData = {
              ...userData,
              userId: wixUserData.userId,
              userName: wixUserData.profile?.displayName || wixUserData.profile?.nickname || 'Authenticated User',
              userEmail: wixUserData.profile?.loginEmail || '',
              source: 'wix-page-authenticated',
              theme: theme,
              diveLogs: wixUserData.diveLogs || [],
              memories: wixUserData.memories || []
            };
            
            console.log('🔄 Updated widget userData:', userData);
            
            // If iframe is ready, send updated user data
            if (this.iframe && this.isReady) {
              this.postMessage('USER_AUTH', userData);
              console.log('📤 Sent updated user data to embed');
            }
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
        window.parent.postMessage({
          type: 'REQUEST_USER_DATA',
          source: 'koval-ai-widget'
        }, '*');
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
                userName: currentUser.displayName || currentUser.nickname || currentUser.loginEmail || 'Wix User',
                userEmail: currentUser.loginEmail || '',
                wixId: currentUser.id,
                source: 'wix-authenticated',
                theme: theme  // ✅ Keep theme
              };
              console.log('✅ Wix user authenticated with real member ID:', userData);
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

      // ✅ PERIODIC CONNECTION TESTING
      const testBackendConnection = async () => {
        try {
          // Test the Wix backend connection
          const response = await fetch('/_functions/wixConnection', {
            method: 'GET',
            credentials: 'include'
          });
          
          const status = response.ok ? '✅ Connected' : '❌ Failed';
          console.log(`🔍 Testing backend connection... ${status} (${response.status})`);
          
          return response.ok;
        } catch (error) {
          console.log(`🔍 Testing backend connection... ❌ Failed (network error)`);
          return false;
        }
      };

      // Test connection periodically
      testBackendConnection();
      setInterval(testBackendConnection, 30000); // Every 30 seconds

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
      this.iframe.allow = 'microphone; camera; geolocation';

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
