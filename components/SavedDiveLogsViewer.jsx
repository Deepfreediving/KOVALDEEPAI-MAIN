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

  // ✅ Helper to get user identifier - AUTHENTICATED MEMBERS ONLY
  const getUserIdentifier = useCallback(() => {
    // ✅ ONLY ALLOW AUTHENTICATED WIX MEMBERS
    if (!userId || 
        userId.startsWith("guest-") || 
        userId.startsWith("session-") || 
        userId.startsWith("temp-") ||
        userId === "") {
      console.warn("⚠️ SavedDiveLogsViewer: No authenticated member found:", userId);
      return null;
    }
    
    // Use the authenticated member's userId directly
    return userId;
  }, [userId]);

  // ✅ V5.0: Load logs when component mounts or userId changes - AUTHENTICATED ONLY
  const loadSavedLogs = useCallback(() => {
    const userIdentifier = getUserIdentifier();
    if (typeof window !== "undefined" && userIdentifier) {
      // ✅ Use consistent storage key format
      const storageKey = `diveLogs_${userIdentifier}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setSavedLogs(saved.slice(-10)); // Show last 10 logs
      console.log(
        "📱 SavedDiveLogsViewer: Loaded",
        saved.length,
        "logs from",
        storageKey,
      );
    } else {
      console.log("📱 SavedDiveLogsViewer: No authenticated member, clearing logs");
      setSavedLogs([]);
    }
  }, [getUserIdentifier]);

  useEffect(() => {
    loadSavedLogs();
  }, [loadSavedLogs]); // Load when getUserIdentifier changes (which depends on userId)

  // ✅ NEW: Listen for storage changes to refresh when dive logs are saved
  useEffect(() => {
    const handleStorageChange = (e) => {
      const userIdentifier = getUserIdentifier();
      const storageKey = `diveLogs_${userIdentifier}`;
      
      // Check if the changed key is our dive logs storage key
      if (e.key === storageKey || e.key === null) {
        console.log("📱 SavedDiveLogsViewer: Storage change detected, refreshing...");
        loadSavedLogs();
      }
    };

    // Listen for storage events from other windows/tabs
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events from the same window
    const handleCustomStorageEvent = () => {
      console.log("📱 SavedDiveLogsViewer: Custom storage event detected, refreshing...");
      setTimeout(loadSavedLogs, 100); // Small delay to ensure storage is updated
    };
    
    window.addEventListener('localStorageUpdate', handleCustomStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdate', handleCustomStorageEvent);
    };
  }, [loadSavedLogs, getUserIdentifier]);

  const clearSavedLogs = () => {
    const userIdentifier = getUserIdentifier();
    if (!userIdentifier) {
      console.warn("⚠️ No authenticated user for clearing logs");
      return;
    }

    if (
      confirm(
        "Are you sure you want to clear all saved dive logs from local storage?",
      )
    ) {
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

  // ✅ Add analyze functionality - AUTHENTICATED MEMBERS ONLY
  const handleAnalyzeDiveLog = async (log) => {
    const userIdentifier = getUserIdentifier();
    if (!log || !userIdentifier) {
      console.warn("⚠️ Missing log or authenticated user for analysis");
      
      // Show authentication required message
      if (setMessages) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "❌ You must be logged into your Wix account to analyze dive logs. Please log in and try again.",
          },
        ]);
      }
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
          userId: userIdentifier, // Use authenticated user ID
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
        } else {
          console.warn("⚠️ Analysis response missing expected data:", result);
          if (setMessages) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `⚠️ Analysis completed but no insights were generated. Please try again.`,
              },
            ]);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Analysis failed with status ${response.status}`);
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

  // ✅ Add delete functionality - AUTHENTICATED MEMBERS ONLY
  const handleDeleteDiveLog = async (logToDelete) => {
    const userIdentifier = getUserIdentifier();
    if (!logToDelete || !logToDelete.id || !userIdentifier) {
      console.warn("⚠️ No log to delete or no authenticated user");
      
      if (!userIdentifier && setMessages) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "❌ You must be logged into your Wix account to delete dive logs. Please log in and try again.",
          },
        ]);
      }
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
      // Delete from API/Wix
      const response = await fetch("/api/analyze/delete-dive-log", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userIdentifier, // Use authenticated user ID
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
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Delete failed with status ${response.status}`);
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

  // ✅ Show authentication required message for non-authenticated users
  const userIdentifier = getUserIdentifier();
  if (!userIdentifier) {
    return (
      <div
        className={`mt-6 p-4 rounded-lg border ${
          darkMode
            ? "bg-gray-800 border-gray-600 text-white"
            : "bg-gray-50 border-gray-200 text-gray-900"
        }`}
      >
        <div className="text-center py-4">
          <h3 className="text-lg font-medium mb-2">🔒 Authentication Required</h3>
          <p className="text-sm text-gray-500 mb-2">
            Please log into your Wix account to view and manage your dive logs.
          </p>
        </div>
      </div>
    );
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
