class KovalAiElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.wixTarget = this.getAttribute('wix-target');
    this.isReady = false;
    this.messageQueue = [];

    // ✅ Updated origins - make sure these match your actual domains
    this.ALLOWED_ORIGINS = [
      "https://koval-deep-ai.vercel.app", // ✅ Updated to match your actual Vercel URL
      "https://kovaldeepai-main.vercel.app",
      "https://www.deepfreediving.com",
      "http://localhost:3000" // For development
    ];

    this.createWidget();
    this.setupMessageListener();
  }

  createWidget() {
    // ==== Main Container ====
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: '700px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      backgroundColor: '#fff'
    });

    // ✅ Loading indicator
    this.loadingDiv = document.createElement('div');
    Object.assign(this.loadingDiv.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
      zIndex: '1000'
    });
    this.loadingDiv.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 10px;">🤿</div>
      <div style="font-size: 14px; color: #666;">Loading Koval AI...</div>
    `;

    // ==== Bot Iframe ====
    this.iframe = document.createElement('iframe');
    
    // ✅ Build iframe URL with user parameters
    const iframeUrl = this.buildIframeUrl();
    this.iframe.src = iframeUrl;
    
    this.iframe.allow = 'microphone; camera; fullscreen';
    Object.assign(this.iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      overflow: 'hidden',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });

    // ✅ Iframe event handlers
    this.iframe.addEventListener('load', this.handleIframeLoad.bind(this));
    this.iframe.addEventListener('error', this.handleIframeError.bind(this));

    container.appendChild(this.loadingDiv);
    container.appendChild(this.iframe);
    this.shadowRoot.appendChild(container);

    // Resize observer for responsiveness
    this.resizeObserver = new ResizeObserver(() => {
      if (this.iframe) {
        this.iframe.style.height = `${this.offsetHeight}px`;
        this.iframe.style.width = `${this.offsetWidth}px`;
      }
    });
    this.resizeObserver.observe(this);
  }

  // ✅ Build iframe URL with user parameters
  buildIframeUrl() {
    const baseUrl = `${this.ALLOWED_ORIGINS[0]}/embed`;
    const params = new URLSearchParams();

    // Add user info if available
    try {
      if (window.wixUsers && window.wixUsers.currentUser) {
        const user = window.wixUsers.currentUser;
        params.set('userId', user.id || 'wix-user');
        params.set('userEmail', user.loginEmail || '');
        params.set('userName', user.displayName || 'Wix User');
      } else {
        params.set('userId', 'wix-guest-' + Date.now());
        params.set('userName', 'Guest User');
      }
      
      params.set('source', 'wix-widget');
      params.set('timestamp', Date.now());
      
    } catch (error) {
      console.warn('⚠️ Could not get Wix user info:', error);
      params.set('userId', 'guest-' + Date.now());
      params.set('userName', 'Guest');
    }

    return `${baseUrl}?${params.toString()}`;
  }

  // ✅ Handle iframe load
  handleIframeLoad() {
    console.log('✅ Koval AI iframe loaded successfully');
    this.isReady = true;
    
    // Hide loading, show iframe
    this.loadingDiv.style.display = 'none';
    this.iframe.style.opacity = '1';
    
    // Send initial data
    setTimeout(() => {
      this.sendInitialData();
      this.processMessageQueue();
    }, 500);
  }

  // ✅ Handle iframe error
  handleIframeError() {
    console.error('❌ Koval AI iframe failed to load');
    this.loadingDiv.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
      <div style="font-size: 14px; color: #e74c3c;">Chat temporarily unavailable</div>
      <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
    `;
  }

  // ✅ Setup message listener
  setupMessageListener() {
    window.addEventListener('message', (event) => {
      this.handleMessage(event);
    });
  }

  // ✅ Process queued messages
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.postToIframe(message.type, message.data);
    }
  }

  /**
   * ✅ Securely post message to iframe
   */
  postToIframe(type, data = {}) {
    if (!this.iframe || !this.iframe.contentWindow) {
      console.warn('⚠️ Iframe not ready, queueing message:', type);
      this.messageQueue.push({ type, data });
      return;
    }

    try {
      const message = { type, ...data, timestamp: Date.now() };
      this.iframe.contentWindow.postMessage(message, this.ALLOWED_ORIGINS[0]);
      console.log('📤 Sent to iframe:', type);
    } catch (error) {
      console.error('❌ Failed to send message to iframe:', error);
    }
  }

  /**
   * ✅ Send initial data (theme, user info, saved session)
   */
  sendInitialData() {
    // Theme detection
    const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    this.postToIframe("THEME_CHANGE", { dark: isDark });

    // ✅ Enhanced Wix user detection
    try {
      if (window.wixUsers && window.wixUsers.currentUser) {
        const user = window.wixUsers.currentUser;
        this.postToIframe("USER_AUTH", {
          userId: user.id || user.loginEmail || 'wix-user',
          profile: {
            id: user.id,
            loginEmail: user.loginEmail,
            displayName: user.displayName,
            nickname: user.displayName || 'Wix User',
            source: 'wix-widget'
          }
        });
        console.log('✅ Sent Wix user data:', user.displayName || user.loginEmail);
      } else {
        // Send guest user data
        this.postToIframe("USER_AUTH", {
          userId: 'wix-guest-' + Date.now(),
          profile: {
            nickname: 'Guest User',
            source: 'wix-widget'
          }
        });
        console.log('✅ Sent guest user data');
      }
    } catch (error) {
      console.error('❌ Failed to send user data:', error);
    }

    // Saved session
    try {
      const savedSession = localStorage.getItem("koval_ai_session");
      if (savedSession) {
        this.postToIframe("LOAD_SAVED_SESSION", JSON.parse(savedSession));
        console.log('✅ Sent saved session');
      }
    } catch (error) {
      console.warn("⚠️ Failed to parse saved session:", error);
    }
  }

  /**
   * ✅ Load user data dynamically
   */
  loadUserData(payload = {}) {
    if (!payload || typeof payload !== "object") return;
    this.postToIframe("USER_DATA", { payload });
    console.log('✅ Loaded user data:', payload);
  }

  /**
   * ✅ Save session locally
   */
  saveSession(payload) {
    try {
      localStorage.setItem("koval_ai_session", JSON.stringify(payload));
      console.log('✅ Session saved');
    } catch (error) {
      console.warn("⚠️ Failed to save session:", error);
    }
  }

  /**
   * ✅ Handle incoming messages safely
   */
  handleMessage(event) {
    if (!event.data || !event.data.type) return;

    // ✅ Enhanced origin checking
    const isAllowedOrigin = this.ALLOWED_ORIGINS.includes(event.origin);
    const isWixMessage = event.data.fromWix;
    const isLocalMessage = event.origin === window.location.origin;

    if (!isAllowedOrigin && !isWixMessage && !isLocalMessage) {
      console.warn("⚠️ Blocked message from unauthorized origin:", event.origin);
      return;
    }

    console.log('📥 Received message:', event.data.type, event.data);

    switch (event.data.type) {
      case "embed_ready":
        console.log('✅ Embed is ready');
        this.sendInitialData();
        break;
        
      case "new_message":
        console.log('📨 New message from chat');
        // Could show notification here
        break;
        
      case "close_chat":
        console.log('❌ Chat close requested');
        // Handle chat close if needed
        break;
        
      case "USER_DATA":
        this.loadUserData(event.data.payload);
        break;
        
      case "SAVE_SESSION":
        this.saveSession(event.data.payload);
        break;
        
      case "REQUEST_USER_DETAILS":
        this.sendInitialData();
        break;
        
      case "NO_LOGS":
        console.log("ℹ️ No dive logs found for this user");
        break;
        
      case "FIREBASE_ERROR":
        console.error("🔥 Firebase Error:", event.data.error);
        break;
        
      default:
        console.log('🔄 Unhandled message type:', event.data.type);
    }
  }

  connectedCallback() {
    console.log('✅ Koval AI widget connected');
    
    // ✅ Wix-specific listener setup
    if (this.wixTarget && window.$w) {
      try {
        const wixEl = window.$w(`#${this.wixTarget}`);
        if (wixEl && typeof wixEl.onMessage === "function") {
          wixEl.onMessage((msg) => {
            this.handleMessage({ 
              data: { ...msg, fromWix: true }, 
              origin: window.location.origin 
            });
          });
          console.log('✅ Wix message listener attached');
        }
      } catch (error) {
        console.warn("⚠️ Failed to attach Wix onMessage:", error);
      }
    }
  }

  disconnectedCallback() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    console.log('❌ Koval AI widget disconnected');
  }
}

// ✅ Register the custom element
if (!customElements.get('koval-ai')) {
  customElements.define('koval-ai', KovalAiElement);
}

// ✅ Enhanced global API
window.KovalAI = {
  loadUserData: (data) => {
    const widget = document.querySelector('koval-ai');
    if (widget) {
      widget.loadUserData(data);
      return true;
    }
    console.warn('⚠️ Koval AI widget not found');
    return false;
  },
  
  saveSession: (data) => {
    const widget = document.querySelector('koval-ai');
    if (widget) {
      widget.saveSession(data);
      return true;
    }
    console.warn('⚠️ Koval AI widget not found');
    return false;
  },
  
  isReady: () => {
    const widget = document.querySelector('koval-ai');
    return widget ? widget.isReady : false;
  }
};

console.log('✅ Koval AI Widget v2.0 loaded');
