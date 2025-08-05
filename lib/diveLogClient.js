export async function fetchDiveLogs(userId) {
  if (!userId) {
    console.error("❌ fetchDiveLogs: User ID is required.");
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const res = await fetch(
      `/api/analyze/get-dive-logs?userId=${encodeURIComponent(userId)}`,
      { signal: controller.signal }
    );
    const data = await res.json();

    if (!res.ok) {
      console.warn(`⚠️ fetchDiveLogs: API returned status ${res.status}`);
      throw new Error(data.error || "Failed to fetch dive logs.");
    }

    if (!Array.isArray(data.logs)) {
      throw new Error("Invalid response format: 'logs' should be an array.");
    }

    // ✅ Cache logs locally (only client-side)
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(`diveLogs-${userId}`, JSON.stringify(data.logs));
    }

    return data.logs;
  } catch (err) {
    if (err.name === "AbortError") {
      console.error("⏳ fetchDiveLogs request timed out.");
    } else {
      console.error("❌ fetchDiveLogs error:", err.message);
    }

    // ✅ Fallback to cached logs if available
    if (typeof window !== "undefined" && window.localStorage) {
      const cachedLogs = localStorage.getItem(`diveLogs-${userId}`);
      if (cachedLogs) {
        console.warn("⚠️ Using cached dive logs due to fetch error.");
        return JSON.parse(cachedLogs);
      }
    }

    return [];
  } finally {
    clearTimeout(timeout);
  }
}
