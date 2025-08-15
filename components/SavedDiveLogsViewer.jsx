import { useState, useEffect, useCallback } from "react";

export default function SavedDiveLogsViewer({
  darkMode,
  userId, // Still using userId for component prop (backwards compatibility)
  setMessages,
  onEditDiveLog, // Callback to open popup journal for editing
  onRefreshDiveLogs, // Callback to refresh dive logs in parent
}) {
  const [savedLogs, setSavedLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // ✅ Helper to get user identifier (supports both old userId and new nickname pattern)
  const getUserIdentifier = useCallback(() => {
    // If userId looks like a nickname (no guest- prefix), use it directly
    if (userId && !userId.startsWith('guest-')) {
      return userId;
    }
    // Otherwise extract from localStorage if available
    if (typeof window !== "undefined") {
      const profile = JSON.parse(localStorage.getItem("kovalProfile") || "{}");
      if (profile.nickname) return profile.nickname;
      if (profile.firstName) return profile.firstName;
    }
    // Fallback to userId for guests
    return userId || 'Guest';
  }, [userId]);

  // ✅ V5.0: Load logs when component mounts or userId changes
  const loadSavedLogs = useCallback(() => {
    if (typeof window !== "undefined" && userId) {
      // ✅ Use consistent storage key format
      const userIdentifier = getUserIdentifier();
      const storageKey = `diveLogs_${userIdentifier}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setSavedLogs(saved.slice(-10)); // Show last 10 logs
      console.log(
        "📱 SavedDiveLogsViewer: Loaded",
        saved.length,
        "logs from",
        storageKey,
      );
    }
  }, [userId, getUserIdentifier]);

  useEffect(() => {
    if (userId) {
      loadSavedLogs();
    }
  }, [userId, loadSavedLogs]); // Load when userId changes

  const clearSavedLogs = () => {
    if (
      confirm(
        "Are you sure you want to clear all saved dive logs from local storage?",
      )
    ) {
      const userIdentifier = getUserIdentifier();
      const storageKey = `diveLogs_${userIdentifier}`;
      localStorage.removeItem(storageKey);
      setSavedLogs([]);
      // Notify parent to refresh
      if (onRefreshDiveLogs) {
        onRefreshDiveLogs();
      }
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // ✅ Add analyze functionality
  const handleAnalyzeDiveLog = async (log) => {
    const userIdentifier = getUserIdentifier();
    if (!log || !userIdentifier) {
      console.warn("⚠️ Missing log or user identifier for analysis");
      return;
    }

    try {
      console.log("🔍 Analyzing dive log:", log.id);

      // Show analyzing message in chat
      if (setMessages) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `🔄 Analyzing your ${log.discipline || "freediving"} dive to ${log.reachedDepth || log.targetDepth}m at ${log.location || "location"}...`,
          },
        ]);
      }

      const response = await fetch("/api/analyze/single-dive-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: userIdentifier, // ✅ Use nickname instead of userId
          diveLogData: log,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.analysis) {
          // Post analysis to chat
          if (setMessages) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `📊 **Dive Analysis Complete** \n\n${result.analysis}`,
              },
            ]);
          }
        }
      }
    } catch (error) {
      console.error("❌ Analysis error:", error);
      if (setMessages) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `❌ Failed to analyze dive log: ${error.message}`,
          },
        ]);
      }
    }
  };

  // ✅ Add delete functionality
  const handleDeleteDiveLog = async (logToDelete) => {
    if (!logToDelete || !logToDelete.id) {
      console.warn("⚠️ No log to delete");
      return;
    }

    if (
      !confirm(
        `Delete dive log from ${logToDelete.date} at ${logToDelete.location || "unknown location"}?`,
      )
    ) {
      return;
    }

    try {
      const userIdentifier = getUserIdentifier();
      
      // Delete from API/Wix
      const response = await fetch("/api/analyze/delete-dive-log", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: userIdentifier, // ✅ Use nickname instead of userId
          logId: logToDelete.id,
          source: "saved-dive-logs-viewer",
        }),
      });

      if (response.ok) {
        // Remove from local state
        const updatedLogs = savedLogs.filter(
          (log) => log.id !== logToDelete.id,
        );
        setSavedLogs(updatedLogs);

        // Update localStorage with correct key
        const storageKey = `diveLogs_${userIdentifier}`;
        const allLogs = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const filteredLogs = allLogs.filter((log) => log.id !== logToDelete.id);
        localStorage.setItem(storageKey, JSON.stringify(filteredLogs));

        // Notify parent
        if (onRefreshDiveLogs) {
          onRefreshDiveLogs();
        }

        // Show success message
        if (setMessages) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `🗑️ **Dive Log Deleted** \n\nRemoved dive from ${logToDelete.date} at ${logToDelete.location || "unknown location"}.`,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("❌ Delete error:", error);
      if (setMessages) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `❌ Failed to delete dive log: ${error.message}`,
          },
        ]);
      }
    }
  };

  // ✅ Add edit functionality
  const handleEditDiveLog = (log) => {
    if (onEditDiveLog) {
      console.log("✏️ SavedDiveLogsViewer: Triggering edit for log:", log.id);
      onEditDiveLog(log);
    }
  };

  if (savedLogs.length === 0) {
    return null;
  }

  return (
    <div
      className={`mt-6 p-4 rounded-lg border ${
        darkMode
          ? "bg-gray-800 border-gray-600 text-white"
          : "bg-gray-50 border-gray-200 text-gray-900"
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium">
          💾 Saved Dive Logs ({savedLogs.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`px-3 py-1 text-sm rounded ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {showLogs ? "Hide" : "Show"}
          </button>
          <button
            onClick={clearSavedLogs}
            className={`px-3 py-1 text-sm rounded ${
              darkMode
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            Clear All
          </button>
        </div>
      </div>

      {showLogs && (
        <div className="space-y-2 max-h-[42rem] overflow-y-auto custom-scrollbar">
          {savedLogs.map((log, index) => (
            <div
              key={log.id || index}
              className={`p-3 rounded border ${
                darkMode
                  ? "bg-gray-700 border-gray-600"
                  : "bg-white border-gray-300"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium">
                    {formatDate(log.date)} - {log.discipline || "Unknown"}
                  </div>
                  <div className="text-sm opacity-75">
                    📍 {log.location || "Unknown location"}
                  </div>
                  <div className="text-sm opacity-75">
                    🎯 Target: {log.targetDepth}m | Reached: {log.reachedDepth}m
                  </div>
                  {log.notes && (
                    <div className="text-sm opacity-75 mt-1">
                      📝 {log.notes.slice(0, 100)}...
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      log.syncedToWix
                        ? "bg-green-500 text-white"
                        : "bg-yellow-500 text-black"
                    }`}
                  >
                    {log.syncedToWix ? "✅ Synced" : "⏳ Local"}
                  </span>
                  <span className="text-xs opacity-50">
                    {formatDate(log.savedAt)}
                  </span>

                  {/* Action Buttons */}
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={() => handleAnalyzeDiveLog(log)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        darkMode
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                      title="Analyze with AI"
                    >
                      🤖 Analyze
                    </button>
                    <button
                      onClick={() => handleEditDiveLog(log)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        darkMode
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-green-500 hover:bg-green-600 text-white"
                      }`}
                      title="Edit dive log"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteDiveLog(log)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        darkMode
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-red-500 hover:bg-red-600 text-white"
                      }`}
                      title="Delete dive log"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-sm opacity-75">
        💡 Tip: Dive logs are saved locally first, then synced to Wix backend
      </div>
    </div>
  );
}
