import { useState, useEffect } from 'react';
import DiveJournalForm from "./DiveJournalForm";

export default function Sidebar({
  sessionName,
  sessionsList = [],
  showDiveJournalForm,
  diveLogs = [], // This will be populated from API instead of localStorage
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
  loadingConnections = false,
  // NEW PROPS:
  onDiveLogsUpdate, // Callback to parent when dive logs change
  refreshDiveLogs    // Function to refresh dive logs from API
}) {
  
  // 🔄 Load dive logs when component mounts or userId changes
  useEffect(() => {
    if (userId && refreshDiveLogs) {
      refreshDiveLogs();
    }
  }, [userId, showDiveJournalForm]); // Refresh when journal opens/closes

  // 🎯 Enhanced journal submit that uses your enterprise API
  const handleEnterpriseJournalSubmit = async (formData) => {
    try {
      setLoading(true);
      
      console.log('🔄 Submitting to enterprise API...');
      
      // ✅ Use your save-dive-log.ts API
      const response = await fetch('/api/analyze/save-dive-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Dive log saved:', result);

      // ✅ Refresh dive logs display
      if (refreshDiveLogs) {
        await refreshDiveLogs();
      }

      // ✅ Call original handler for any additional UI updates
      if (handleJournalSubmit) {
        handleJournalSubmit(formData);
      }

      // ✅ Show success message
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Dive log saved successfully! Auto-analysis started in background.`
        }]);
      }

    } catch (error) {
      console.error('❌ Enterprise submit failed:', error);
      
      // ✅ Show error message
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant', 
          content: `❌ Failed to save dive log: ${error.message}`
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

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
                <li key={s.id || i} className="flex justify-between items-center">
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
            <p className="text-sm italic text-gray-500">No sessions available</p>
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
            {showDiveJournalForm ? "📕 Close Dive Journal" : "📘 Open Dive Journal"}
          </button>

          {showDiveJournalForm ? (
            <div className="mt-4">
              <DiveJournalForm
                onSubmit={handleEnterpriseJournalSubmit} // ✅ Use enterprise submit
                existingEntry={editLogIndex !== null ? diveLogs[editLogIndex] : null}
                userId={userId}
                setLoading={setLoading}
                setMessages={setMessages}
                darkMode={darkMode}
              />
            </div>
          ) : (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">📒 Dive Logs ({diveLogs.length})</h3>
              {diveLogs.length > 0 ? (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {diveLogs.slice(0, 10).map((log, i) => (
                    <li
                      key={log.id || i}
                      className={`border p-2 rounded text-sm ${
                        darkMode ? "bg-gray-800 text-white border-gray-600" : "bg-white text-black border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <strong className="text-xs">{new Date(log.date || log.timestamp).toLocaleDateString()}</strong>
                        <span className={`text-xs px-2 py-1 rounded ${
                          darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {log.reachedDepth || log.targetDepth}m
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        {log.discipline || log.disciplineType} • {log.location || 'Unknown location'}
                      </div>
                      
                      {/* ✅ Show sync status */}
                      {log.syncedToWix && (
                        <div className="text-xs text-green-500 mb-1">✅ Synced to cloud</div>
                      )}
                      
                      <div className="flex justify-end space-x-2 mt-1">
                        <button
                          onClick={() => handleEdit(i)}
                          className="text-blue-500 text-xs hover:underline"
                        >
                          🖊️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(i)}
                          className="text-red-500 text-xs hover:underline"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm italic text-gray-500">No dive logs yet. Add your first dive above!</p>
              )}
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
          {loadingConnections ? (
            <span className="text-sm italic text-gray-500">Checking connections...</span>
          ) : (
            <>
              {connectionStatus.pinecone?.includes("✅") && (
                <span title="Data Connected">🌲</span>
              )}
              {connectionStatus.openai?.includes("✅") && (
                <span title="AI Connected">🤖</span>
              )}
              {connectionStatus.wix?.includes("✅") && (
                <span title="Site Data Connected">🌀</span>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
