// ✅ Wix API Client - Centralized API calls to Wix DiveLogs collection
// This handles all communication with the Wix backend for dive logs

import WIX_APP_CONFIG from "@/lib/wixAppConfig";

export class WixApiClient {
  constructor() {
    this.baseUrl = WIX_APP_CONFIG.baseUrl;
    this.apiKey = WIX_APP_CONFIG.apiKey || "dev-mode";
  }

  /**
   * Save a dive log to Wix DiveLogs collection
   * @param {Object} diveLogData - Compressed dive log data
   * @returns {Promise<Object>} - Wix response
   */
  async saveDiveLog(diveLogData) {
    try {
      console.log("🌐 WixApiClient: Saving dive log to DiveLogs collection...");

      const response = await fetch(
        `${this.baseUrl}/api/wix/dive-journal-repeater`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            action: "insert",
            collection: "DiveLogs",
            data: diveLogData,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log(
          "✅ WixApiClient: Dive log saved successfully:",
          result.data?._id,
        );
        return { success: true, data: result.data };
      } else {
        const errorText = await response.text();
        console.error(
          "❌ WixApiClient: Save failed:",
          response.status,
          errorText,
        );
        return { success: false, error: errorText, status: response.status };
      }
    } catch (error) {
      console.error("❌ WixApiClient: Save error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get dive logs from Wix DiveLogs collection
   * @param {string} userId - User ID to filter by
   * @param {number} limit - Maximum number of logs to return
   * @returns {Promise<Object>} - Wix response with dive logs
   */
  async getDiveLogs(userId, limit = 50) {
    try {
      console.log(`🌐 WixApiClient: Fetching dive logs for user: ${userId}`);

      const response = await fetch(
        `${this.baseUrl}/api/wix/dive-journal-repeater`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            action: "query",
            collection: "DiveLogs",
            userId: userId,
            limit: limit,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log(
          `✅ WixApiClient: Found ${result.data?.items?.length || 0} dive logs`,
        );
        return { success: true, data: result.data };
      } else {
        const errorText = await response.text();
        console.error(
          "❌ WixApiClient: Query failed:",
          response.status,
          errorText,
        );
        return { success: false, error: errorText, status: response.status };
      }
    } catch (error) {
      console.error("❌ WixApiClient: Query error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a dive log from Wix DiveLogs collection
   * @param {string} diveLogId - The Wix _id of the log to delete
   * @returns {Promise<Object>} - Wix response
   */
  async deleteDiveLog(diveLogId) {
    try {
      console.log(`🌐 WixApiClient: Deleting dive log: ${diveLogId}`);

      const response = await fetch(
        `${this.baseUrl}/api/wix/dive-journal-repeater`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            action: "remove",
            collection: "DiveLogs",
            itemId: diveLogId,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ WixApiClient: Dive log deleted successfully");
        return { success: true, data: result.data };
      } else {
        const errorText = await response.text();
        console.error(
          "❌ WixApiClient: Delete failed:",
          response.status,
          errorText,
        );
        return { success: false, error: errorText, status: response.status };
      }
    } catch (error) {
      console.error("❌ WixApiClient: Delete error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a dive log in Wix DiveLogs collection
   * @param {string} diveLogId - The Wix _id of the log to update
   * @param {Object} updateData - New dive log data
   * @returns {Promise<Object>} - Wix response
   */
  async updateDiveLog(diveLogId, updateData) {
    try {
      console.log(`🌐 WixApiClient: Updating dive log: ${diveLogId}`);

      const response = await fetch(
        `${this.baseUrl}/api/wix/dive-journal-repeater`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            action: "update",
            collection: "DiveLogs",
            itemId: diveLogId,
            data: updateData,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ WixApiClient: Dive log updated successfully");
        return { success: true, data: result.data };
      } else {
        const errorText = await response.text();
        console.error(
          "❌ WixApiClient: Update failed:",
          response.status,
          errorText,
        );
        return { success: false, error: errorText, status: response.status };
      }
    } catch (error) {
      console.error("❌ WixApiClient: Update error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test the connection to Wix DiveLogs collection
   * @returns {Promise<boolean>} - Connection status
   */
  async testConnection() {
    try {
      console.log(
        "🌐 WixApiClient: Testing connection to DiveLogs collection...",
      );

      const response = await fetch(
        `${this.baseUrl}/api/wix/dive-journal-repeater`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            action: "test",
            collection: "DiveLogs",
          }),
        },
      );

      const isConnected = response.ok;
      console.log(
        `${isConnected ? "✅" : "❌"} WixApiClient: Connection test ${isConnected ? "passed" : "failed"}`,
      );
      return isConnected;
    } catch (error) {
      console.error("❌ WixApiClient: Connection test error:", error);
      return false;
    }
  }
}

// Export singleton instance
export const wixApiClient = new WixApiClient();
export default wixApiClient;
