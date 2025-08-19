import axios from "axios";
import fs from "fs";
import path from "path";

interface WixQueryData {
  data?: Record<string, any>;
  options?: Record<string, any>;
}

const TOKENS_FILE = path.join(process.cwd(), "wix-tokens.json");

class WixClient {
  private tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null = null;

  constructor() {
    this.loadTokens();
  }

  /**
   * Load saved OAuth tokens from file
   */
  private loadTokens() {
    if (fs.existsSync(TOKENS_FILE)) {
      this.tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));
    } else {
      console.warn("⚠️ Wix tokens not found. OAuth flow required.");
      this.tokens = null;
    }
  }

  /**
   * Save tokens to file
   */
  private saveTokens(tokens: any) {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
    this.tokens = tokens;
  }

  /**
   * Refresh access token if expired
   */
  private async refreshTokensIfNeeded() {
    if (!this.tokens) throw new Error("❌ Wix tokens not available.");
    if (Date.now() < this.tokens.expiresAt - 60000) return; // Still valid

    console.log("🔄 Refreshing Wix Access Token...");
    const response = await axios.post(
      "https://www.wix.com/oauth/access",
      {
        grant_type: "refresh_token",
        refresh_token: this.tokens.refreshToken,
        client_id: process.env.WIX_CLIENT_ID,
        client_secret: process.env.WIX_CLIENT_SECRET,
      },
      { headers: { "Content-Type": "application/json" } },
    );

    const { access_token, refresh_token, expires_in } = response.data;

    this.saveTokens({
      accessToken: access_token,
      refreshToken: refresh_token || this.tokens.refreshToken,
      expiresAt: Date.now() + expires_in * 1000,
    });
  }

  /**
   * Generic GET request to Wix API via proxy
   */
  async get(path: string, params: Record<string, any> = {}) {
    await this.refreshTokensIfNeeded();
    try {
      const response = await axios.get(`/api/wix/wixProxy`, {
        params: { path, accessToken: this.tokens?.accessToken, ...params },
      });
      return response.data;
    } catch (error: any) {
      this.handleError("GET", path, error);
    }
  }

  /**
   * Generic POST request to Wix API via proxy
   */
  async post(path: string, data: any = {}, params: Record<string, any> = {}) {
    await this.refreshTokensIfNeeded();
    try {
      const response = await axios.post(`/api/wix/wixProxy`, data, {
        params: { path, accessToken: this.tokens?.accessToken, ...params },
      });
      return response.data;
    } catch (error: any) {
      this.handleError("POST", path, error);
    }
  }

  /**
   * Shortcut for querying Wix data collections
   */
  async queryData(query: WixQueryData = {}) {
    return this.post(`/v2/data/items/query`, query);
  }

  /**
   * Retrieve a specific data item by ID
   */
  async getItem(collectionId: string, itemId: string) {
    return this.get(`/v2/data/collections/${collectionId}/items/${itemId}`);
  }

  /**
   * Create a new data item
   */
  async createItem(collectionId: string, itemData: Record<string, any>) {
    return this.post(`/v2/data/collections/${collectionId}/items`, {
      item: itemData,
    });
  }

  /**
   * Update a data item
   */
  async updateItem(
    collectionId: string,
    itemId: string,
    itemData: Record<string, any>,
  ) {
    return this.post(
      `/v2/data/collections/${collectionId}/items/${itemId}`,
      { item: itemData },
      { _method: "PATCH" },
    );
  }

  /**
   * Delete a data item
   */
  async deleteItem(collectionId: string, itemId: string) {
    return this.post(
      `/v2/data/collections/${collectionId}/items/${itemId}`,
      {},
      { _method: "DELETE" },
    );
  }

  /**
   * Centralized error handler
   */
  private handleError(method: string, path: string, error: any) {
    console.error(
      `❌ WixClient ${method} Error: ${path}`,
      error.response?.data || error.message,
    );
    throw new Error(error.response?.data?.error || error.message);
  }
}

const wixClient = new WixClient();
export default wixClient;
