// ===== 🔐 hooks/useUserAuthentication.ts - Enhanced Authentication Hook =====
// Comprehensive authentication system for Wix integration

import { useEffect, useState } from "react";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isAuthenticated: boolean;
  userMemoryData?: any;
  source: "wix" | "local" | "guest";
}

interface AuthMessage {
  type: string;
  userData?: any;
  data?: any;
}

export function useUserAuthentication() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Check if running in Wix context (iframe)
      if (typeof window !== "undefined" && window.parent !== window) {
        console.log("🔍 Checking authentication in Wix context...");

        // Request user data from parent Wix site
        window.parent.postMessage({ type: "REQUEST_USER_DATA" }, "*");

        // Set up message listener with timeout
        const messagePromise = new Promise<AuthUser | null>((resolve) => {
          const handleMessage = (event: MessageEvent<AuthMessage>) => {
            // Security check - only accept from trusted origins
            const trustedOrigins = [
              "https://www.deepfreediving.com",
              "https://deepfreediving.com",
              "https://editor.wix.com",
            ];

            if (
              !trustedOrigins.some((origin) =>
                event.origin.includes(origin.replace("https://", "")),
              )
            ) {
              console.warn("⚠️ Message from untrusted origin:", event.origin);
              return;
            }

            // Comprehensive null check before accessing event.data.type
            if (
              !event.data ||
              typeof event.data !== "object" ||
              !event.data.type
            ) {
              console.warn("⚠️ Invalid event data structure");
              return;
            }

            if (
              event.data.type === "USER_DATA_RESPONSE" ||
              event.data.type === "USER_AUTH_DATA"
            ) {
              const userData = event.data.userData || event.data.data;

              if (
                userData &&
                userData.userId &&
                !userData.userId.startsWith("guest")
              ) {
                console.log("✅ Authenticated user from Wix:", userData.userId);

                const authUser: AuthUser = {
                  id: userData.userId,
                  email: userData.profile?.loginEmail || userData.email || "",
                  displayName:
                    userData.profile?.displayName ||
                    userData.displayName ||
                    "User",
                  isAuthenticated: true,
                  userMemoryData: userData,
                  source: "wix",
                };

                resolve(authUser);
              } else {
                console.log("ℹ️ Guest user or no user data from Wix");
                resolve(null);
              }

              window.removeEventListener("message", handleMessage);
            }
          };

          window.addEventListener("message", handleMessage);

          // Timeout after 3 seconds
          setTimeout(() => {
            window.removeEventListener("message", handleMessage);
            resolve(null);
          }, 3000);
        });

        const wixUser = await messagePromise;
        if (wixUser) {
          setUser(wixUser);
          setLoading(false);
          return;
        }
      }

      // 2. Check URL parameters (direct Wix embed)
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlUserId = urlParams.get("userId");
        const userName = urlParams.get("userName");

        if (urlUserId && !urlUserId.startsWith("guest")) {
          console.log("✅ Authenticated user from URL params:", urlUserId);

          // Fetch user memory data
          try {
            const memoryResponse = await fetch(
              `/api/auth/get-user-memory?userId=${urlUserId}`,
            );
            let userMemoryData = null;

            if (memoryResponse.ok) {
              const memoryResult = await memoryResponse.json();
              userMemoryData = memoryResult.data;
            }

            const authUser: AuthUser = {
              id: urlUserId,
              email: userMemoryData?.profile?.loginEmail || "",
              displayName:
                userName || userMemoryData?.profile?.displayName || "User",
              isAuthenticated: true,
              userMemoryData,
              source: "local",
            };

            setUser(authUser);
            setLoading(false);
            return;
          } catch (err) {
            console.warn("⚠️ Failed to fetch user memory for URL user:", err);
          }
        }
      }

      // 3. Check local authentication/session
      try {
        const response = await fetch("/api/auth/check-user");
        if (response.ok) {
          const authData = await response.json();

          if (authData.authenticated && authData.user) {
            console.log(
              "✅ Authenticated user from session:",
              authData.user.id,
            );

            const authUser: AuthUser = {
              id: authData.user.id,
              email: authData.user.email || "",
              displayName: authData.user.displayName || "User",
              isAuthenticated: true,
              userMemoryData: authData.user.userMemoryData,
              source: "local",
            };

            setUser(authUser);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("⚠️ Local authentication check failed:", err);
      }

      // 4. Fallback to guest user
      console.log("ℹ️ No authenticated user found, creating guest user");
      const guestId = `guest-${Date.now()}`;

      const guestUser: AuthUser = {
        id: guestId,
        email: "",
        displayName: "Guest",
        isAuthenticated: false,
        source: "guest",
      };

      setUser(guestUser);
    } catch (error: any) {
      console.error("❌ Authentication check failed:", error);
      setError(error.message);

      // Fallback to guest
      const guestUser: AuthUser = {
        id: `guest-${Date.now()}`,
        email: "",
        displayName: "Guest",
        isAuthenticated: false,
        source: "guest",
      };
      setUser(guestUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("kovalUser");

    // Notify parent window if in iframe
    if (typeof window !== "undefined" && window.parent !== window) {
      window.parent.postMessage({ type: "USER_LOGOUT" }, "*");
    }
  };

  const refreshUser = async () => {
    await checkAuthentication();
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: user?.isAuthenticated || false,
    checkAuthentication,
    logout,
    refreshUser,
  };
}

export default useUserAuthentication;
