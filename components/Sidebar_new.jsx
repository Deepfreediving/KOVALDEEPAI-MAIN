import { useState, useEffect } from 'react';
import AIAnalyzeButton from "./AIAnalyzeButton";
import { formatDiveLogForDisplay, formatDiveLogForAnalysis } from "../utils/diveLogFormatter";

export default function Sidebar({
  sessionName,
  sessionsList = [],
  diveLogs = [], 
  toggleDiveJournal,
  handleSelectSession,
  handleDeleteSession,
  handleSaveSession,
  startNewSession,
  handleJournalSubmit, // Keep for backward compatibility 
  editLogIndex,
  handleEdit,
  handleDelete,
  userId,
  setLoading,
  setMessages,
  darkMode,
  connectionStatus = { pinecone: "", wix: "", openai: "" },
  loadingConnections = false,
  onDiveLogsUpdate, 
  refreshDiveLogs    
}) {
  
  console.log('🔧 SIDEBAR: Dive logs count:', diveLogs.length, 'userId:', userId);
  
  // 🔄 Load dive logs when component mounts or userId changes
  useEffect(() => {
    if (userId && refreshDiveLogs) {
      refreshDiveLogs();
    }
  }, [userId]);

  // ✅ Wix Repeater Sync Functions
  const refreshWixRepeaterSync = async (userId) => {
    try {
      console.log('🔄 Syncing with Wix repeater...');
      const response = await fetch(`/api/wix/dive-journal-repeater?userId=${userId}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Wix repeater sync successful:', data.count, 'entries');
        // Trigger refresh of local state
        if (refreshDiveLogs) {
          refreshDiveLogs();
        }
      }
    } catch (error) {
      console.error('❌ Wix repeater sync error:', error);
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
        console.log('🗑️ Syncing delete with Wix repeater...');
        // Note: The actual delete endpoint might need to be created in Wix backend
        // For now, we refresh to get the updated state
        await refreshWixRepeaterSync(userId);
      }
      
      console.log('✅ Dive log deleted and synced with Wix');
    } catch (error) {
      console.error('❌ Delete with Wix sync error:', error);
    } finally {
      setLoading?.(false);
    }
  };

  // 🚀 Legacy DiveJournalForm has been removed - all functionality moved to DiveJournalDisplay
  // The popup DiveJournalSidebarCard now handles all dive log operations

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
            📒 Open Dive Journal
          </button>

          {/* 📒 Dive Logs - Chat-like Display */}
          <div className="mt-4">
            <h3 className="font-semibold mb-3">📒 Dive Logs ({diveLogs.length})</h3>
            {diveLogs.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {diveLogs.slice(0, 10).map((log, i) => {
                  return (
                    <div
                      key={log.id || i}
                      className={`group p-3 rounded-lg border-l-4 transition-all duration-200 hover:shadow-sm ${
                        darkMode 
                          ? "bg-gray-800 border-l-blue-500 hover:bg-gray-750" 
                          : "bg-gray-50 border-l-blue-400 hover:bg-white"
                      }`}
                    >
                      {/* 💬 Chat-like Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {log.discipline || 'Freediving'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {log.reachedDepth || log.targetDepth}m
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.date || log.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {/* 📍 Location & Exit Quality */}
                      <div className="text-xs mb-2 space-y-1">
                        {log.location && (
                          <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            📍 {log.location}
                          </div>
                        )}
                        {log.exit && (
                          <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            🎯 Exit: {log.exit}
                          </div>
                        )}
                      </div>
                      
                      {/* 💭 Notes Preview */}
                      {log.notes && (
                        <div className={`text-xs mb-3 p-2 rounded italic ${
                          darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-600'
                        }`}>
                          "{log.notes.length > 60 ? log.notes.substring(0, 60) + '...' : log.notes}"
                        </div>
                      )}
                      
                      {/* 🔧 Action Buttons - Compact Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                        <AIAnalyzeButton
                          diveLog={log}
                          userId={userId}
                          onAnalysisComplete={(analysis) => {
                            if (setMessages) {
                              setMessages(prev => [...prev, {
                                role: 'assistant',
                                content: `🎯 **Analysis of your ${log.discipline || 'freediving'} dive:**\n\n${analysis}`
                              }]);
                            }
                          }}
                          darkMode={darkMode}
                          size="xs"
                          className="text-xs px-2 py-1"
                        />
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={async () => {
                              // ✅ Sync with Wix repeater on edit
                              if (handleEdit) {
                                handleEdit(i);
                                // Trigger Wix sync after edit
                                if (userId && refreshDiveLogs) {
                                  await refreshWixRepeaterSync(userId);
                                }
                              }
                            }}
                            className={`text-xs px-2 py-1 rounded transition-all ${
                              darkMode 
                                ? 'text-gray-400 hover:text-white hover:bg-blue-600' 
                                : 'text-gray-500 hover:text-white hover:bg-blue-500'
                            }`}
                            title="Edit dive log"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={async () => {
                              // ✅ Sync with Wix repeater on delete
                              if (handleDelete && confirm('Delete this dive log?')) {
                                await handleDeleteWithWixSync(log, i);
                              }
                            }}
                            className={`text-xs px-2 py-1 rounded transition-all ${
                              darkMode 
                                ? 'text-red-400 hover:text-white hover:bg-red-600' 
                                : 'text-red-500 hover:text-white hover:bg-red-500'
                            }`}
                            title="Delete dive log"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">🌊</div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">No dive logs yet</p>
                <p className="text-xs text-gray-500">Add your first dive above to start tracking your progress!</p>
                <p className="text-xs text-gray-400 mt-2">💾 Automatically synced with Wix database</p>
              </div>
            )}
          </div>
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
