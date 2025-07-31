import "../styles/globals.css";
import { useEffect, useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import AppLoader from "../components/AppLoader";

function MyApp({ Component, pageProps }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", prefersDark);

    const handleThemeChange = (event) => {
      if (event.data?.type === "THEME_CHANGE") {
        const isDark = !!event.data.data.dark;
        document.documentElement.classList.toggle("dark", isDark);
      }
    };

    window.addEventListener("message", handleThemeChange);
    setIsLoaded(true);

    return () => {
      window.removeEventListener("message", handleThemeChange);
    };
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 dark:text-gray-300">
        Loading...
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppLoader>
        <Component {...pageProps} />
      </AppLoader>
    </ErrorBoundary>
  );
}

export default MyApp;
