import "../styles/globals.css";
import { useEffect, useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import AppLoader from "../components/AppLoader";

function MyApp({ Component, pageProps }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
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
