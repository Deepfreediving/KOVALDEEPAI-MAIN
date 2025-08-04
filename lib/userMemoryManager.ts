import { createClient, OAuthStrategy, TokenRole } from "@wix/sdk";
import { items } from "@wix/data";

const ACCESS_TOKEN = process.env.WIX_ACCESS_TOKEN || "FAKE_ACCESS_TOKEN";
const REFRESH_TOKEN = process.env.WIX_REFRESH_TOKEN || "FAKE_REFRESH_TOKEN";

// ✅ Warn if tokens are missing
if (ACCESS_TOKEN.startsWith("FAKE") || REFRESH_TOKEN.startsWith("FAKE")) {
  console.warn("⚠️ WARNING: Using placeholder Wix tokens. Run OAuth flow to get real ones.");
}

const wixClient = createClient({
  modules: { items },
  auth: OAuthStrategy({
    clientId: process.env.WIX_CLIENT_ID || "",
    tokens: {
      accessToken: {
        value: ACCESS_TOKEN,
        expiresAt: Date.now() + 3600 * 1000,
      },
      refreshToken: {
        value: REFRESH_TOKEN,
        role: "OWNER" as TokenRole,
      },
    },
  }),
});

const COLLECTION_ID = "UserMemory";

/**
 * Fetch UserMemory document for a specific userId
 */
export async function fetchUserMemory(userId: string) {
  try {
    const query = await wixClient.items.query(COLLECTION_ID).eq("userId", userId).find();
    return query.items[0] || null;
  } catch (error: any) {
    console.warn("⚠️ fetchUserMemory failed (using local only):", error.message);
    return null;
  }
}

/**
 * Save or update a user's memory (last 10 logs preserved)
 */
export async function saveUserMemory(userId: string, newData: any) {
  try {
    const existing = await fetchUserMemory(userId);

    const updatedLogs = [
      ...(existing?.logs || []),
      ...(newData.logs || []),
    ].slice(-10);

    const updatedData = {
      ...existing,
      ...newData,
      logs: updatedLogs,
      userId,
      updatedAt: new Date().toISOString(),
    };

    if (existing && existing._id) {
      await wixClient.items.update(COLLECTION_ID, {
        _id: existing._id,
        ...updatedData,
      });
    } else {
      await wixClient.items.insert(COLLECTION_ID, updatedData);
    }

    return true;
  } catch (error: any) {
    console.warn("⚠️ saveUserMemory failed (using local only):", error.message);
    return false;
  }
}
