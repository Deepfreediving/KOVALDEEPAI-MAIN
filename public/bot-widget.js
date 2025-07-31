class KovalBotElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Main floating container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '99999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'flex-end';

    // Floating button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.textContent = '🤿 Chat';
    this.toggleBtn.style.background = '#007bff';
    this.toggleBtn.style.color = '#fff';
    this.toggleBtn.style.border = 'none';
    this.toggleBtn.style.padding = '10px 14px';
    this.toggleBtn.style.borderRadius = '6px';
    this.toggleBtn.style.cursor = 'pointer';
    this.toggleBtn.style.fontSize = '14px';
    this.toggleBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    this.toggleBtn.addEventListener('click', () => this.toggleBot());

    // Chat iframe container (hidden by default)
    this.chatBox = document.createElement('div');
    this.chatBox.style.width = '350px';
    this.chatBox.style.height = '500px';
    this.chatBox.style.background = '#fff';
    this.chatBox.style.border = '1px solid #ccc';
    this.chatBox.style.borderRadius = '8px';
    this.chatBox.style.overflow = 'hidden';
    this.chatBox.style.display = 'none';
    this.chatBox.style.marginTop = '10px';
    this.chatBox.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';

    // Iframe for Bot UI
    this.iframe = document.createElement('iframe');
    this.iframe.src = "https://kovaldeepai-main.vercel.app/embed";
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    this.iframe.style.overflow = 'hidden';

    this.chatBox.appendChild(this.iframe);
    container.appendChild(this.toggleBtn);
    container.appendChild(this.chatBox);
    this.shadowRoot.appendChild(container);
  }

  /**
   * ✅ Toggle chatbot open/close
   */
  toggleBot() {
    const isOpen = this.chatBox.style.display === 'block';
    this.chatBox.style.display = isOpen ? 'none' : 'block';
  }

  /**
   * ✅ Force open bot (e.g., when no memories found)
   */
  openBot() {
    this.chatBox.style.display = 'block';
  }

  /**
   * ✅ Post message to iframe
   */
  postToIframe(type, data) {
    const attemptPost = () => {
      if (this.iframe?.contentWindow) {
        this.iframe.contentWindow.postMessage({ type, data }, "https://kovaldeepai-main.vercel.app");
      } else {
        console.warn("⚠️ Iframe not ready yet, retrying...");
      }
    };
    attemptPost();
    setTimeout(attemptPost, 500);
  }

  sendMessage(message) {
    this.postToIframe("USER_MESSAGE", message);
  }

  loadDiveLogs(userId) {
    this.postToIframe("LOAD_LOGS", { userId });
  }

  async saveSession(sessionData) {
    try {
      const response = await fetch("https://kovaldeepai-main.vercel.app/api/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });
      const result = await response.json();
      window.dispatchEvent(new CustomEvent("KovalBotSessionSaved", { detail: result }));
      if (sessionData.userId) {
        this.loadDiveLogs(sessionData.userId);
      }
    } catch (error) {
      console.error("❌ Failed to save session:", error);
    }
  }

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
  }

  connectedCallback() {
    this.iframe.addEventListener("load", () => {
      this.sendInitialData();
    });

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

    if (window.wixEmbedsAPI?.onReady) {
      window.wixEmbedsAPI.onReady(() => this.sendInitialData());
    }

    // ✅ Listen for frontend "no memories found" event
    window.addEventListener("OpenBotIfNoMemories", () => this.openBot());
  }
}

customElements.define('koa-bot', KovalBotElement);

window.KovalBot = {
  sendMessage: (msg) => document.querySelector('koa-bot')?.sendMessage(msg),
  loadDiveLogs: (userId) => document.querySelector('koa-bot')?.loadDiveLogs(userId),
  saveSession: (data) => document.querySelector('koa-bot')?.saveSession(data),
  openBot: () => document.querySelector('koa-bot')?.openBot()
};
