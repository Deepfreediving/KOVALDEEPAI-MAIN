(function () {
  'use strict';

  if (window.KovalAILoaded) return;
  window.KovalAILoaded = true;

  const ALLOWED_ORIGIN = "https://kovaldeepai-main.vercel.app";

  class KovalAiElement extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.isReady = false;
      this.messageQueue = [];

      this.BASE_URL = ALLOWED_ORIGIN;

      this.createWidget();
    }

    createWidget() {
      const container = document.createElement('div');
      container.style.cssText = `
        width: 100%; height: 100%; min-height: 600px;
        border-radius: 10px; overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        position: relative; background: #fff;
      `;

      // Loading Indicator
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

      // Default Guest User
      let userData = {
        userId: 'wix-guest-' + Date.now(),
        userName: 'Guest User',
        source: 'wix-widget'
      };

      try {
        if (window.wixUsers?.currentUser?.loggedIn) {
          userData = {
            userId: window.wixUsers.currentUser.id,
            userName: window.wixUsers.currentUser.displayName || 'Wix User',
            userEmail: window.wixUsers.currentUser.loginEmail || '',
            source: 'wix-authenticated'
          };
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch Wix user info:', err);
      }

      // Embed Iframe
      this.iframe = document.createElement('iframe');
      this.iframe.src = `${this.BASE_URL}/embed?userId=${encodeURIComponent(userData.userId)}&source=${encodeURIComponent(userData.source)}`;
      this.iframe.style.cssText = `
        width: 100%; height: 100%; border: none;
        opacity: 0; transition: opacity 0.3s;
      `;
      this.iframe.allow = 'microphone; camera';

      this.iframe.onload = () => {
        console.log('✅ Koval AI iframe loaded');
        this.isReady = true;
        this.loadingDiv.style.display = 'none';
        this.iframe.style.opacity = '1';

        this.postMessage('USER_AUTH', userData);
        this.sendInitialSession();
        this.processQueue();
      };

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

      // Message Listener
      window.addEventListener('message', (event) => {
        if (event.origin === ALLOWED_ORIGIN) {
          this.handleMessage(event);
        }
      });

      // Listen for Wix user login updates
      document.addEventListener('wixUserLogin', (e) => {
        const data = e.detail;
        if (data?.userId) {
          this.postMessage('USER_AUTH', data);
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
        console.log('📤 Sent:', type, data);
      } catch (error) {
        console.warn('⚠️ Message send failed:', error);
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
        const session = localStorage.getItem('koval_ai_session');
        if (session) {
          this.postMessage('LOAD_SESSION', JSON.parse(session));
        }
      } catch (error) {
        console.warn('⚠️ Session load failed:', error);
      }
    }

    handleMessage(event) {
      const { type, data } = event.data;
      console.log('📥 Received:', type, data);

      switch (type) {
        case 'embed_ready':
          console.log('✅ Embed confirmed ready');
          this.processQueue();
          break;

        case 'SAVE_SESSION':
          try {
            localStorage.setItem('koval_ai_session', JSON.stringify(data));
          } catch (error) {
            console.warn('⚠️ Session save failed:', error);
          }
          break;

        case 'resize':
          if (data?.height) {
            this.style.height = Math.max(data.height, 400) + 'px';
          }
          break;
      }
    }

    connectedCallback() {
      console.log('✅ Koval AI widget connected');
    }

    disconnectedCallback() {
      console.log('❌ Koval AI widget disconnected');
    }
  }

  if (!customElements.get('koval-ai')) {
    customElements.define('koval-ai', KovalAiElement);
    console.log('✅ Koval AI element registered');
  }

  // Global API
  window.KovalAI = {
    loadUserData: (data) => {
      const widget = document.querySelector('koval-ai');
      if (widget) {
        widget.postMessage('USER_AUTH', data);
        return true;
      }
      return false;
    },
    saveSession: (data) => {
      const widget = document.querySelector('koval-ai');
      if (widget) {
        widget.postMessage('SAVE_SESSION', data);
        return true;
      }
      return false;
    },
    isReady: () => {
      const widget = document.querySelector('koval-ai');
      return widget ? widget.isReady : false;
    }
  };

  console.log('✅ Koval AI Widget v2.2 loaded');
})();
