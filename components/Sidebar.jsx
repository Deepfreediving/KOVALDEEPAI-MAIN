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
             Open Dive Journal
          </button>

          {/* Dive Logs Summary */}
          <div className="mt-4">
            <h3 className="font-semibold mb-3">📒 Dive Logs ({diveLogs.length})</h3>
            {diveLogs.length > 0 ? (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {diveLogs.slice(0, 10).map((log, i) => {
                  const formattedLog = formatDiveLogForDisplay(log);
                  return (
                    <li
                      key={log.id || i}
                      className={`border p-3 rounded text-sm transition-colors ${
                        darkMode ? "bg-gray-800 text-white border-gray-600" : "bg-white text-black border-gray-200"
                      }`}
                    >
                        {/* ✅ Structured dive log display */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="text-xs font-medium text-gray-500">
                              {new Date(log.date || log.timestamp).toLocaleDateString()}
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {log.reachedDepth || log.targetDepth}m
                              </span>
                            </div>
                          </div>
                          
                          {/* ✅ Formatted dive log content */}
                          <div className={`text-xs whitespace-pre-line ${
                            darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {formattedLog}
                          </div>
                          
                          {/* ✅ Action buttons */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                            <AIAnalyzeButton
                              diveLog={log}
                              userId={userId}
                              onAnalysisComplete={(analysisPrompt) => {
                                // ✅ Send analysis request directly to chatbox
                                if (setMessages) {
                                  setMessages(prev => [...prev, {
                                    role: 'user',
                                    content: analysisPrompt
                                  }]);
                                }
                              }}
                              darkMode={darkMode}
                              size="sm"
                            />
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit?.(i)}
                                className={`text-xs px-2 py-1 rounded transition-colors ${
                                  darkMode 
                                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                                title="Edit dive log"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDeleteWithWixSync(log, i)}
                                className={`text-xs px-2 py-1 rounded transition-colors ${
                                  darkMode 
                                    ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                                    : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                }`}
                                title="Delete dive log"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm italic text-gray-500 mb-2">No dive logs yet. Add your first dive above!</p>
                  <p className="text-xs text-gray-400">Each log will be saved to your DiveLogs database for AI pattern analysis</p>
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
