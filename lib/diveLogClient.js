export async function fetchDiveLogs(userId) {
  try {
    const res = await fetch(`/api/get-dive-logs?userId=${userId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch dive logs');

    // Cache to localStorage
    localStorage.setItem(`diveLogs-${userId}`, JSON.stringify(data.logs));
    return data.logs;
  } catch (err) {
    console.error('❌ fetchDiveLogs error:', err);
    return [];
  }
}
