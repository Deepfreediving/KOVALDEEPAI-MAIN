import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";

interface WixAuthState {
  loading: boolean;
  authenticated: boolean;
  refreshed?: boolean;
  error?: string;
}

export function useWixAuthStatus(autoRedirect = true): WixAuthState {
  const [state, setState] = useState<WixAuthState>({
    loading: true,
    authenticated: false,
  });
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function checkStatus() {
      try {
        const res = await axios.get("/api/wix/oauth/status");
        if (mounted) {
          setState({
            loading: false,
            authenticated: res.data.authenticated,
            refreshed: res.data.refreshed,
          });

          if (autoRedirect && !res.data.authenticated) {
            console.log("⚠️ No valid Wix session, redirecting to OAuth...");
            router.push("/api/wix/oauth/start");
          }
        }
      } catch (err: any) {
        console.error("❌ Failed to check Wix auth status:", err.message);
        if (mounted) {
          setState({
            loading: false,
            authenticated: false,
            error: err.response?.data?.message || "Failed to check authentication",
          });

          if (autoRedirect) {
            router.push("/api/wix/oauth/start");
          }
        }
      }
    }

    checkStatus();

    return () => {
      mounted = false;
    };
  }, [autoRedirect, router]);

  return state;
}
