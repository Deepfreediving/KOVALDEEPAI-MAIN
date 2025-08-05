(function() {
  'use strict';

  // ✅ Prevent multiple loads
  if (window.KovalAILoaded) return;
  window.KovalAILoaded = true;

  class KovalAiElement extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.isReady = false;
      this.messageQueue = [];

      // ✅ YOUR CORRECT DEPLOYMENT URL
      this.BASE_URL = "https://kovaldeepai-main.vercel.app";

      this.createWidget();
    }

    createWidget() {
      // ✅ Simple container
      const container = document.createElement('div');
      container.style.cssText = `
        width: 100%; height: 100%; min-height: 600px;
        border-radius: 10px; overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        position: relative; background: #fff;
      `;

      // ✅ Loading indicator
      this.loadingDiv = document.createElement('div');
      this.loadingDiv.style.cssText = `
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%); text-align: center;
        font-family: system-ui, sans-serif; z-index: 10;
      `;
      this.loadingDiv.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 10px;">🤿</div>
        <div style="color: #666;">Loading Koval AI...</div>
      `;

      // ✅ Simple iframe
      this.iframe = document.createElement('iframe');
      this.iframe.src = `${this.BASE_URL}/embed?userId=wix-guest-${Date.now()}&source=wix-widget`;
      this.iframe.style.cssText = `
        width: 100%; height: 100%; border: none;
        opacity: 0; transition: opacity 0.3s;
      `;
      this.iframe.allow = 'microphone; camera';

      // ✅ Load handler
      this.iframe.onload = () => {
        console.log('✅ Koval AI iframe loaded');
        this.isReady = true;
        this.loadingDiv.style.display = 'none';
        this.iframe.style.opacity = '1';
        this.sendInitialData();
        this.processQueue();
      };

      // ✅ Error handler
      this.iframe.onerror = () => {
        console.error('❌ Iframe failed to load');
        this.loadingDiv.innerHTML = `
          <div style="color: #e74c3c; font-size: 16px;">
            ⚠️ Chat temporarily unavailable
          </div>
          <button onclick="location.reload()" 
                  style="margin-top: 10px; padding: 8px 16px; 
                         background: #3498db; color: white; 
                         border: none; border-radius: 4px; cursor: pointer;">
            Retry
          </button>
        `;
      };

      container.appendChild(this.loadingDiv);
      container.appendChild(this.iframe);
      this.shadowRoot.appendChild(container);

      // ✅ Listen for messages
      window.addEventListener('message', (event) => {
        if (event.origin.includes('kovaldeepai-main.vercel.app')) {
          this.handleMessage(event);
        }
      });
    }

    // ✅ Send message to iframe
    postMessage(type, data = {}) {
      if (!this.isReady) {
        this.messageQueue.push({ type, data });
        return;
      }

      try {
        this.iframe.contentWindow.postMessage({
          type,
          ...data,
          timestamp: Date.now()
        }, this.BASE_URL);
        console.log('📤 Sent:', type);
      } catch (error) {
        console.warn('⚠️ Message send failed:', error);
      }
    }

    // ✅ Process queued messages
    processQueue() {
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        this.postMessage(msg.type, msg.data);
      }
    }

    // ✅ Send initial data
    sendInitialData() {
      // ✅ Try to get Wix user data
      let userData = {
        userId: 'wix-guest-' + Date.now(),
        userName: 'Guest User',
        source: 'wix-widget'
      };

      try {
        if (window.wixUsers && window.wixUsers.currentUser) {
          const user = window.wixUsers.currentUser;
          if (user.loggedIn) {
            userData = {
              userId: user.id,
              userName: user.displayName || user.nickname || 'Wix User',
              userEmail: user.loginEmail,
              source: 'wix-authenticated'
            };
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not get Wix user:', error);
      }

      this.postMessage('USER_AUTH', userData);
      console.log('✅ Sent user data:', userData.userName);

      // ✅ Load saved session
      try {
        const session = localStorage.getItem('koval_ai_session');
        if (session) {
          this.postMessage('LOAD_SAVED_SESSION', JSON.parse(session));
        }
      } catch (error) {
        console.warn('⚠️ Session load failed:', error);
      }
    }

    // ✅ Handle messages from iframe
    handleMessage(event) {
      const { type, data } = event.data;
      console.log('📥 Received:', type);

      switch (type) {
        case 'embed_ready':
          this.sendInitialData();
          break;

        case 'new_message':
          this.notifyParent('new_message');
          break;

        case 'close_chat':
          this.notifyParent('close_chat');
          break;

        case 'save_session':
          try {
            localStorage.setItem('koval_ai_session', JSON.stringify(data));
          } catch (error) {
            console.warn('⚠️ Session save failed:', error);
          }
          break;

        case 'resize':
          if (data.height) {
            this.style.height = Math.max(data.height, 400) + 'px';
          }
          break;
      }
    }

    // ✅ Notify parent window
    notifyParent(type, data = {}) {
      try {
        if (window.parent !== window) {
          window.parent.postMessage({
            type: `koval_ai_${type}`,
            source: 'koval-ai-widget',
            ...data
          }, '*');
        }
      } catch (error) {
        console.warn('⚠️ Parent notify failed:', error);
      }
    }

    // ✅ Public methods
    loadUserData(data) {
      this.postMessage('USER_DATA', data);
    }

    saveSession(data) {
      this.postMessage('SAVE_SESSION', data);
    }

    connectedCallback() {
      console.log('✅ Koval AI widget connected');
    }

    disconnectedCallback() {
      console.log('❌ Koval AI widget disconnected');
    }
  }

  // ✅ Register custom element
  try {
    if (!customElements.get('koval-ai')) {
      customElements.define('koval-ai', KovalAiElement);
      console.log('✅ Koval AI element registered');
    }
  } catch (error) {
    console.error('❌ Registration failed:', error);
  }

  // ✅ Global API
  window.KovalAI = {
    loadUserData: (data) => {
      const widget = document.querySelector('koval-ai');
      if (widget) {
        widget.loadUserData(data);
        return true;
      }
      return false;
    },

    saveSession: (data) => {
      const widget = document.querySelector('koval-ai');
      if (widget) {
        widget.saveSession(data);
        return true;
      }
      return false;
    },

    isReady: () => {
      const widget = document.querySelector('koval-ai');
      return widget ? widget.isReady : false;
    }
  };

  console.log('✅ Koval AI Widget v2.0 loaded');

})();
