"use client";
import { useEffect, useState } from "react";

export default function ClientWrapper({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Detect initial theme preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.classList.toggle("dark", prefersDark);

    // Handle incoming theme change messages safely
    const handleThemeChange = (event) => {
      if (
        event?.data &&
        typeof event.data === "object" &&
        event.data.type === "THEME_CHANGE"
      ) {
        document.documentElement.classList.toggle(
          "dark",
          Boolean(event.data.data.dark),
        );
      }
    };

    window.addEventListener("message", handleThemeChange);
    setIsLoaded(true);

    return () => {
      window.removeEventListener("message", handleThemeChange);
    };
  }, []);

  return isLoaded ? (
    children
  ) : (
    <div className="p-4 text-center">Loading...</div>
  );
}
