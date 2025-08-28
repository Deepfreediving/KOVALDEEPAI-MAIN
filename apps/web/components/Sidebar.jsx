import { useEffect } from "react";
import Image from "next/image";
import UserProfile from "@/components/UserProfile";

export default function Sidebar({
  sessionName,
  sessionsList = [],
  diveLogs = [],
  toggleDiveJournal,
  handleSelectSession,
  handleDeleteSession,
  handleSaveSession,
  startNewSession,
  userId,
  darkMode,
  refreshDiveLogs,
}) {
  useEffect(() => {
    if (userId && refreshDiveLogs) {
      refreshDiveLogs();
    }
  }, [userId, refreshDiveLogs]);

  return (
    <aside
      className={`w-[260px] h-screen flex flex-col ${
        darkMode
          ? "bg-gray-900 text-white"
          : "bg-gray-50 text-black"
      }`}
    >
      {/* Koval AI Logo at top of sidebar */}
      <div className="p-2 pt-1 flex justify-center">
        <Image 
          src="/deeplogo.jpg" 
          alt="Koval AI Logo" 
          width={192}
          height={120}
          className="h-30 w-48"
          unoptimized
        />
      </div>
      
      {/* User Profile */}
      <div className={`px-3 pb-3 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
        <UserProfile />
      </div>
      
      <div className={`p-3 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
        <button
          onClick={startNewSession}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            darkMode
              ? "border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white"
              : "border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800"
          }`}
        >
          ✨ New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sessionsList.length > 0 && (
          <div className="mb-4">
            <div className={`text-xs font-medium px-2 py-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Recent
            </div>
            {sessionsList.slice(0, 10).map((s, i) => (
              <div key={s.id || i} className="flex items-center group">
                <button
                  className={`flex-1 text-left px-2 py-2 rounded-lg text-sm transition-colors ${
                    s.sessionName === sessionName
                      ? darkMode ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-900"
                      : darkMode
                        ? "hover:bg-gray-800 text-gray-300"
                        : "hover:bg-gray-100 text-gray-700"
                  }`}
                  onClick={() => handleSelectSession(s.sessionName)}
                >
                  <div className="truncate">
                    {s.sessionName.replace('Session – ', '')}
                  </div>
                </button>
                <button
                  onClick={() => handleDeleteSession(i)}
                  className={`opacity-0 group-hover:opacity-100 p-1 rounded text-xs transition-opacity ${
                    darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-500"
                  }`}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4">
          <button
            onClick={toggleDiveJournal}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
              darkMode
                ? "hover:bg-gray-800 text-gray-300"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            📒 Dive Journal
          </button>

          {diveLogs.length > 0 && (
            <div className="mt-2 px-2">
              <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-2`}>
                {diveLogs.length} dive logs
              </div>
              {diveLogs.slice(0, 5).map((log, i) => (
                <div
                  key={log.id || i}
                  className={`group p-2 rounded text-xs mb-1 transition-colors ${
                    darkMode
                      ? "bg-gray-800 hover:bg-gray-750 text-gray-300"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {new Date(log.date || log.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      {log.location && (
                        <div className="truncate text-xs opacity-75">
                          {log.location}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className={`text-xs px-1.5 py-0.5 rounded ${
                        darkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"
                      }`}>
                        {log.reached_depth || log.reachedDepth || log.target_depth || log.targetDepth || 0}m
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`p-3 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
        <button
          onClick={handleSaveSession}
          className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
            darkMode
              ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
          💾 Save Session
        </button>
      </div>
    </aside>
  );
}
