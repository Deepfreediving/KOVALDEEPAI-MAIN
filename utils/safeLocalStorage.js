/**
 * ✅ Safe localStorage utilities with SSR compatibility
 * Prevents "window is not defined" errors during server-side rendering
 */

export const safeGetItem = (key) => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`localStorage.getItem failed for key "${key}":`, error);
    return null;
  }
};

export const safeSetItem = (key, value) => {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`localStorage.setItem failed for key "${key}":`, error);
    return false;
  }
};

export const safeRemoveItem = (key) => {
  if (typeof window === "undefined") return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`localStorage.removeItem failed for key "${key}":`, error);
    return false;
  }
};

export const safeParseJSON = (str, defaultValue = null) => {
  try {
    return str ? JSON.parse(str) : defaultValue;
  } catch (error) {
    console.warn("JSON.parse failed:", error);
    return defaultValue;
  }
};

export const safeLocalStorageKeys = () => {
  if (typeof window === "undefined") return [];
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  } catch (error) {
    console.warn("Failed to get localStorage keys:", error);
    return [];
  }
};

export const isClient = () => typeof window !== "undefined";
