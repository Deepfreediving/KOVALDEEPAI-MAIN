import "../styles/globals.css";
import { useEffect, useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import AppLoader from "../components/AppLoader";

function MyApp({ Component, pageProps }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // ✅ Capture token from URL and save it in localStorage
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token) {
        localStorage.setItem("wixAppToken", token);

        // ✅ Optionally clean URL after saving
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState({}, document.title, url.toString());
      }
    }

    // Wait for hydration before rendering
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <AppLoader /> {/* Simple loading screen */}
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

export default MyApp;
