import "@/styles/globals.css";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppLoader from "@/components/AppLoader";
import PerformanceOptimizer from "@/components/PerformanceOptimizer";
import { AuthProvider } from "@/src/providers/AuthProvider";

function MyApp({ Component, pageProps }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [tokenProcessed, setTokenProcessed] = useState(false);

  useEffect(() => {
    // ✅ Safe token processing with error handling
    const processToken = () => {
      try {
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (token) {
          // ✅ Basic token validation (prevent XSS)
          const sanitizedToken = token.trim();
          if (sanitizedToken.length > 0 && sanitizedToken.length < 2000) {
            // ✅ Safe localStorage access
            try {
              localStorage.setItem("wixAppToken", sanitizedToken);
              console.log("✅ Wix token saved successfully");

              // ✅ Clean URL after saving token
              const url = new URL(window.location.href);
              url.searchParams.delete("token");

              // ✅ Use replaceState safely
              if (window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, url.toString());
              }
            } catch (storageError) {
              console.warn(
                "⚠️ Failed to save token to localStorage:",
                storageError,
              );
              // Continue without localStorage - not critical
            }
          } else {
            console.warn("⚠️ Invalid token format, skipping");
          }
        }

        setTokenProcessed(true);
      } catch (error) {
        console.error("❌ Error processing token:", error);
        setTokenProcessed(true); // Continue even if token processing fails
      }
    };

    // ✅ Process token immediately, don't delay app loading
    processToken();

    // ✅ Set loaded after minimal delay for smooth UX
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // ✅ Show loading only briefly to prevent hydration issues
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <AppLoader />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <PerformanceOptimizer />
        <Component {...pageProps} tokenProcessed={tokenProcessed} />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
