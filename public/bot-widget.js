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

    container.appendChild(this.iframe);
    this.shadowRoot.appendChild(container);
  }

  /**
   * Send a message to the bot iframe
   */
  sendMessage(message) {
    this.iframe.contentWindow.postMessage({
      type: 'USER_MESSAGE',
      data: message
    }, '*');
  }

  /**
   * Load dive logs for a user
   */
  loadDiveLogs(userId) {
    this.iframe.contentWindow.postMessage({
      type: 'LOAD_LOGS',
      data: { userId }
    }, '*');
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

  connectedCallback() {
    // Listen for messages from iframe
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "BOT_RESPONSE") {
        window.dispatchEvent(new CustomEvent("KovalBotResponse", { detail: event.data.data }));
      }
    });
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
