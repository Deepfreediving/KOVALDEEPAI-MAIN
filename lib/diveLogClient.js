export async function fetchDiveLogs(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required to fetch dive logs.");
    }

    const res = await fetch(`/api/analyze/get-dive-logs?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Failed to fetch dive logs (status: ${res.status})`);
    }

    if (!Array.isArray(data.logs)) {
      throw new Error("Invalid response format: 'logs' should be an array.");
    }

    // ✅ Store in localStorage only in the browser
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(`diveLogs-${userId}`, JSON.stringify(data.logs));
    }

    return data.logs;
  } catch (err) {
    console.error("❌ fetchDiveLogs error:", err);

    // ✅ Fallback to cached logs if available
    if (typeof window !== "undefined" && window.localStorage) {
      const cachedLogs = localStorage.getItem(`diveLogs-${userId}`);
      if (cachedLogs) {
        console.warn("⚠️ Using cached dive logs due to fetch error.");
        return JSON.parse(cachedLogs);
      }
    }

    return [];
  }
}
