// bot-widget.js
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
   * Save a session
   */
  saveSession(sessionData) {
    fetch("https://kovaldeepai-main.vercel.app/api/saveSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sessionData)
    })
    .then(res => res.json())
    .then(result => {
      window.dispatchEvent(new CustomEvent("KovalBotSessionSaved", { detail: result }));
    });
  }

  /**
   * Helper to send messages to iframe
   */
  postToIframe(type, data) {
    this.iframe?.contentWindow?.postMessage({ type, data }, "*");
  }

  connectedCallback() {
    // ✅ Listen for messages from iframe
    window.addEventListener("message", (event) => {
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
      }
    });

    // ✅ Detect theme automatically from Wix page
    const detectTheme = () => {
      const isDark = document.documentElement.classList.contains("theme-dark") ||
                     window.matchMedia("(prefers-color-scheme: dark)").matches;
      this.postToIframe("THEME_CHANGE", { dark: isDark });
    };
    detectTheme();

    // ✅ Send Wix member details if available
    const memberDetails = window?.wixEmbedsAPI?.getCurrentMember?.();
    if (memberDetails) {
      this.postToIframe("USER_AUTH", {
        userId: memberDetails?.loginEmail || memberDetails?.id,
        profile: memberDetails
      });
    } else {
      // fallback: check localStorage
      const localMember = localStorage.getItem("__wix.memberDetails");
      if (localMember) {
        try {
          const parsed = JSON.parse(localMember);
          this.postToIframe("USER_AUTH", {
            userId: parsed.loginEmail || parsed.id,
            profile: parsed
          });
        } catch (e) {}
      }
    }
  }
}

// Register custom element
customElements.define('koval-bot', KovalBotElement);

// Expose a global API
window.KovalBot = {
  sendMessage: (msg) => document.querySelector('koval-bot')?.sendMessage(msg),
  loadDiveLogs: (userId) => document.querySelector('koval-bot')?.loadDiveLogs(userId),
  saveSession: (data) => document.querySelector('koval-bot')?.saveSession(data),
};
