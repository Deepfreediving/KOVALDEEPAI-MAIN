class KovalBotElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Container
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.border = 'none';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    // Iframe for UI
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
   * Helper to safely send messages to iframe
   */
  postToIframe(type, data) {
    const attemptPost = () => {
      if (this.iframe?.contentWindow) {
        this.iframe.contentWindow.postMessage({ type, data }, "https://kovaldeepai-main.vercel.app");
      } else {
        console.warn("⚠️ Iframe not ready yet, retrying...");
      }
    };
    // Try immediately and retry if iframe not yet ready
    attemptPost();
    setTimeout(attemptPost, 500);
  }

  /**
   * Send a message to the bot iframe
   */
  sendMessage(message) {
    this.postToIframe("USER_MESSAGE", message);
  }

  /**
   * Load dive logs for a user
   */
  loadDiveLogs(userId) {
    this.postToIframe("LOAD_LOGS", { userId });
  }

  /**
   * Save a session and auto-refresh logs
   */
  async saveSession(sessionData) {
    try {
      const response = await fetch("https://kovaldeepai-main.vercel.app/api/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });

      const result = await response.json();

      // ✅ Trigger custom event for external listeners
      window.dispatchEvent(new CustomEvent("KovalBotSessionSaved", { detail: result }));

      // ✅ Auto-refresh logs if userId is available
      if (sessionData.userId) {
        console.log("✅ Session saved, refreshing logs...");
        this.loadDiveLogs(sessionData.userId);
      }
    } catch (error) {
      console.error("❌ Failed to save session:", error);
    }
  }

  /**
   * Retrieve member details from Wix or localStorage
   */
  getMemberDetails() {
    try {
      if (window?.wixEmbedsAPI?.getCurrentMember) {
        return window.wixEmbedsAPI.getCurrentMember();
      }
      const localMember = localStorage.getItem("__wix.memberDetails");
      if (localMember) {
        return JSON.parse(localMember);
      }
    } catch (e) {
      console.warn("⚠️ Error fetching member details:", e);
    }
    return null;
  }

  /**
   * Sends initial user info and theme to bot
   */
  sendInitialData() {
    // Theme detection
    const isDark = document.documentElement.classList.contains("theme-dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    this.postToIframe("THEME_CHANGE", { dark: isDark });

    // Member info
    const memberDetails = this.getMemberDetails();
    if (memberDetails) {
      this.postToIframe("USER_AUTH", {
        userId: memberDetails?.loginEmail || memberDetails?.id,
        profile: memberDetails
      });
    }
  }

  connectedCallback() {
    // Wait for iframe to fully load before sending data
    this.iframe.addEventListener("load", () => {
      this.sendInitialData();
    });

    // Listen for messages from iframe
    window.addEventListener("message", (event) => {
      if (event.origin !== "https://kovaldeepai-main.vercel.app") return;
      if (!event.data) return;

      switch (event.data.type) {
        case "BOT_RESPONSE":
          window.dispatchEvent(new CustomEvent("KovalBotResponse", { detail: event.data.data }));
          break;

        case "RESIZE_IFRAME":
          if (event.data.data?.height) {
            this.iframe.style.height = `${event.data.data.height}px`;
          }
          break;

        case "REQUEST_USER_DETAILS":
          this.sendInitialData();
          break;
      }
    });

    // Handle wixEmbedsAPI readiness
    if (window.wixEmbedsAPI?.onReady) {
      window.wixEmbedsAPI.onReady(() => {
        this.sendInitialData();
      });
    }
  }
}

// ✅ Register custom element (must match Wix Tag Name)
customElements.define('koa-bot', KovalBotElement);

// ✅ Expose a global API (match <koa-bot> tag)
window.KovalBot = {
  sendMessage: (msg) => document.querySelector('koa-bot')?.sendMessage(msg),
  loadDiveLogs: (userId) => document.querySelector('koa-bot')?.loadDiveLogs(userId),
  saveSession: (data) => document.querySelector('koa-bot')?.saveSession(data),
};
