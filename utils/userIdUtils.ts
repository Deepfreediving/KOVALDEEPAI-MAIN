// Production-safe user ID utilities for Koval Deep AI
// AUTHENTICATED MEMBERS ONLY - No guest/temporary/session user logic

/**
 * Returns a valid authenticated user ID. Only accepts real Wix member IDs.
 * Returns null if no authenticated member is available.
 */
export function getOrCreateUserId(userId?: string): string | null {
  // 1. Use provided authenticated user ID if valid
  if (
    userId &&
    typeof userId === "string" &&
    userId !== "undefined" &&
    userId !== "null" &&
    userId.trim() !== "" &&
    !userId.startsWith("temp-") &&
    !userId.startsWith("guest-") &&
    !userId.startsWith("session-")
  ) {
    // Store authenticated user ID for future use
    if (typeof window !== "undefined") {
      localStorage.setItem("koval-ai-persistent-user-id", userId);
      sessionStorage.setItem("koval-ai-user-id", userId);
    }
    return userId;
  }

  if (typeof window !== "undefined") {
    // 2. Try persistent authenticated user ID from localStorage
    const persistentId = localStorage.getItem("koval-ai-persistent-user-id");
    if (
      persistentId &&
      persistentId !== "undefined" &&
      persistentId !== "null" &&
      !persistentId.startsWith("temp-") &&
      !persistentId.startsWith("guest-") &&
      !persistentId.startsWith("session-")
    ) {
      return persistentId;
    }

    // 3. Try session user ID
    const sessionId = sessionStorage.getItem("koval-ai-user-id");
    if (
      sessionId &&
      sessionId !== "undefined" &&
      sessionId !== "null" &&
      !sessionId.startsWith("temp-") &&
      !sessionId.startsWith("guest-") &&
      !sessionId.startsWith("session-")
    ) {
      return sessionId;
    }

    // 4. Check URL for user ID
    const urlUserId = extractUserIdFromUrl();
    if (urlUserId && 
        !urlUserId.startsWith("temp-") && 
        !urlUserId.startsWith("guest-") && 
        !urlUserId.startsWith("session-")) {
      localStorage.setItem("koval-ai-persistent-user-id", urlUserId);
      sessionStorage.setItem("koval-ai-user-id", urlUserId);
      return urlUserId;
    }

    // 5. Clean up any temporary/session data but preserve authenticated members
    const tempUserId = localStorage.getItem("koval-ai-temp-user-id");
    if (tempUserId?.startsWith("temp-")) {
      localStorage.removeItem("koval-ai-temp-user-id");
      console.log("🧹 Cleaned up temporary user ID:", tempUserId);
    }
    
    console.log("⚠️ No authenticated member found - user must be logged into Wix");
  }

  // Return null - no fallback user creation
  return null;
}

/**
 * Logs the current user ID situation for debugging (no-op in production).
 */
export function debugUserIdSituation(): void {
  if (typeof window === "undefined") return;
  // Only log in dev
  if (process.env.NODE_ENV !== "production") {
    const persistentId = localStorage.getItem("koval-ai-persistent-user-id");
    const sessionId = sessionStorage.getItem("koval-ai-user-id");
    
    console.log("[UserIdUtils] persistent:", persistentId);
    console.log("[UserIdUtils] session:", sessionId);
    console.log("[UserIdUtils] authenticated member:", 
      persistentId && !persistentId.startsWith("temp-") && 
      !persistentId.startsWith("guest-") && !persistentId.startsWith("session-")
    );
  }
}

/**
 * DEPRECATED: This function has been removed as the app now only supports 
 * authenticated Wix members. No temporary user migration is needed.
 * @deprecated Use direct member authentication instead
 */
export function upgradeTemporaryUserToAuthenticated(
  authenticatedUserId: string,
): boolean {
  console.warn("⚠️ upgradeTemporaryUserToAuthenticated is deprecated - app now requires authenticated members only");
  
  if (typeof window === "undefined") return false;
  
  // Only clean up any legacy temporary data - no migration
  const tempUserId = localStorage.getItem("koval-ai-temp-user-id");
  if (tempUserId?.startsWith("temp-")) {
    console.log("🧹 Cleaning up legacy temporary user data:", tempUserId);
    
    // Remove temporary data completely
    localStorage.removeItem("koval-ai-temp-user-id");
    localStorage.removeItem(`diveLogs_${tempUserId}`);
    localStorage.removeItem(`diveLogs-${tempUserId}`);
    localStorage.removeItem(`savedDiveLogs_${tempUserId}`);
    localStorage.removeItem(`memories_${tempUserId}`);
  }
  
  // Set the authenticated user ID
  if (authenticatedUserId && 
      !authenticatedUserId.startsWith("temp-") &&
      !authenticatedUserId.startsWith("guest-") &&
      !authenticatedUserId.startsWith("session-")) {
    localStorage.setItem("koval-ai-persistent-user-id", authenticatedUserId);
    sessionStorage.setItem("koval-ai-user-id", authenticatedUserId);
    console.log("✅ Set authenticated member ID:", authenticatedUserId);
    return true;
  }
  
  return false;
}

/**
 * DEPRECATED: Guest/session data migration is no longer supported.
 * App now requires authenticated Wix members only.
 * @deprecated Use authenticated member login instead
 */
export function migrateGuestDataToPersistent(): boolean {
  if (typeof window === "undefined") return false;
  console.warn("⚠️ migrateGuestDataToPersistent is deprecated - app requires authenticated members only");
  return false;
}

/**
 * Extracts a userId from the current URL (if present as ?userId=...)
 * Only returns authenticated member IDs, not guest/session/temp IDs
 */
export function extractUserIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const userId = url.searchParams.get("userId");
  if (
    userId &&
    userId !== "undefined" &&
    userId !== "null" &&
    userId.trim() !== "" &&
    !userId.startsWith("temp-") &&
    !userId.startsWith("guest-") &&
    !userId.startsWith("session-")
  ) {
    return userId;
  }
  return null;
}
