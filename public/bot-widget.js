class KovalAiElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.wixTarget = this.getAttribute('wix-target');

    // Allowed iframe origin
    this.ALLOWED_ORIGIN = "https://kovaldeepai-main.vercel.app";

    // ==== Main Container ====
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.minHeight = '700px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.overflow = 'hidden';
    container.style.borderRadius = '10px';
    container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
    container.style.backgroundColor = '#fff';

    // ==== Bot Iframe ====
    this.iframe = document.createElement('iframe');
    this.iframe.src = `${this.ALLOWED_ORIGIN}/embed`;
    this.iframe.allow = 'microphone; camera; fullscreen';
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    this.iframe.style.display = 'block';
    this.iframe.style.overflow = 'hidden';

    // Append iframe
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
   * ✅ Safely post message to iframe
   */
  postToIframe(type, data = {}) {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({ type, ...data }, this.ALLOWED_ORIGIN);
    }
  }

  /**
   * Load user data from Wix and send to bot iframe
   */
  loadUserData(payload = {}) {
    if (!payload || typeof payload !== "object") {
      console.warn("⚠️ Invalid payload received in loadUserData:", payload);
      return;
    }
    this.postToIframe("USER_DATA", { payload });
  }

  /**
   * Save current session locally
   */
  saveSession(payload) {
    try {
      localStorage.setItem("koval_ai_session", JSON.stringify(payload));
    } catch (err) {
      console.warn("⚠️ Failed to save session:", err);
    }
  }

  /**
   * Retrieve Wix member details (if available)
   */
  getMemberDetails() {
    try {
      if (window.wixUsers && window.wixUsers.currentUser) {
        return {
          id: window.wixUsers.currentUser.id,
          loginEmail: window.wixUsers.currentUser.loginEmail
        };
      }
    } catch (err) {
      console.warn("⚠️ Unable to fetch Wix user details:", err);
    }
    return null;
  }

  /**
   * Send initial theme, user info, cached session to iframe
   */
  sendInitialData() {
    const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    this.postToIframe("THEME_CHANGE", { dark: isDark });

    const memberDetails = this.getMemberDetails();
    if (memberDetails) {
      this.postToIframe("USER_AUTH", {
        userId: memberDetails.loginEmail || memberDetails.id,
        profile: memberDetails
      });
    }

    const savedSession = localStorage.getItem("koval_ai_session");
    if (savedSession) {
      try {
        this.postToIframe("LOAD_SAVED_SESSION", JSON.parse(savedSession));
      } catch (err) {
        console.warn("⚠️ Failed to parse saved session:", err);
      }
    }
  }

  connectedCallback() {
    // ✅ Send BOT_READY event after iframe loads
    this.iframe.addEventListener("load", () => {
      this.sendInitialData();
      window.parent.postMessage({ type: "BOT_READY" }, this.ALLOWED_ORIGIN);
    });

    /**
     * Handle incoming messages
     */
    const handleMessage = (event) => {
      if (!event.data) return;

      // Validate origin
      if (event.origin !== this.ALLOWED_ORIGIN && !event.data.fromWix) {
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
    };

    // ✅ Prefer Wix $w.onMessage if available
    if (this.wixTarget && window.$w) {
      try {
        const wixEl = $w(`#${this.wixTarget}`);
        if (wixEl && typeof wixEl.onMessage === "function") {
          wixEl.onMessage((msg) => handleMessage({ data: msg, fromWix: true }));
          return;
        }
      } catch (err) {
        console.warn("⚠️ Failed to attach Wix onMessage:", err);
      }
    }

    // ✅ Fallback to standard message listener
    window.addEventListener("message", handleMessage);
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
