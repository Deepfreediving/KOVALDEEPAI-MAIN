/**
 * 🚀 SESSION MANAGEMENT SYSTEM
 * Handles Wix/OpenAI/Vercel integration with session upgrades and data buffering
 */

const SESSION_CONFIG = {
  VERCEL_HANDSHAKE_TIMEOUT: 10000, // 10 seconds
  BUFFER_FLUSH_INTERVAL: 30000, // 30 seconds
  SESSION_UPGRADE_TIMEOUT: 15000, // 15 seconds
  MAX_BUFFER_SIZE: 50, // Max buffered operations
};

class SessionManager {
  constructor() {
    this.sessionData = {
      userId: null,
      wixMemberId: null,
      sessionId: null,
      isAuthenticated: false,
      connectionStatus: "disconnected",
      lastHandshake: null,
      bufferData: [],
    };

    this.handshakeInProgress = false;
    this.bufferFlushTimer = null;
    this.listeners = new Set();
  }

  // ===== SESSION INITIALIZATION =====

  /**
   * Initialize session with Vercel handshake
   */
  async initializeSession(wixMemberId = null) {
    console.log("🔄 Initializing session...", { wixMemberId });

    try {
      // Generate or retrieve userId
      let userId = localStorage.getItem("kovalUserId");
      if (!userId) {
        userId = this.generateUserId();
        localStorage.setItem("kovalUserId", userId);
      }

      this.sessionData.userId = userId;
      this.sessionData.wixMemberId = wixMemberId;
      this.sessionData.sessionId = this.generateSessionId();

      // Attempt Vercel handshake
      const handshakeSuccess = await this.performVercelHandshake();

      if (handshakeSuccess) {
        this.sessionData.connectionStatus = "connected";
        this.sessionData.isAuthenticated = !!wixMemberId;
        this.sessionData.lastHandshake = Date.now();

        // Start buffer flush timer
        this.startBufferFlushTimer();

        console.log("✅ Session initialized successfully", this.sessionData);
      } else {
        this.sessionData.connectionStatus = "offline";
        console.log("⚠️ Session initialized in offline mode", this.sessionData);
      }

      this.notifyListeners();
      return this.sessionData;
    } catch (error) {
      console.error("❌ Session initialization failed:", error);
      this.sessionData.connectionStatus = "error";
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Perform Vercel handshake to establish connection
   */
  async performVercelHandshake() {
    if (this.handshakeInProgress) {
      console.log("⏳ Handshake already in progress...");
      return false;
    }

    this.handshakeInProgress = true;

    try {
      console.log("🤝 Performing Vercel handshake...");

      const handshakeData = {
        userId: this.sessionData.userId,
        wixMemberId: this.sessionData.wixMemberId,
        sessionId: this.sessionData.sessionId,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      };

      const response = await fetch("/api/system/vercel-handshake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(handshakeData),
        signal: AbortSignal.timeout(SESSION_CONFIG.VERCEL_HANDSHAKE_TIMEOUT),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Vercel handshake successful:", result);
        return true;
      } else {
        console.warn("⚠️ Vercel handshake failed:", response.status);
        return false;
      }
    } catch (error) {
      if (error.name === "TimeoutError") {
        console.warn("⏰ Vercel handshake timeout");
      } else {
        console.error("❌ Vercel handshake error:", error);
      }
      return false;
    } finally {
      this.handshakeInProgress = false;
    }
  }

  // ===== SESSION UPGRADES =====

  /**
   * Upgrade temporary user to authenticated Wix member
   */
  async upgradeToAuthenticatedSession(wixMemberId, wixAccessToken) {
    console.log("⬆️ Upgrading session to authenticated...", { wixMemberId });

    try {
      const upgradeData = {
        tempUserId: this.sessionData.userId,
        wixMemberId,
        wixAccessToken,
        sessionId: this.sessionData.sessionId,
        bufferData: this.sessionData.bufferData,
      };

      const response = await fetch("/api/system/upgrade-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(upgradeData),
        signal: AbortSignal.timeout(SESSION_CONFIG.SESSION_UPGRADE_TIMEOUT),
      });

      if (response.ok) {
        const result = await response.json();

        // Update session data
        this.sessionData.wixMemberId = wixMemberId;
        this.sessionData.isAuthenticated = true;
        this.sessionData.connectionStatus = "connected";

        // Clear buffer after successful upgrade
        this.sessionData.bufferData = [];

        console.log("✅ Session upgrade successful:", result);
        this.notifyListeners();
        return result;
      } else {
        throw new Error(`Session upgrade failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Session upgrade failed:", error);
      throw error;
    }
  }

  // ===== DATA BUFFERING =====

  /**
   * Buffer data for later transmission (when offline or during upgrades)
   */
  bufferData(operation, data) {
    if (this.sessionData.bufferData.length >= SESSION_CONFIG.MAX_BUFFER_SIZE) {
      console.warn("⚠️ Buffer full, removing oldest entry");
      this.sessionData.bufferData.shift();
    }

    const bufferedItem = {
      id: this.generateBufferId(),
      operation,
      data,
      timestamp: Date.now(),
      userId: this.sessionData.userId,
      wixMemberId: this.sessionData.wixMemberId,
    };

    this.sessionData.bufferData.push(bufferedItem);
    console.log("💾 Data buffered:", operation, bufferedItem.id);

    // Save to localStorage as backup
    localStorage.setItem(
      "kovalSessionBuffer",
      JSON.stringify(this.sessionData.bufferData),
    );
  }

  /**
   * Flush buffered data to server
   */
  async flushBufferedData() {
    if (this.sessionData.bufferData.length === 0) {
      return;
    }

    if (this.sessionData.connectionStatus !== "connected") {
      console.log("⏳ Not connected, skipping buffer flush");
      return;
    }

    console.log(
      "🔄 Flushing buffered data...",
      this.sessionData.bufferData.length,
      "items",
    );

    try {
      const response = await fetch("/api/system/flush-buffer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: this.sessionData.userId,
          wixMemberId: this.sessionData.wixMemberId,
          sessionId: this.sessionData.sessionId,
          bufferData: this.sessionData.bufferData,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        this.sessionData.bufferData = [];
        localStorage.removeItem("kovalSessionBuffer");
        console.log(
          "✅ Buffer flushed successfully:",
          result.processed,
          "items",
        );
      } else {
        console.warn("⚠️ Buffer flush failed:", response.status);
      }
    } catch (error) {
      console.error("❌ Buffer flush error:", error);
    }
  }

  /**
   * Start automatic buffer flush timer
   */
  startBufferFlushTimer() {
    if (this.bufferFlushTimer) {
      clearInterval(this.bufferFlushTimer);
    }

    this.bufferFlushTimer = setInterval(() => {
      this.flushBufferedData();
    }, SESSION_CONFIG.BUFFER_FLUSH_INTERVAL);

    console.log("⏰ Buffer flush timer started");
  }

  /**
   * Stop buffer flush timer
   */
  stopBufferFlushTimer() {
    if (this.bufferFlushTimer) {
      clearInterval(this.bufferFlushTimer);
      this.bufferFlushTimer = null;
      console.log("⏹️ Buffer flush timer stopped");
    }
  }

  // ===== EVENT LISTENERS =====

  /**
   * Add listener for session changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of session changes
   */
  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.sessionData);
      } catch (error) {
        console.error("❌ Session listener error:", error);
      }
    });
  }

  // ===== UTILITY METHODS =====

  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateBufferId() {
    return `buffer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Get current session status
   */
  getSessionStatus() {
    return {
      ...this.sessionData,
      bufferSize: this.sessionData.bufferData.length,
      isOnline: this.sessionData.connectionStatus === "connected",
    };
  }

  /**
   * Destroy session and cleanup
   */
  destroy() {
    this.stopBufferFlushTimer();
    this.listeners.clear();
    this.sessionData = {
      userId: null,
      wixMemberId: null,
      sessionId: null,
      isAuthenticated: false,
      connectionStatus: "disconnected",
      lastHandshake: null,
      bufferData: [],
    };
    console.log("🗑️ Session destroyed");
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
export default sessionManager;
