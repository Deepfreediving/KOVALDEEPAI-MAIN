import { useEffect } from "react";
import AIAnalyzeButton from "./AIAnalyzeButton";
import {
  formatDiveLogForDisplay,
} from "../utils/diveLogFormatter";

export default function Sidebar({
  sessionName,
  sessionsList = [],
  diveLogs = [],
  toggleDiveJournal,
  handleSelectSession,
  handleDeleteSession,
  handleSaveSession,
  startNewSession,
  // handleJournalSubmit, // Unused - backward compatibility
  // editLogIndex, // Unused
  handleEdit,
  handleDelete,
  userId,
  setLoading,
  setMessages,
  darkMode,
  // connectionStatus = { pinecone: "", wix: "", openai: "" }, // Unused
  // loadingConnections = false, // Unused
  // onDiveLogsUpdate, // Unused
  refreshDiveLogs,
}) {
  console.log(
    "🔧 SIDEBAR: Dive logs count:",
    diveLogs.length,
    "userId:",
    userId,
    "isAuthenticated:",
    userId && !userId.startsWith("guest-") && !userId.startsWith("session-") && !userId.startsWith("temp-")
  );

  // 🔄 Load dive logs when component mounts or userId changes - AUTHENTICATED ONLY
  useEffect(() => {
    if (userId && 
        !userId.startsWith("guest-") && 
        !userId.startsWith("session-") && 
        !userId.startsWith("temp-") && 
        refreshDiveLogs) {
      console.log("🔄 SIDEBAR: Triggering dive logs refresh for authenticated user:", userId);
      refreshDiveLogs();
    } else {
      console.log("🔄 SIDEBAR: Not refreshing dive logs - user not authenticated:", userId);
    }
  }, [userId, refreshDiveLogs]);

  // ✅ Wix Repeater Sync Functions - AUTHENTICATED ONLY
  const refreshWixRepeaterSync = async (userId) => {
    if (!userId || 
        userId.startsWith("guest-") || 
        userId.startsWith("session-") || 
        userId.startsWith("temp-")) {
      console.log("🚫 SIDEBAR: Skipping Wix sync for non-authenticated user:", userId);
      return;
    }

    try {
      console.log("🔄 Syncing with Wix repeater...");
      const response = await fetch(
        `/api/wix/dive-journal-repeater?userId=${userId}&limit=20`,
      );
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Wix repeater sync successful:", data.count, "entries");
        // Trigger refresh of local state
        if (refreshDiveLogs) {
          refreshDiveLogs();
        }
      }
    } catch (error) {
      console.error("❌ Wix repeater sync error:", error);
    }
  };

  const handleDeleteWithWixSync = async (log, index) => {
    try {
      setLoading?.(true);

      // ✅ Call local delete handler first
      if (handleDelete) {
        await handleDelete(index);
      }

      // ✅ Sync with Wix repeater
      if (log.id && userId) {
        console.log("🗑️ Syncing delete with Wix repeater...");
        // Note: The actual delete endpoint might need to be created in Wix backend
        // For now, we refresh to get the updated state
        await refreshWixRepeaterSync(userId);
      }

      console.log("✅ Dive log deleted and synced with Wix");
    } catch (error) {
      console.error("❌ Delete with Wix sync error:", error);
    } finally {
      setLoading?.(false);
    }
  };

  // 🚀 Legacy DiveJournalForm has been removed - all functionality moved to DiveJournalDisplay
  // The popup DiveJournalSidebarCard now handles all dive log operations

  return (
    <aside
      className={`w-[320px] h-screen border-r flex flex-col ${
        darkMode
          ? "bg-[#121212] text-white border-gray-700"
          : "bg-gray-100 text-black border-gray-200"
      }`}
    >
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Sessions */}
        <div>
          <h2 className="text-lg font-semibold mb-2">🗂️ Sessions</h2>
          <button
            onClick={startNewSession}
            className="text-blue-600 underline mb-3"
            aria-label="Start a new session"
          >
            ➕ New Session
          </button>
          {sessionsList.length > 0 ? (
            <ul className="space-y-2">
              {sessionsList.map((s, i) => (
                <li
                  key={s.id || i}
                  className="flex justify-between items-center"
                >
                  <button
                    className={`text-left flex-1 px-2 py-1 rounded ${
                      s.sessionName === sessionName
                        ? "bg-blue-100 dark:bg-blue-700"
                        : darkMode
                          ? "hover:bg-gray-800"
                          : "hover:bg-gray-200"
                    }`}
                    onClick={() => handleSelectSession(s.sessionName)}
                  >
                    {s.sessionName}
                  </button>
                  <button
                    onClick={() => handleDeleteSession(i)}
                    className="text-red-500 text-xs ml-2"
                    title="Delete session"
                  >
                    ❌
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-gray-500">
              No sessions available
            </p>
          )}
        </div>

        {/* Enhanced Dive Journal */}
        <div>
          <button
            onClick={toggleDiveJournal}
            className={`w-full px-3 py-2 rounded border font-medium ${
              darkMode
                ? "bg-blue-900 hover:bg-blue-800 text-white"
                : "bg-blue-50 hover:bg-blue-100 text-black"
            }`}
          >
            Open Dive Journal
          </button>

          {/* Dive Logs Summary - Improved for Many Logs */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                📒 Dive Logs ({diveLogs.length})
              </h3>
              {diveLogs.length > 5 && (
                <span className="text-xs text-gray-500">Showing 10 latest</span>
              )}
            </div>
            {userId && 
             !userId.startsWith("guest-") && 
             !userId.startsWith("session-") && 
             !userId.startsWith("temp-") ? (
              // Authenticated user - show dive logs
              diveLogs.length > 0 ? (
                <div className="space-y-2 max-h-[35rem] overflow-y-auto custom-scrollbar">
                  {diveLogs.slice(0, 10).map((log, i) => {
                    const formattedLog = formatDiveLogForDisplay(log);
                    return (
                      <li
                        key={log.id || i}
                        className={`border p-2 rounded-lg text-sm transition-all duration-200 hover:shadow-md ${
                          darkMode
                            ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-750"
                            : "bg-white text-black border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {/* ✅ Compact dive log display for better space usage */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start">
                            <div className="text-xs font-medium text-gray-500 min-w-0 flex-1">
                              {new Date(
                                log.date || log.timestamp,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                              {log.location && (
                                <span className="ml-2 text-gray-400">
                                  @ {log.location.slice(0, 12)}
                                  {log.location.length > 12 ? "..." : ""}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  darkMode
                                    ? "bg-blue-900 text-blue-200"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {log.reachedDepth || log.targetDepth}m
                              </span>
                              {log.discipline && (
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                    darkMode
                                      ? "bg-green-900 text-green-200"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {log.discipline.slice(0, 3)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ✅ Collapsible content to save space */}
                          <details className="group">
                            <summary
                              className={`cursor-pointer text-xs ${
                                darkMode
                                  ? "text-gray-300 hover:text-gray-100"
                                  : "text-gray-600 hover:text-gray-800"
                              } list-none`}
                            >
                              <span className="flex items-center justify-between">
                                <span>
                                  📝{" "}
                                  {log.notes
                                    ? log.notes.slice(0, 30) + "..."
                                    : "View details"}
                                </span>
                                <span className="group-open:rotate-90 transition-transform text-gray-400">
                                  ▶
                                </span>
                              </span>
                            </summary>
                            <div
                              className={`mt-2 text-xs whitespace-pre-line ${
                                darkMode ? "text-gray-300" : "text-gray-600"
                              } p-2 rounded bg-opacity-50 ${
                                darkMode ? "bg-gray-700" : "bg-gray-100"
                              }`}
                            >
                              {formattedLog}
                            </div>
                          </details>

                          {/* ✅ Compact action buttons */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-opacity-30 border-gray-300 dark:border-gray-600">
                            <AIAnalyzeButton
                              diveLog={log}
                              userId={userId}
                              onAnalysisComplete={(analysisPrompt) => {
                                // ✅ Send analysis request directly to chatbox
                                if (setMessages) {
                                  setMessages((prev) => [
                                    ...prev,
                                    {
                                      role: "user",
                                      content: analysisPrompt,
                                    },
                                  ]);
                                }
                              }}
                              darkMode={darkMode}
                              size="xs"
                            />

                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleEdit?.(i)}
                                className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                                  darkMode
                                    ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                }`}
                                title="Edit dive log"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteWithWixSync(log, i)}
                                className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                                  darkMode
                                    ? "text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                    : "text-red-500 hover:text-red-700 hover:bg-red-50"
                                }`}
                                title="Delete dive log"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm italic text-gray-500 mb-2">
                    No dive logs yet. Add your first dive above!
                  </p>
                  <p className="text-xs text-gray-400">
                    Each log will be saved to your DiveLogs database for AI
                    pattern analysis
                  </p>
                </div>
              )
            ) : (
              // Non-authenticated user - show authentication required message
              <div className="text-center py-4">
                <p className="text-sm italic text-gray-500 mb-2">
                  🔒 Please log into your Wix account to view dive logs
                </p>
                <p className="text-xs text-gray-400">
                  Authentication required to access your dive log history
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save Button */}
      <div className="p-4 border-t border-gray-300 dark:border-gray-700">
        <button
          onClick={handleSaveSession}
          className="w-full bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
        >
          💾 Save Session
        </button>
      </div>
    </aside>
  );
}
