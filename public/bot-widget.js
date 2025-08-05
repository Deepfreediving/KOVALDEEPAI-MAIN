class KovalAiElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.wixTarget = this.getAttribute('wix-target');

    // ✅ Multiple allowed origins (trusted sources only)
    this.ALLOWED_ORIGINS = [
      "https://kovaldeepai-main.vercel.app",
      "https://www.deepfreediving.com"
    ];

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
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      backgroundColor: '#fff'
    });

    // ==== Bot Iframe ====
    this.iframe = document.createElement('iframe');
    this.iframe.src = `${this.ALLOWED_ORIGINS[0]}/embed`;
    this.iframe.allow = 'microphone; camera; fullscreen';
    Object.assign(this.iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      overflow: 'hidden'
    });

    container.appendChild(this.iframe);
    this.shadowRoot.appendChild(container);

    // Resize observer for responsiveness
    this.resizeObserver = new ResizeObserver(() => {
      this.iframe.style.height = `${this.offsetHeight}px`;
      this.iframe.style.width = `${this.offsetWidth}px`;
    });
    this.resizeObserver.observe(this);
  }

  /**
   * ✅ Securely post message to iframe
   */
  postToIframe(type, data = {}) {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({ type, ...data }, this.ALLOWED_ORIGINS[0]);
    }
  }

  /**
   * ✅ Send initial data (theme, user info, saved session)
   */
  sendInitialData() {
    const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    this.postToIframe("THEME_CHANGE", { dark: isDark });

    // Wix member details
    if (window.wixUsers && window.wixUsers.currentUser) {
      this.postToIframe("USER_AUTH", {
        userId: window.wixUsers.currentUser.loginEmail || window.wixUsers.currentUser.id,
        profile: {
          id: window.wixUsers.currentUser.id,
          loginEmail: window.wixUsers.currentUser.loginEmail
        }
      });
    }

    // Saved session
    const savedSession = localStorage.getItem("koval_ai_session");
    if (savedSession) {
      try {
        this.postToIframe("LOAD_SAVED_SESSION", JSON.parse(savedSession));
      } catch (err) {
        console.warn("⚠️ Failed to parse saved session:", err);
      }
    }
  }

  /**
   * ✅ Load user data dynamically
   */
  loadUserData(payload = {}) {
    if (!payload || typeof payload !== "object") return;
    this.postToIframe("USER_DATA", { payload });
  }

  /**
   * ✅ Save session locally
   */
  saveSession(payload) {
    try {
      localStorage.setItem("koval_ai_session", JSON.stringify(payload));
    } catch (err) {
      console.warn("⚠️ Failed to save session:", err);
    }
  }

  /**
   * ✅ Handle incoming messages safely
   */
  handleMessage(event) {
    if (!event.data) return;

    // ✅ Only allow messages from trusted origins or Wix internal
    if (!this.ALLOWED_ORIGINS.includes(event.origin) && !event.data.fromWix) {
      console.warn("⚠️ Blocked message from unauthorized origin:", event.origin);
      return;
    }

    switch (event.data.type) {
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
    }
  }

  connectedCallback() {
    // ✅ Send BOT_READY event once iframe is loaded
    this.iframe.addEventListener("load", () => {
      this.sendInitialData();
      window.parent.postMessage({ type: "BOT_READY" }, this.ALLOWED_ORIGINS[0]);
    });

    // Wix-specific listener
    if (this.wixTarget && window.$w) {
      try {
        const wixEl = $w(`#${this.wixTarget}`);
        if (wixEl && typeof wixEl.onMessage === "function") {
          wixEl.onMessage((msg) => this.handleMessage({ data: msg, fromWix: true }));
          return;
        }
      } catch (err) {
        console.warn("⚠️ Failed to attach Wix onMessage:", err);
      }
    }

    // ✅ Fallback to window listener
    window.addEventListener("message", (event) => this.handleMessage(event));
  }

  disconnectedCallback() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}

customElements.define('koval-ai', KovalAiElement);

// ✅ Allow external scripts to call bot methods
window.KovalAI = {
  loadUserData: (data) => document.querySelector('koval-ai')?.loadUserData(data),
  saveSession: (data) => document.querySelector('koval-ai')?.saveSession(data),
};
