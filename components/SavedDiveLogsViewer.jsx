import { useState, useEffect } from 'react';
import AIAnalyzeButton from './AIAnalyzeButton';

export default function SavedDiveLogsViewer({ 
  darkMode, 
  userId, 
  setMessages, 
  setLoading,
  onEditLog,
  onDeleteLog 
}) {
  const [savedLogs, setSavedLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    loadSavedLogs();
  }, []);

  const loadSavedLogs = async () => {
    try {
      // Try to load from API first (DiveLogs collection)
      if (userId) {
        const response = await fetch(`/api/wix/dive-logs-bridge?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setSavedLogs(data.diveLogs || []);
          return;
        }
      }
      
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const saved = JSON.parse(localStorage.getItem('savedDiveLogs') || '[]');
        setSavedLogs(saved.slice(-10)); // Show last 10 logs
      }
    } catch (error) {
      console.error('Failed to load saved logs:', error);
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const saved = JSON.parse(localStorage.getItem('savedDiveLogs') || '[]');
        setSavedLogs(saved.slice(-10));
      }
    }
  };

  const clearSavedLogs = () => {
    if (confirm('Are you sure you want to clear all saved dive logs from local storage?')) {
      localStorage.removeItem('savedDiveLogs');
      setSavedLogs([]);
    }
  };

  const handleDeleteLog = async (index, log) => {
    if (!confirm('Are you sure you want to delete this dive log?')) return;
    
    try {
      // Delete from API if we have a log ID
      if (log._id || log.diveLogId) {
        const response = await fetch('/api/wix/query-wix-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            collection: 'DiveLogs',
            itemId: log._id || log.diveLogId
          })
        });
        
        if (response.ok) {
          console.log('✅ Deleted from DiveLogs collection');
        }
      }
      
      // Remove from local state
      const updatedLogs = savedLogs.filter((_, i) => i !== index);
      setSavedLogs(updatedLogs);
      
      // Update localStorage
      localStorage.setItem('savedDiveLogs', JSON.stringify(updatedLogs));
      
      // Call parent callback if provided
      if (onDeleteLog) {
        onDeleteLog(index, log);
      }
      
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Dive log deleted successfully.`
        }]);
      }
    } catch (error) {
      console.error('Failed to delete log:', error);
      if (setMessages) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Failed to delete dive log: ${error.message}`
        }]);
      }
    }
  };

  const handleEditLog = (index, log) => {
    if (onEditLog) {
      onEditLog(index, log);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (savedLogs.length === 0) {
    return (
      <div className={`mt-6 p-4 rounded-lg border ${
        darkMode 
          ? 'bg-gray-800 border-gray-600 text-white' 
          : 'bg-gray-50 border-gray-200 text-gray-900'
      }`}>
        <h3 className="text-lg font-medium mb-2">💾 Saved Dive Logs (0)</h3>
        <p className="text-sm opacity-75">No dive logs saved yet. Add your first dive log to get started!</p>
      </div>
    );
  }

  return (
    <div className={`mt-6 p-4 rounded-lg border ${
      darkMode 
        ? 'bg-gray-800 border-gray-600 text-white' 
        : 'bg-gray-50 border-gray-200 text-gray-900'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium">
          💾 Saved Dive Logs ({savedLogs.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`px-3 py-1 text-sm rounded ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {showLogs ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={loadSavedLogs}
            className={`px-3 py-1 text-sm rounded ${
              darkMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            Refresh
          </button>
          <button
            onClick={clearSavedLogs}
            className={`px-3 py-1 text-sm rounded ${
              darkMode
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            Clear All
          </button>
        </div>
      </div>

      {showLogs && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {savedLogs.map((log, index) => (
            <div
              key={log.id || log.diveLogId || index}
              className={`p-3 rounded border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">
                      {formatDate(log.date || log.diveDate)} - {log.discipline || 'Unknown'}
                    </div>
                    <div className="text-sm opacity-75">
                      📍 {log.location || 'Unknown location'}
                    </div>
                    <div className="text-sm opacity-75">
                      🎯 Target: {log.targetDepth}m | Reached: {log.reachedDepth}m
                    </div>
                    {log.notes && (
                      <div className="text-sm opacity-75 mt-1">
                        📝 {log.notes.slice(0, 100)}{log.notes.length > 100 ? '...' : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        log.syncedToWix || log._id
                          ? 'bg-green-500 text-white'
                          : 'bg-yellow-500 text-black'
                      }`}
                    >
                      {log.syncedToWix || log._id ? '✅ Synced' : '⏳ Local'}
                    </span>
                    <span className="text-xs opacity-50">
                      {formatDate(log.savedAt || log.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
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
                    size="sm"
                  />
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditLog(index, log)}
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
                      onClick={() => handleDeleteLog(index, log)}
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
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-sm opacity-75">
        💡 Tip: Dive logs are saved to DiveLogs collection and synced across devices
      </div>
    </div>
  );
}
