class KovalBotElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Main container for iframe
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    // Iframe for Bot UI (loads automatically)
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
   * ✅ Post message to iframe safely
   */
  postToIframe(type, data) {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage({ type, data }, "https://kovaldeepai-main.vercel.app");
    }
  }

  /**
   * ✅ Load user data from Wix page into the bot
   */
  loadUserData(payload) {
    this.postToIframe("LOAD_USER_DATA", payload);
  }

  /**
   * ✅ Save session data to server and local storage
   */
  async saveSession(sessionData) {
    try {
      // Save remotely
      await fetch("https://kovaldeepai-main.vercel.app/api/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });

      // Save locally for next session
      localStorage.setItem("kovalbot_session", JSON.stringify(sessionData));

      window.dispatchEvent(new CustomEvent("KovalBotSessionSaved", { detail: sessionData }));
    } catch (error) {
      console.error("❌ Failed to save session:", error);
    }
  }

  /**
   * ✅ Get Wix member details
   */
  getMemberDetails() {
    try {
      if (window?.wixEmbedsAPI?.getCurrentMember) {
        return window.wixEmbedsAPI.getCurrentMember();
      }
      const localMember = localStorage.getItem("__wix.memberDetails");
      if (localMember) return JSON.parse(localMember);
    } catch (e) {
      console.warn("⚠️ Error fetching member details:", e);
    }
    return null;
  }

  /**
   * ✅ Send initial data (auth, theme) to the bot
   */
  sendInitialData() {
    const isDark = document.documentElement.classList.contains("theme-dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    this.postToIframe("THEME_CHANGE", { dark: isDark });

    const memberDetails = this.getMemberDetails();
    if (memberDetails) {
      this.postToIframe("USER_AUTH", {
        userId: memberDetails?.loginEmail || memberDetails?.id,
        profile: memberDetails
      });
    }

    // If we have cached session, load it
    const savedSession = localStorage.getItem("kovalbot_session");
    if (savedSession) {
      this.postToIframe("LOAD_SAVED_SESSION", JSON.parse(savedSession));
    }
  }

  connectedCallback() {
    // When iframe is ready, send data
    this.iframe.addEventListener("load", () => {
      this.sendInitialData();
      window.parent.postMessage("BOT_READY", "*");
    });

    // Listen for messages from Wix frontend
    window.addEventListener("message", (event) => {
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
    });
  }
}

customElements.define('koa-bot', KovalBotElement);

window.KovalBot = {
  loadUserData: (data) => document.querySelector('koa-bot')?.loadUserData(data),
  saveSession: (data) => document.querySelector('koa-bot')?.saveSession(data),
};
