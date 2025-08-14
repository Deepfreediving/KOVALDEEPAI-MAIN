import { useState, useEffect } from "react";

export function useLocalStorage() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("kovalDarkMode") === "true";
    } catch {
      return false;
    }
  });

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState({});
  const [sessionsList, setSessionsList] = useState([]);

  const safeParse = (key, fallback) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const saveToStorage = (key, value) => {
    try {
      localStorage.setItem(
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      );
    } catch (error) {
      console.warn(`⚠️ Failed to save ${key}:`, error);
    }
  };

  // Initialize from localStorage
  useEffect(() => {
    try {
      setSessionsList(safeParse("kovalSessionsList", []));
      setUserId(localStorage.getItem("kovalUser") || "");
      setProfile(safeParse("kovalProfile", {}));
    } catch (error) {
      console.warn("⚠️ Failed to load from localStorage:", error);
    }
  }, []);

  // Sync dark mode
  useEffect(() => {
    try {
      document.documentElement.classList.toggle("dark", darkMode);
      localStorage.setItem("kovalDarkMode", darkMode);
    } catch (error) {
      console.warn("⚠️ Failed to save dark mode:", error);
    }
  }, [darkMode]);

  return {
    darkMode,
    setDarkMode,
    userId,
    setUserId,
    profile,
    setProfile,
    sessionsList,
    setSessionsList,
    saveToStorage,
    safeParse,
  };
}
