// _app.js
import "../styles/globals.css";
import { useEffect, useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary";

function MyApp({ Component, pageProps }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // ✅ 1. Initial theme detection from Wix or browser
    const initialTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", initialTheme);

    // ✅ 2. Listen for theme updates from Wix bot-widget
    const handleThemeChange = (event) => {
      if (event.data?.type === "THEME_CHANGE") {
        document.documentElement.classList.toggle("dark", !!event.data.data.dark);
      }
    };

    window.addEventListener("message", handleThemeChange);

    setIsLoaded(true);

    return () => {
      window.removeEventListener("message", handleThemeChange);
    };
  }, []);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

export default MyApp;
