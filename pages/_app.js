import "../styles/globals.css";
import { useEffect, useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary";

function MyApp({ Component, pageProps }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const storedDark = localStorage.getItem("darkMode") === "true";
    setDarkMode(storedDark);
    document.documentElement.classList.toggle("dark", storedDark); // ✅ Apply dark class to <html>
    setIsLoaded(true);
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
