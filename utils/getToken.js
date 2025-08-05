// utils/getToken.js
export const getToken = () => {
  // 1️⃣ Check if token is in URL
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    // 2️⃣ Save token in localStorage for persistence
    if (tokenFromUrl) {
      localStorage.setItem("wixAppToken", tokenFromUrl);
      return tokenFromUrl;
    }

    // 3️⃣ If no token in URL, fallback to saved one
    return localStorage.getItem("wixAppToken");
  }
  return null;
};
