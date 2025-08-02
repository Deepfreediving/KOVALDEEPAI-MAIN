import { useRef } from "react";
import DiveJournalForm from "./DiveJournalForm";

export default function Sidebar({
  sessionName,
  sessionsList,
  showDiveJournalForm,
  diveLogs,
  toggleDiveJournal,
  handleSelectSession,
  handleDeleteSession,
  handleSaveSession,
  startNewSession,
  handleJournalSubmit,
  editLogIndex,
  handleEdit,
  handleDelete,
  userId,
  setLoading,
  setMessages,
  darkMode,
  connectionStatus = { pinecone: "", wix: "", openai: "" },
  loadingConnections = false
}) {
  return (
    <aside
      className={`w-[320px] h-screen border-r flex flex-col ${
        darkMode ? "bg-[#121212] text-white border-gray-700" : "bg-gray-100 text-black border-gray-200"
      }`}
    >
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Sessions */}
        <div>
          <h2 className="text-lg font-semibold mb-2">🗂️ Sessions</h2>
          <button onClick={startNewSession} className="text-blue-600 underline mb-3">
            ➕ New Session
          </button>
          <ul className="space-y-2">
            {sessionsList.map((s, i) => (
              <li key={i} className="flex justify-between items-center">
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
        </div>

        {/* Dive Journal */}
        <div>
          <button
            onClick={toggleDiveJournal}
            className={`w-full px-3 py-2 rounded border font-medium ${
              darkMode
                ? "bg-blue-900 hover:bg-blue-800 text-white"
                : "bg-blue-50 hover:bg-blue-100 text-black"
            }`}
          >
            {showDiveJournalForm ? "📕 Close Dive Journal" : "📘 Open Dive Journal"}
          </button>

          {showDiveJournalForm ? (
            <div className="mt-4">
              <DiveJournalForm
                onSubmit={handleJournalSubmit}
                existingEntry={editLogIndex !== null ? diveLogs[editLogIndex] : null}
                userId={userId}
                setLoading={setLoading}
                setMessages={setMessages}
                darkMode={darkMode}
              />
            </div>
          ) : (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">📒 Dive Logs</h3>
              <ul className="space-y-2">
                {diveLogs.map((log, i) => (
                  <li
                    key={i}
                    className={`border p-2 rounded text-sm ${
                      darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
                    }`}
                  >
                    <strong>{log.date}</strong> – {log.disciplineType}: {log.targetDepth}m
                    <div className="flex justify-end space-x-2 mt-1">
                      <button
                        onClick={() => handleEdit(i)}
                        className="text-blue-500 text-xs"
                      >
                        🖊️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(i)}
                        className="text-red-500 text-xs"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Save Button */}
      <div className="p-4 border-t border-gray-300 dark:border-gray-700 space-y-3">
        <button
          onClick={handleSaveSession}
          className="w-full bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
        >
          💾 Save Session
        </button>

        {/* ✅ Connection Status Dock */}
        <div className="flex space-x-4 text-xl justify-center bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {!loadingConnections && connectionStatus.pinecone?.includes("✅") && (
            <span title="Data Connected">🌲</span>
          )}
          {!loadingConnections && connectionStatus.openai?.includes("✅") && (
            <span title="AI Connected">🤖</span>
          )}
          {!loadingConnections && connectionStatus.wix?.includes("✅") && (
            <span title="Site Data Connected">🌀</span>
          )}
        </div>
      </div>
    </aside>
  );
}
