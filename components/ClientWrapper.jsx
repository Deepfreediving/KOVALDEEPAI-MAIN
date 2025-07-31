"use client";
import { useEffect, useState } from "react";

export default function ClientWrapper({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // ✅ Dark mode preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", prefersDark);

    // ✅ Handle external theme updates (e.g., Wix)
    const handleThemeChange = (event) => {
      if (event.data?.type === "THEME_CHANGE") {
        document.documentElement.classList.toggle("dark", !!event.data.data.dark);
      }
    };

    window.addEventListener("message", handleThemeChange);
    setIsLoaded(true);

    return () => window.removeEventListener("message", handleThemeChange);
  }, []);

  if (!isLoaded) return <div>Loading...</div>;

  return children;
}
