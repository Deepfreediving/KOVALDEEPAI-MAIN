// utils/getToken.js

/**
 * ✅ Simple token management for Wix integration
 */

const TOKEN_KEY = 'wixAppToken';

/**
 * ✅ Get token - simplified approach
 */
export const getToken = () => {
  // ✅ Server-side safety
  if (typeof window === "undefined") {
    return null;
  }

  try {
    // 1️⃣ Check for token in URL first (most reliable)
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    
    if (tokenFromUrl && tokenFromUrl.length > 10) {
      // ✅ Save valid token
      saveToken(tokenFromUrl);
      return tokenFromUrl;
    }

    // 2️⃣ Check saved token
    const savedToken = getSavedToken();
    if (savedToken && savedToken.length > 10) {
      return savedToken;
    }

    // 3️⃣ Check environment variable (for server-side)
    if (process.env.WIX_ACCESS_TOKEN) {
      return process.env.WIX_ACCESS_TOKEN;
    }

    return null;

  } catch (error) {
    console.warn('⚠️ Token error:', error);
    return null;
  }
};

/**
 * ✅ Save token safely
 */
function saveToken(token) {
  if (!token) return;
  
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  } catch (error) {
    // Silently fail - not critical for embed functionality
    console.debug('Token save failed:', error);
  }
}

/**
 * ✅ Get saved token safely
 */
function getSavedToken() {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  } catch (error) {
    console.debug('Token retrieval failed:', error);
    return null;
  }
}

/**
 * ✅ Clear token if needed
 */
export const clearToken = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.debug('Token clear failed:', error);
  }
};

/**
 * ✅ Check if we have any valid token
 */
export const hasValidToken = () => {
  const token = getToken();
  return token && token.length > 10;
};

/**
 * ✅ Get token for API requests (with Bearer prefix if needed)
 */
export const getAuthHeader = () => {
  const token = getToken();
  if (!token) return null;
  
  // ✅ Return appropriate header format
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

/**
 * ✅ Simple token validation
 */
export const isTokenValid = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  // ✅ Basic validation - just check it's not empty and reasonable length
  return token.trim().length > 10 && token.trim().length < 1000;
};

// ✅ Default export
export default getToken;
