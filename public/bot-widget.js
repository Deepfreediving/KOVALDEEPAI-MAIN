class KovalAiElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.wixTarget = this.getAttribute('wix-target'); // ✅ new attribute for Wix targeting

    // Main container
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    // Bot iframe
    this.iframe = document.createElement('iframe');
    this.iframe.src = "https://kovaldeepai-main.vercel.app/embed";
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    this.iframe.style.overflow = 'hidden';

    container.appendChild(this.iframe);
    this.shadowRoot.appendChild(container);
  }

  /**
   * ✅ Safely post message to iframe
   */
  postToIframe(type, data) {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({ type, ...data }, "*");
    }
  }

  /**
   * Load user data from Wix and send to bot iframe
   */
  loadUserData(payload) {
    this.postToIframe("USER_DATA", { payload });
  }

  /**
   * Save current session to local storage
   */
  saveSession(payload) {
    localStorage.setItem("koval_ai_session", JSON.stringify(payload));
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
   * Send initial data (theme, user info, cached session)
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
      this.postToIframe("LOAD_SAVED_SESSION", JSON.parse(savedSession));
    }
  }

  connectedCallback() {
    // ✅ Send BOT_READY event after iframe loads
    this.iframe.addEventListener("load", () => {
      this.sendInitialData();
      window.parent.postMessage({ type: "BOT_READY" }, "*");
    });

    /**
     * Handle incoming messages from Wix or fallback listener
     */
    const handleMessage = (event) => {
      if (!event.data) return;
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
      }
    };

    // ✅ Prefer Wix $w.onMessage if available
    if (this.wixTarget && window.$w) {
      try {
        const wixEl = $w(`#${this.wixTarget}`);
        if (wixEl && typeof wixEl.onMessage === "function") {
          wixEl.onMessage(handleMessage);
          return;
        }
      } catch (err) {
        console.warn("⚠️ Failed to attach Wix onMessage:", err);
      }
    }

    // ✅ Fallback to standard message listener
    window.addEventListener("message", handleMessage);
  }
}

customElements.define('koval-ai', KovalAiElement);

// ✅ Allow external scripts to trigger bot methods
window.KovalAI = {
  loadUserData: (data) => document.querySelector('koval-ai')?.loadUserData(data),
  saveSession: (data) => document.querySelector('koval-ai')?.saveSession(data),
};
